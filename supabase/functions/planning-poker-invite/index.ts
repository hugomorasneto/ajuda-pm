const PROJECT_ORIGINS = [
  "https://prodforge.techtupa.br",
  "https://prodforge.techtupa.com.br",
];
const SMTP_TIMEOUT_MS = 15000;
const SMTP_RESPONSE_BUFFER_SIZE = 4096;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InvitePayload = {
  email?: unknown;
  project_id?: unknown;
  session_id?: unknown;
  invite_url?: unknown;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type ProjectRecord = {
  id: string;
  name: string;
};

type SessionRecord = {
  id: string;
  project_id: string;
  name: string;
  invite_code: string;
  status: string;
  scoring_scale: string;
  vote_time_limit_seconds: number | null;
};

type ProfileRecord = {
  id: string;
  email: string;
};

type InviteContext = {
  recipient: ProfileRecord;
  project: ProjectRecord;
  session: SessionRecord;
  storyCount: number;
  inviteUrl: string;
  sender: AuthUser;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromHeader: string;
  fromAddress: string;
};

type SmtpResponse = {
  code: number;
  message: string;
};

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return PROJECT_ORIGINS.includes(origin) || isLocalhostOrigin(origin);
}

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? req.headers.get("origin");
  const allowOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : PROJECT_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function responseJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function normalizeSpaces(value: string): string {
  return value.replace(/[ \t\f\v]+/g, " ").trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/[<>]/g, "");
}

function asSingleLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeSpaces(
    stripHtml(value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ")),
  );
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function encodeMimeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  return `=?UTF-8?B?${encodeBase64(value)}?=`;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseEmailAddress(value: string): string {
  const normalized = sanitizeHeaderValue(value);
  const bracketMatch = normalized.match(/<([^<>\s]+@[^<>\s]+)>/);
  const address = bracketMatch?.[1] ?? normalized;
  return EMAIL_REGEX.test(address) ? address.toLowerCase() : "";
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "sim"].includes(value.trim().toLowerCase());
}

function getSmtpConfig(): SmtpConfig | { missingKeys: string[] } {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPortRaw = Deno.env.get("SMTP_PORT");
  const smtpUsername = Deno.env.get("SMTP_USERNAME");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const inviteFromEmail =
    Deno.env.get("RODA_INVITE_FROM_EMAIL") ?? Deno.env.get("CONTACT_FROM_EMAIL");
  const missingKeys = [
    { key: "SMTP_HOST", value: smtpHost },
    { key: "SMTP_PORT", value: smtpPortRaw },
    { key: "SMTP_USERNAME", value: smtpUsername },
    { key: "SMTP_PASSWORD", value: smtpPassword },
    { key: "CONTACT_FROM_EMAIL ou RODA_INVITE_FROM_EMAIL", value: inviteFromEmail },
  ]
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  if (missingKeys.length > 0) {
    return { missingKeys };
  }

  const smtpPort = Number(smtpPortRaw);
  const fromAddress = parseEmailAddress(inviteFromEmail ?? "");

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return { missingKeys: ["SMTP_PORT válida"] };
  }

  if (!fromAddress) {
    return { missingKeys: ["CONTACT_FROM_EMAIL válido"] };
  }

  return {
    host: smtpHost ?? "",
    port: smtpPort,
    secure: parseBooleanEnv(Deno.env.get("SMTP_SECURE"), smtpPort === 465),
    username: smtpUsername ?? "",
    password: smtpPassword ?? "",
    fromHeader: sanitizeHeaderValue(inviteFromEmail ?? ""),
    fromAddress,
  };
}

function buildMissingConfigMessage(missingKeys: string[]): string {
  return `Configuração de e-mail ausente: ${missingKeys.join(", ")}.`;
}

function getAuthorizationToken(req: Request): string {
  const authorization = req.headers.get("Authorization") ?? "";
  return authorization.replace(/^Bearer\s+/i, "").trim();
}

function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configuração Supabase ausente na função de convite.");
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function getAuthenticatedUser(req: Request): Promise<AuthUser> {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const userToken = getAuthorizationToken(req);

  if (!userToken) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.id) {
    throw new Error("Usuário não autenticado.");
  }

  return {
    id: payload.id,
    email: payload.email ?? null,
  };
}

