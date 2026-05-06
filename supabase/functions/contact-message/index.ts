const PROJECT_ORIGIN = "https://prodforge.techtupa.com.br";
const RESEND_API_URL = "https://api.resend.com/emails";
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
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const contactToEmail = Deno.env.get("CONTACT_TO_EMAIL");
  const contactFromEmail = Deno.env.get("CONTACT_FROM_EMAIL");
  const missingKeys = [
    { key: "RESEND_API_KEY", value: resendApiKey },
    { key: "CONTACT_TO_EMAIL", value: contactToEmail },
    { key: "CONTACT_FROM_EMAIL", value: contactFromEmail },
  ]
    .filter(({ value }) => !value)
    .map(({ key }) => key);

  if (missingKeys.length > 0) {
    return buildMissingConfigMessage(missingKeys);
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: contactFromEmail,
        to: [contactToEmail],
        reply_to: record.email,
        subject: `[ProdForge] Nova mensagem de contato: ${record.subject}`,
        text: buildEmailText(record),
        html: buildEmailHtml(record),
      }),
    });

    if (response.ok) {
      return null;
    }

    const payload = await response.text().catch(() => "");
    return truncate(
      `Falha no envio via Resend (${response.status}): ${payload}`,
      1000,
    );
  } catch (error) {
    return truncate(
      `Falha de rede no envio via Resend: ${
        error instanceof Error ? error.message : String(error)
      }`,
      1000,
    );
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
