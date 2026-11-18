import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('ftps_release', Path(__file__).with_name('ftps-release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class PortableInventoryNames(unittest.TestCase):
    def test_normal_site_files_remain_supported(self):
        for name in ('index.html', '.htaccess', 'ação.txt', 'main-ab12.js', 'COM10.txt'):
            with self.subTest(name=name):
                self.assertEqual(release.safe_name(name), name)

    def test_reserved_names_and_path_traversal_are_rejected(self):
        for name in ('CON', 'nul', 'PRN.txt', 'AUX', 'COM1', 'LPT9.txt', '', '.', '..',
                     '../index.html', 'a\\b', 'C:root', 'a?b', 'file.', ' trailing '):
            with self.subTest(name=name), self.assertRaises(release.TransferError):
                release.safe_name(name)


if __name__ == '__main__':
    unittest.main()