async function assertCanManageProject(req: Request, projectId: string): Promise<void> {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const userToken = getAuthorizationToken(req);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/can_manage_project`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_project_id: projectId }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload !== true) {
    throw new Error("Apenas responsáveis e administradores do projeto podem enviar convites.");
  }
}

async function serviceRoleJson<T>(path: string): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Falha ao consultar contexto do convite.", {
      status: response.status,
      payload,
      path: truncate(path, 300),
    });
    throw new Error("Não foi possível validar o contexto da Roda.");
  }

  return payload as T;
}

function validateInviteUrl(inviteUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(inviteUrl);
  } catch {
    throw new Error("Link da Roda inválido.");
  }

  const origin = parsed.origin;
  const hasInviteCode = parsed.pathname === "/roda" && parsed.searchParams.has("codigo");
  const isDirectRoom = /^\/projetos\/[^/]+\/roda\/[^/]+$/.test(parsed.pathname);

  if (!isAllowedOrigin(origin) || (!hasInviteCode && !isDirectRoom)) {
    throw new Error("Link da Roda inválido.");
  }

  return parsed.toString();
}

async function buildInviteContext(
  req: Request,
  payload: InvitePayload,
): Promise<InviteContext> {
  const email = asSingleLine(payload.email).toLowerCase();
  const projectId = asSingleLine(payload.project_id);
  const sessionId = asSingleLine(payload.session_id);
  const inviteUrl = validateInviteUrl(asSingleLine(payload.invite_url));

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  if (!UUID_REGEX.test(projectId) || !UUID_REGEX.test(sessionId)) {
    throw new Error("Convite sem contexto válido.");
  }

  const sender = await getAuthenticatedUser(req);
  await assertCanManageProject(req, projectId);

  const sessions = await serviceRoleJson<SessionRecord[]>(
    `planning_poker_sessions?id=eq.${sessionId}&select=id,project_id,name,invite_code,status,scoring_scale,vote_time_limit_seconds`,
  );
  const session = sessions[0];

  if (!session || session.project_id !== projectId) {
    throw new Error("Roda não encontrada neste projeto.");
  }

  const projects = await serviceRoleJson<ProjectRecord[]>(
    `projects?id=eq.${projectId}&select=id,name`,
  );
  const project = projects[0];

  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  const profiles = await serviceRoleJson<ProfileRecord[]>(
    `profiles?email=eq.${encodeURIComponent(email)}&select=id,email`,
  );
  const recipient = profiles[0];

  if (!recipient) {
    throw new Error("Usuário não encontrado para esse e-mail.");
  }

  const memberships = await serviceRoleJson<Array<{ user_id: string }>>(
    `project_members?project_id=eq.${projectId}&user_id=eq.${recipient.id}&select=user_id`,
  );

  if (!memberships[0]) {
    throw new Error("Adicione o e-mail ao projeto antes de enviar o convite.");
  }

  const stories = await serviceRoleJson<Array<{ id: string }>>(
    `planning_poker_session_stories?session_id=eq.${sessionId}&select=id`,
  );

  return {
    recipient,
    project,
    session,
    storyCount: stories.length,
    inviteUrl,
    sender,
  };
}

function formatTimer(seconds: number | null): string {
  if (!seconds) return "sem timer";
  if (seconds < 60) return `${seconds} segundos`;

  const minutes = Math.round(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function getScaleLabel(scale: string): string {
  const labels: Record<string, string> = {
    fibonacci: "Fibonacci",
    tshirt: "T-shirt size",
    custom: "Personalizada",
  };

  return labels[scale] ?? scale;
}

function buildInviteEmailText(context: InviteContext): string {
  const storyLabel = context.storyCount === 1
    ? "1 história preparada"
    : `${context.storyCount} histórias preparadas`;

  return [
    "Você foi convidado para participar de uma Roda da Fogueira no ProdForge.",
    "",
    `Projeto: ${context.project.name}`,
    `Roda: ${context.session.name}`,
    `Histórias: ${storyLabel}`,
    `Escala: ${getScaleLabel(context.session.scoring_scale)}`,
    `Timer: ${formatTimer(context.session.vote_time_limit_seconds)}`,
    "",
    "Acesse a Roda pelo link abaixo:",
    context.inviteUrl,
    "",
    "Se você ainda não estiver autenticado, entre com a mesma conta deste e-mail. Depois da confirmação, o ProdForge deve retornar para a Roda.",
    "",
    "Os votos ficam ocultos até o facilitador revelar as runas.",
  ].join("\n");
}

function buildInviteEmailHtml(context: InviteContext): string {
  const storyLabel = context.storyCount === 1
    ? "1 história preparada"
    : `${context.storyCount} histórias preparadas`;
  const fields = [
    ["Projeto", context.project.name],
    ["Roda", context.session.name],
    ["Histórias", storyLabel],
    ["Escala", getScaleLabel(context.session.scoring_scale)],
    ["Timer", formatTimer(context.session.vote_time_limit_seconds)],
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Convite para a Roda da Fogueira</h1>
      <p style="margin: 0 0 18px;">Você foi convidado para estimar histórias no ProdForge.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 680px; margin-bottom: 20px;">
        <tbody>
          ${
    fields
      .map(
        ([label, value]) => `
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; width: 140px;">${
          escapeHtml(label)
        }</th>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${
          escapeHtml(value)
        }</td>
                </tr>
              `,
      )
      .join("")
  }
        </tbody>
      </table>
      <p style="margin: 0 0 20px;">
        <a href="${escapeHtml(context.inviteUrl)}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #f97316; color: #111827; font-weight: 700; text-decoration: none;">
          Entrar na Roda
        </a>
      </p>
      <p style="margin: 0 0 10px;">Se o botão não funcionar, copie este link:</p>
      <p style="word-break: break-all; color: #2563eb;">${escapeHtml(context.inviteUrl)}</p>
      <p style="margin-top: 18px; color: #4b5563;">
        Entre com a mesma conta deste e-mail. Os votos ficam ocultos até o facilitador revelar as runas.
      </p>
    </div>
  `;
}

