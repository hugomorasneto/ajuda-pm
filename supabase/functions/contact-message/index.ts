const PROJECT_ORIGIN = "https://prodforge.techtupa.com.br";
const SMTP_TIMEOUT_MS = 15000;
const SMTP_RESPONSE_BUFFER_SIZE = 4096;
const ALLOWED_CATEGORIES = [
  "suporte",
  "privacidade",
  "feedback",
  "parceria",
  "outro",
] as const;
const FIELD_LIMITS = {
  name: 120,
  email: 180,
  subject: 160,
  message: 4000,
  page_url: 500,
  user_agent: 500,
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactCategory = (typeof ALLOWED_CATEGORIES)[number];

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  category?: unknown;
  message?: unknown;
  page_url?: unknown;
  website?: unknown;
  company_site?: unknown;
};

type ValidContactMessage = {
  name: string;
  email: string;
  subject: string;
  category: ContactCategory;
  message: string;
  page_url: string | null;
};

type ContactMessageRecord = ValidContactMessage & {
  id: string;
  created_at: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromHeader: string;
  fromAddress: string;
  toHeader: string;
  recipients: string[];
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
  return origin === PROJECT_ORIGIN || isLocalhostOrigin(origin);
}

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? req.headers.get("origin");
  const allowOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : PROJECT_ORIGIN;

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

function asMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripHtml(value.normalize("NFKC"))
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\f\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validatePayload(payload: ContactPayload): {
  values: ValidContactMessage | null;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  const name = asSingleLine(payload.name);
  const email = asSingleLine(payload.email).toLowerCase();
  const subject = asSingleLine(payload.subject);
  const category = asSingleLine(payload.category);
  const message = asMultiline(payload.message);
  const pageUrl = asSingleLine(payload.page_url).slice(
    0,
    FIELD_LIMITS.page_url,
  );

  if (!name) {
    fieldErrors.name = "Informe seu nome.";
  } else if (name.length > FIELD_LIMITS.name) {
    fieldErrors.name = "Use até 120 caracteres.";
  }

  if (!email) {
    fieldErrors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Informe um e-mail válido.";
  } else if (email.length > FIELD_LIMITS.email) {
    fieldErrors.email = "Use até 180 caracteres.";
  }

  if (!ALLOWED_CATEGORIES.includes(category as ContactCategory)) {
    fieldErrors.category = "Escolha uma categoria válida.";
  }

  if (!subject) {
    fieldErrors.subject = "Informe o assunto.";
  } else if (subject.length > FIELD_LIMITS.subject) {
    fieldErrors.subject = "Use até 160 caracteres.";
  }

  if (!message) {
    fieldErrors.message = "Escreva sua mensagem.";
  } else if (message.length > FIELD_LIMITS.message) {
    fieldErrors.message = "Use até 4000 caracteres.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { values: null, fieldErrors };
  }

  return {
    values: {
      name,
      email,
      subject,
      category: category as ContactCategory,
      message,
      page_url: pageUrl || null,
    },
    fieldErrors,
  };
}

