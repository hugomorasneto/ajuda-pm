"""Copia, publica e restaura arquivos estáticos do ProdForge por FTPS explícito."""

import argparse
import ftplib
import hashlib
import json
import os
from pathlib import Path, PurePosixPath, PureWindowsPath
import re
import ssl
import stat
import sys
from tempfile import TemporaryDirectory


PENDING = ".prodforge-ftps-"
SHA256 = re.compile(r"[0-9a-f]{64}")


class TransferError(Exception):
    pass


def safe_name(name):
    if (not name or name in (".", "..") or name != name.strip() or name.endswith(".")
            or re.search(r'[\\/<>:"|?*\x00-\x1f\x7f]', name)
            or PureWindowsPath(name).is_reserved()):
        raise TransferError("O inventário contém um nome incompatível com uma cópia segura.")
    return name


def pending_path(name):
    path = PurePosixPath(name)
    digest = hashlib.sha256(name.encode()).hexdigest()
    return str(path.with_name(PENDING + digest))


def is_link(path):
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT
    )


def local_inventory(root):
    if not root.is_dir() or is_link(root):
        raise TransferError("O diretório local é inválido.")
    files, directories = {}, set()
    for path in root.rglob("*"):
        name = "/".join(safe_name(part) for part in path.relative_to(root).parts)
        if is_link(path):
            raise TransferError("O diretório local contém um link ou uma junção.")
        if path.is_dir():
            directories.add(name)
        elif path.is_file():
            with path.open("rb") as source:
                files[name] = hashlib.file_digest(source, "sha256").hexdigest()
        else:
            raise TransferError("O diretório local contém um tipo de arquivo inesperado.")
    return inventory(files, directories)


def inventory(files, directories):
    paths = [*files, *directories]
    if len(set(path.casefold() for path in paths)) != len(paths):
        raise TransferError("O inventário contém caminhos ambíguos para a restauração.")
    return {"files": files, "directories": sorted(directories)}


def encoded(inventory_data):
    return (json.dumps(inventory_data, sort_keys=True, separators=(",", ":")) + "\n").encode()


def fingerprint(inventory_data):
    return hashlib.sha256(encoded(inventory_data)).hexdigest()


def retrieve(ftp, name, destination=None):
    digest = hashlib.sha256()
    if destination is None:
        ftp.retrbinary("RETR " + name, digest.update)
    else:
        with destination.open("xb") as stream:
            def write(chunk):
                stream.write(chunk)
                digest.update(chunk)

            ftp.retrbinary("RETR " + name, write)
    return digest.hexdigest()


def remote_inventory(ftp, destination=None):
    files, directories = {}, set()
    stack = [""]
    while stack:
        parent = stack.pop()
        for entry, facts in ftp.mlsd(parent):
            kind = facts.get("type")
            if kind in ("cdir", "pdir"):
                continue
            name = parent + "/" + safe_name(entry) if parent else safe_name(entry)
            if kind == "dir":
                if name in directories:
                    raise TransferError("O servidor repetiu um diretório.")
                directories.add(name)
                stack.append(name)
            elif kind == "file":
                if name in files:
                    raise TransferError("O servidor repetiu um arquivo.")
                files[name] = None
            else:
                raise TransferError("O servidor retornou um link ou um tipo inesperado.")
    result = inventory(files, directories)
    if "index.html" not in files:
        raise TransferError("A raiz FTPS não contém o index.html esperado.")
    if destination is not None:
        for directory in result["directories"]:
            (destination / directory).mkdir(parents=True, exist_ok=True)
    for name in sorted(files):
        files[name] = retrieve(ftp, name, None if destination is None else destination / name)
    return result


def open_ftps():
    host, user, password, root = (os.environ.get(key, "") for key in
                                  ("FTP_HOST", "FTP_USER", "FTP_PASSWORD", "FTP_REMOTE_DIR"))
    if not all((host, user, password, root)) or any(c in root for c in "\r\n\0"):
        raise TransferError("Configure FTP_HOST, FTP_USER, FTP_PASSWORD e FTP_REMOTE_DIR.")
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    ftp = ftplib.FTP_TLS(context=context, timeout=30, encoding="utf-8")
    try:
        ftp.connect(host, int(os.environ.get("FTP_PORT") or "21"))
        ftp.auth()
        ftp.login(user, password, secure=False)
        ftp.prot_p()
        ftp.cwd(root)
        return ftp
    except BaseException:
        ftp.close()
        raise


def snapshot(ftp, destination):
    destination.mkdir(mode=0o700)
    files = destination / "files"
    files.mkdir(mode=0o700)
    initial = remote_inventory(ftp, files)
    if initial != remote_inventory(ftp) or initial != local_inventory(files):
        raise TransferError("A cópia divergiu da segunda leitura do servidor ou dos arquivos locais.")
    (destination / "manifest.json").write_bytes(encoded(initial))
    return initial


def load_backup(directory):
    result = local_inventory(directory / "files")
    if (directory / "manifest.json").read_bytes() != encoded(result):
        raise TransferError("A cópia local diverge do manifesto.")
    return result


def validate_candidate(candidate, original):
    if "index.html" not in candidate["files"]:
        raise TransferError("O build não contém index.html.")
    for name in candidate["files"]:
        if any(part.startswith(PENDING) for part in name.split("/")):
            raise TransferError("O build usa um nome reservado para transferências.")
    inventory({**original["files"], **candidate["files"]},
              set(original["directories"]) | set(candidate["directories"]))
    for name, digest in candidate["files"].items():
        if name.startswith("assets/") and original["files"].get(name, digest) != digest:
            raise TransferError("Um ativo antigo tem o mesmo nome e conteúdo diferente no build.")