async function withSmtpTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), SMTP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function readSmtpResponse(conn: Deno.Conn): Promise<SmtpResponse> {
  let response = "";

  while (response.length < 20000) {
    const buffer = new Uint8Array(SMTP_RESPONSE_BUFFER_SIZE);
    const count = await withSmtpTimeout(
      conn.read(buffer),
      "Tempo limite ao aguardar resposta SMTP.",
    );

    if (count === null) {
      throw new Error("Conexão SMTP encerrada antes da resposta.");
    }

    response += new TextDecoder().decode(buffer.subarray(0, count));
    const lines = response.split(/\r?\n/).filter(Boolean);
    const lastLine = lines[lines.length - 1] ?? "";

    if (/^\d{3} /.test(lastLine)) {
      return {
        code: Number(lastLine.slice(0, 3)),
        message: response.trim(),
      };
    }
  }

  throw new Error("Resposta SMTP maior que o esperado.");
}

async function writeSmtpRaw(conn: Deno.Conn, value: string): Promise<void> {
  await withSmtpTimeout(
    conn.write(new TextEncoder().encode(value)),
    "Tempo limite ao escrever no SMTP.",
  );
}

async function writeSmtpLine(conn: Deno.Conn, value: string): Promise<void> {
  await writeSmtpRaw(conn, `${value}\r\n`);
}

function assertSmtpResponse(
  response: SmtpResponse,
  expectedCodes: number[],
  action: string,
): void {
  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `${action} falhou (${response.code}): ${truncate(response.message, 500)}`,
    );
  }
}

async function sendSmtpCommand(
  conn: Deno.Conn,
  command: string,
  expectedCodes: number[],
  action: string,
): Promise<SmtpResponse> {
  await writeSmtpLine(conn, command);
  const response = await readSmtpResponse(conn);
  assertSmtpResponse(response, expectedCodes, action);
  return response;
}