function buildMissingConfigMessage(missingKeys: string[]): string {
  return `Configuração de e-mail ausente: ${missingKeys.join(", ")}.`;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["1", "true", "yes", "sim"].includes(value.trim().toLowerCase());
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

function parseRecipientAddresses(value: string): string[] {
  const recipients = value
    .split(/[;,]/)
    .map((item) => parseEmailAddress(item))
    .filter(Boolean);

  return Array.from(new Set(recipients));
}

function getSmtpConfig(): SmtpConfig | { missingKeys: string[] } {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPortRaw = Deno.env.get("SMTP_PORT");
  const smtpUsername = Deno.env.get("SMTP_USERNAME");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const contactFromEmail = Deno.env.get("CONTACT_FROM_EMAIL");
  const contactToEmail = Deno.env.get("CONTACT_TO_EMAIL");
  const missingKeys = [
    { key: "SMTP_HOST", value: smtpHost },
    { key: "SMTP_PORT", value: smtpPortRaw },
    { key: "SMTP_USERNAME", value: smtpUsername },
    { key: "SMTP_PASSWORD", value: smtpPassword },
    { key: "CONTACT_FROM_EMAIL", value: contactFromEmail },
    { key: "CONTACT_TO_EMAIL", value: contactToEmail },
  ]
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  if (missingKeys.length > 0) {
    return { missingKeys };
  }

  const smtpPort = Number(smtpPortRaw);
  const fromAddress = parseEmailAddress(contactFromEmail ?? "");
  const recipients = parseRecipientAddresses(contactToEmail ?? "");

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return { missingKeys: ["SMTP_PORT válida"] };
  }

  if (!fromAddress) {
    return { missingKeys: ["CONTACT_FROM_EMAIL válido"] };
  }

  if (recipients.length === 0) {
    return { missingKeys: ["CONTACT_TO_EMAIL válido"] };
  }

  return {
    host: smtpHost ?? "",
    port: smtpPort,
    secure: parseBooleanEnv(Deno.env.get("SMTP_SECURE"), smtpPort === 465),
    username: smtpUsername ?? "",
    password: smtpPassword ?? "",
    fromHeader: sanitizeHeaderValue(contactFromEmail ?? ""),
    fromAddress,
    toHeader: sanitizeHeaderValue(contactToEmail ?? ""),
    recipients,
  };
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getCategoryLabel(category: ContactCategory): string {
  const labels: Record<ContactCategory, string> = {
    suporte: "Suporte e dúvidas gerais",
    privacidade: "Privacidade e dados",
    feedback: "Feedback sobre o produto",
    parceria: "Parcerias ou conversas profissionais",
    outro: "Outro",
  };

  return labels[category];
}

function buildEmailText(record: ContactMessageRecord): string {
  return [
    "Nova mensagem de contato recebida no ProdForge.",
    "",
    `Nome: ${record.name}`,
    `E-mail: ${record.email}`,
    `Categoria: ${getCategoryLabel(record.category)}`,
    `Assunto: ${record.subject}`,
    `URL de origem: ${record.page_url ?? "Não informada"}`,
    `Data/hora: ${formatDateTime(record.created_at)}`,
    `ID do registro no Supabase: ${record.id}`,
    "",
    "Mensagem:",
    record.message,
  ].join("\n");
}

function buildEmailHtml(record: ContactMessageRecord): string {
  const messageHtml = escapeHtml(record.message).replace(/\n/g, "<br>");
  const fields = [
    ["Nome", record.name],
    ["E-mail", record.email],
    ["Categoria", getCategoryLabel(record.category)],
    ["Assunto", record.subject],
    ["URL de origem", record.page_url ?? "Não informada"],
    ["Data/hora", formatDateTime(record.created_at)],
    ["ID do registro no Supabase", record.id],
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.5;">
      <h1 style="font-size: 20px;">Nova mensagem de contato no ProdForge</h1>
      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        <tbody>
          ${
    fields
      .map(
        ([label, value]) => `
                <tr>
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; width: 180px;">${
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
      <h2 style="font-size: 16px; margin-top: 24px;">Mensagem</h2>
      <p style="white-space: normal;">${messageHtml}</p>
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

function buildSmtpMessage(record: ContactMessageRecord, config: SmtpConfig): string {
  const boundary = `prodforge-contact-${record.id}`;
  const subject = `[ProdForge] Nova mensagem de contato: ${record.subject}`;

  return [
    `From: ${config.fromHeader}`,
    `To: ${config.toHeader}`,
    `Reply-To: ${record.email}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    `Date: ${new Date(record.created_at).toUTCString()}`,
    `Message-ID: <${record.id}@prodforge.techtupa.com.br>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    buildEmailText(record),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    buildEmailHtml(record).trim(),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function insertContactMessage(
  values: ValidContactMessage,
  req: Request,
): Promise<ContactMessageRecord> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("missing_supabase_service_config");
  }

  const userAgent = asSingleLine(req.headers.get("user-agent")).slice(
    0,
    FIELD_LIMITS.user_agent,
  ) || null;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/contact_messages?select=id,name,email,subject,category,message,page_url,created_at`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        ...values,
        source: "contact_page",
        status: "new",
        user_agent: userAgent,
        email_sent: false,
        metadata: {
          received_from: "supabase_edge_function",
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || !Array.isArray(payload) || !payload[0]?.id) {
    console.error("Falha ao registrar mensagem de contato.", {
      status: response.status,
      payload,
    });
    throw new Error("contact_message_insert_failed");
  }

  return payload[0] as ContactMessageRecord;
}

async function updateEmailStatus(
  recordId: string,
  emailSent: boolean,
  emailError: string | null,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Configuração Supabase ausente ao atualizar status de e-mail.",
    );
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/contact_messages?id=eq.${recordId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_sent: emailSent,
          email_error: emailError,
        }),
      },
    );

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      console.error("Falha ao atualizar status de e-mail do contato.", {
        status: response.status,
        payload: truncate(payload, 500),
      });
    }
  } catch (error) {
    console.error("Falha de rede ao atualizar status de e-mail do contato.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function sendNotificationEmail(
  record: ContactMessageRecord,
): Promise<string | null> {
  const smtpConfig = getSmtpConfig();

  if ("missingKeys" in smtpConfig) {
    return buildMissingConfigMessage(smtpConfig.missingKeys);
  }

  if (!smtpConfig.secure) {
    return "SMTP sem TLS não suportado nesta função. Use SMTP_SECURE=true e porta 465.";
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

    await sendSmtpCommand(conn, "EHLO prodforge.techtupa.com.br", [250], "EHLO SMTP");
    await authenticateSmtp(conn, smtpConfig);
    await sendSmtpCommand(
      conn,
      `MAIL FROM:<${smtpConfig.fromAddress}>`,
      [250],
      "Remetente SMTP",
    );

    for (const recipient of smtpConfig.recipients) {
      await sendSmtpCommand(
        conn,
        `RCPT TO:<${recipient}>`,
        [250, 251],
        "Destinatário SMTP",
      );
    }

    await sendSmtpCommand(conn, "DATA", [354], "Início do corpo SMTP");
    await writeSmtpRaw(conn, `${escapeSmtpData(buildSmtpMessage(record, smtpConfig))}\r\n.\r\n`);
    const dataResponse = await readSmtpResponse(conn);
    assertSmtpResponse(dataResponse, [250], "Envio SMTP");
    await writeSmtpLine(conn, "QUIT").catch(() => undefined);

    return null;
  } catch (error) {
    return truncate(
      `Falha no envio via SMTP: ${
        error instanceof Error ? error.message : String(error)
      }`,
      1000,
    );
  } finally {
    try {
      conn?.close();
    } catch {
      // Conexão SMTP já encerrada.
    }
  }
}

export async function handleContactMessageRequest(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    if (
      !isAllowedOrigin(req.headers.get("Origin") ?? req.headers.get("origin"))
    ) {
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

    const payload = (await req.json().catch(() => ({}))) as ContactPayload;
    const honeypot = `${asSingleLine(payload.website)}${
      asSingleLine(payload.company_site)
    }`;

    if (honeypot) {
      return responseJson(req, {
        success: false,
        error: "Não foi possível enviar agora. Tente novamente em instantes.",
      });
    }

    const { values, fieldErrors } = validatePayload(payload);
    if (!values) {
      return responseJson(
        req,
        {
          success: false,
          error: "Revise os campos destacados antes de enviar.",
          field_errors: fieldErrors,
        },
        400,
      );
    }

    const record = await insertContactMessage(values, req);
    const emailError = await sendNotificationEmail(record);
    await updateEmailStatus(record.id, !emailError, emailError);

    return responseJson(req, {
      success: true,
      message: "Mensagem recebida.",
      id: record.id,
    });
  } catch (error) {
    console.error("Erro inesperado na função contact-message.", {
      message: error instanceof Error ? error.message : String(error),
    });

    return responseJson(req, {
      success: false,
      error: "Não foi possível enviar agora. Tente novamente em instantes.",
    }, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handleContactMessageRequest);
}