def changes(original, candidate):
    return [name for name, digest in candidate["files"].items()
            if original["files"].get(name) != digest]


def phase(name):
    if name.startswith("assets/"):
        return 0
    return 2 if name.lower().endswith(".html") else 1


def replace_file(ftp, source, name, digest, directories):
    parent = PurePosixPath(name).parent
    for directory in reversed((parent, *parent.parents)):
        entry = str(directory)
        if entry != "." and entry not in directories:
            ftp.mkd(entry)
            directories.add(entry)
    pending = pending_path(name)
    with (source / name).open("rb") as stream:
        ftp.storbinary("STOR " + pending, stream)
    if retrieve(ftp, pending) != digest:
        raise TransferError("O hash do arquivo temporário no servidor divergiu.")
    ftp.rename(pending, name)
    if retrieve(ftp, name) != digest:
        raise TransferError("O hash do arquivo publicado no servidor divergiu.")


def restore(ftp, source, original, candidate):
    current = remote_inventory(ftp)
    directories = set(current["directories"])
    affected = changes(original, candidate)
    for name, digest in original["files"].items():
        if name.startswith("assets/") and current["files"].get(name) != digest:
            raise TransferError("O destino perdeu um ativo da referência. Verifique a cópia antes de restaurar.")
    for name in affected:
        old_digest = original["files"].get(name)
        new_digest = candidate["files"][name]
        if current["files"].get(name) not in (old_digest, new_digest):
            raise TransferError("A restauração encontrou um caminho alterado fora desta publicação.")
    for name in affected:
        pending = pending_path(name)
        if pending in current["files"]:
            ftp.delete(pending)
            del current["files"][pending]
    for name in sorted(affected, key=lambda name: (phase(name), name)):
        old_digest = original["files"].get(name)
        if old_digest is not None and current["files"].get(name) != old_digest:
            replace_file(ftp, source, name, old_digest, directories)
            current["files"][name] = old_digest
        elif old_digest is None and not name.startswith("assets/") and name in current["files"]:
            ftp.delete(name)
            del current["files"][name]
    added_directories = set(candidate["directories"]) - set(original["directories"])
    for name in sorted(added_directories & directories, key=lambda path: (-path.count("/"), path)):
        prefix = name + "/"
        if not any(path.startswith(prefix) for path in (*current["files"], *directories)):
            ftp.rmd(name)
            directories.remove(name)
    if remote_inventory(ftp) != inventory(current["files"], directories):
        raise TransferError("O inventário após a restauração divergiu do resultado esperado.")


def publish(ftp, source, candidate, expected):
    if not SHA256.fullmatch(expected):
        raise TransferError("Informe o SHA-256 do manifesto da cópia verificada.")
    with TemporaryDirectory(prefix="prodforge-ftps-") as temporary:
        preimages = Path(temporary) / "files"
        preimages.mkdir(mode=0o700)
        original = remote_inventory(ftp, preimages)
        if fingerprint(original) != expected or local_inventory(preimages) != original:
            raise TransferError("O destino diverge da cópia aprovada. Nenhum arquivo foi enviado.")
        validate_candidate(candidate, original)
        if any(PurePosixPath(p).name.startswith(PENDING) for p in original["files"]):
            raise TransferError("O destino contém temporários de uma transferência anterior.")
        directories = set(original["directories"])
        affected = changes(original, candidate)
        try:
            for name in sorted(affected, key=lambda name: (phase(name), name)):
                replace_file(ftp, source, name, candidate["files"][name], directories)
            expected_files = {**original["files"], **candidate["files"]}
            if remote_inventory(ftp) != inventory(expected_files, directories):
                raise TransferError("O inventário após a publicação divergiu do resultado esperado.")
        except (OSError, ftplib.Error, TransferError):
            ftp.close()
            try:
                with open_ftps() as recovery:
                    restore(recovery, preimages, original, candidate)
            except (OSError, ftplib.Error, TransferError):
                raise TransferError(
                    "Publicação interrompida. Restauração automática incompleta. "
                    "Use a cópia verificada e o mesmo build para restaurar."
                ) from None
            raise TransferError(
                "Publicação interrompida. Referência restaurada e ativos novos retidos."
            ) from None
    return len(affected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    copy = commands.add_parser("snapshot")
    copy.add_argument("destination", type=Path)
    release = commands.add_parser("publish")
    release.add_argument("dist", type=Path)
    release.add_argument("manifest_sha256")
    recovery = commands.add_parser("restore")
    recovery.add_argument("backup", type=Path)
    recovery.add_argument("dist", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.command == "snapshot":
            with open_ftps() as ftp:
                result = snapshot(ftp, args.destination)
            print(f"Cópia verificada. Arquivos: {len(result['files'])}. SHA-256: {fingerprint(result)}")
        elif args.command == "publish":
            candidate = local_inventory(args.dist)
            with open_ftps() as ftp:
                count = publish(ftp, args.dist, candidate, args.manifest_sha256)
            print(f"Publicação verificada. Arquivos alterados: {count}.")
        else:
            original, candidate = load_backup(args.backup), local_inventory(args.dist)
            validate_candidate(candidate, original)
            with open_ftps() as ftp:
                restore(ftp, args.backup / "files", original, candidate)
            print("Restauração verificada. Ativos das duas versões preservados.")
    except TransferError as error:
        print(error, file=sys.stderr)
        return 1
    except (OSError, ftplib.Error, ValueError):
        print("A operação FTPS ou a verificação local falhou.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