async function authenticateSmtp(conn: Deno.Conn, config: SmtpConfig): Promise<void> {
  await writeSmtpLine(
    conn,
    `AUTH PLAIN ${encodeBase64(`\u0000${config.username}\u0000${config.password}`)}`,
  );
  const plainResponse = await readSmtpResponse(conn);

  if (plainResponse.code === 235) return;

  if (![500, 502, 504].includes(plainResponse.code)) {
    assertSmtpResponse(plainResponse, [235], "Autenticação SMTP");
  }

  await sendSmtpCommand(conn, "AUTH LOGIN", [334], "Autenticação SMTP");
  await sendSmtpCommand(
    conn,
    encodeBase64(config.username),
    [334],
    "Usuário SMTP",
  );
  await sendSmtpCommand(
    conn,
    encodeBase64(config.password),
    [235],
    "Senha SMTP",
  );
}

function escapeSmtpData(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildSmtpMessage(context: InviteContext, config: SmtpConfig): string {
  const boundary = `prodforge-roda-${context.session.id}`;
  const subject = `Convite para a Roda da Fogueira: ${context.session.name}`;
  const recipient = context.recipient.email;

  return [
    `From: ${config.fromHeader}`,
    `To: ${recipient}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <roda-${context.session.id}-${Date.now()}@prodforge.techtupa.br>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    buildInviteEmailText(context),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    buildInviteEmailHtml(context).trim(),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function sendInviteEmail(context: InviteContext): Promise<void> {
  const smtpConfig = getSmtpConfig();

  if ("missingKeys" in smtpConfig) {
    throw new Error(buildMissingConfigMessage(smtpConfig.missingKeys));
  }

  if (!smtpConfig.secure) {
    throw new Error("SMTP sem TLS não suportado nesta função. Use SMTP_SECURE=true e porta 465.");
  }

  let conn: Deno.Conn | null = null;

  try {
    conn = await withSmtpTimeout(
      Deno.connectTls({
        hostname: smtpConfig.host,
        port: smtpConfig.port,
      }),
      "Tempo limite ao conectar no servidor SMTP.",
    );

    const greeting = await readSmtpResponse(conn);
    assertSmtpResponse(greeting, [220], "Conexão SMTP");

    await sendSmtpCommand(conn, "EHLO prodforge.techtupa.br", [250], "EHLO SMTP");
    await authenticateSmtp(conn, smtpConfig);
    await sendSmtpCommand(
      conn,
      `MAIL FROM:<${smtpConfig.fromAddress}>`,
      [250],
      "Remetente SMTP",
    );
    await sendSmtpCommand(
      conn,
      `RCPT TO:<${context.recipient.email}>`,
      [250, 251],
      "Destinatário SMTP",
    );
    await sendSmtpCommand(conn, "DATA", [354], "Início do corpo SMTP");
    await writeSmtpRaw(conn, `${escapeSmtpData(buildSmtpMessage(context, smtpConfig))}\r\n.\r\n`);
    const dataResponse = await readSmtpResponse(conn);
    assertSmtpResponse(dataResponse, [250], "Envio SMTP");
    await writeSmtpLine(conn, "QUIT").catch(() => undefined);
  } finally {
    try {
      conn?.close();
    } catch {
      // Conexão SMTP já encerrada.
    }
  }
}

export async function handlePlanningPokerInviteRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    if (!isAllowedOrigin(req.headers.get("Origin") ?? req.headers.get("origin"))) {
      return responseJson(req, {
        success: false,
        error: "Origem não permitida.",
      }, 403);
    }

    if (req.method !== "POST") {
      return responseJson(req, {
        success: false,
        error: "Método não permitido.",
      }, 405);
    }

    const payload = (await req.json().catch(() => ({}))) as InvitePayload;
    const context = await buildInviteContext(req, payload);
    await sendInviteEmail(context);

    return responseJson(req, {
      success: true,
      message: "Convite enviado por e-mail.",
      email: context.recipient.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Erro na função planning-poker-invite.", {
      message: truncate(message, 1000),
    });

    return responseJson(req, {
      success: false,
      error: message || "Não foi possível enviar o convite por e-mail agora.",
    }, 400);
  }
}

if (import.meta.main) {
  Deno.serve(handlePlanningPokerInviteRequest);
}
