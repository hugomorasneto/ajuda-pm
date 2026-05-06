import { handleContactMessageRequest } from "./index.ts";

const ORIGINAL_FETCH = globalThis.fetch;
const ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "CONTACT_TO_EMAIL",
  "CONTACT_FROM_EMAIL",
];

type FetchCall = {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
};

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(
      `Esperado ${String(expected)}, recebido ${String(actual)}.`,
    );
  }
}

function assertMatch(actual: unknown, expected: RegExp) {
  if (typeof actual !== "string" || !expected.test(actual)) {
    throw new Error(`Valor "${String(actual)}" não corresponde a ${expected}.`);
  }
}

function resetEnv() {
  for (const key of ENV_KEYS) {
    Deno.env.delete(key);
  }
}

function setSupabaseEnv() {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");
}

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria Silva",
    email: "maria@example.com",
    subject: "Dúvida sobre acesso",
    category: "suporte",
    message: "Preciso de ajuda para acessar a Bancada.",
    page_url: "https://prodforge.techtupa.com.br/contato",
    ...overrides,
  };
}

function buildRequest(payload: Record<string, unknown>, method = "POST") {
  return new Request("https://example.functions.local/contact-message", {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "https://prodforge.techtupa.com.br",
    },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  });
}

function buildInsertedRecord(
  payload: Record<string, unknown> = buildValidPayload(),
) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-05-06T12:00:00.000Z",
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    subject: String(payload.subject ?? ""),
    category: String(payload.category ?? ""),
    message: String(payload.message ?? ""),
    page_url: String(payload.page_url ?? ""),
  };
}

function mockSupabaseFetch(options: { resendOk?: boolean } = {}) {
  const calls: FetchCall[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const requestInit = init as
      | { method?: string; body?: BodyInit | null }
      | undefined;
    const method = requestInit?.method ?? "GET";
    const body = requestInit?.body
      ? JSON.parse(String(requestInit.body)) as Record<string, unknown>
      : null;
    calls.push({ url, method, body });

    if (url.includes("/rest/v1/contact_messages") && method === "POST") {
      const insertedRecord = buildInsertedRecord(body ?? {});
      return Response.json([insertedRecord], { status: 201 });
    }

    if (url.includes("/rest/v1/contact_messages") && method === "PATCH") {
      return new Response(null, { status: 204 });
    }

    if (url === "https://api.resend.com/emails") {
      return Response.json(
        options.resendOk === false ? { error: "falha" } : { id: "email-1" },
        { status: options.resendOk === false ? 500 : 200 },
      );
    }

    return Response.json({ error: "URL inesperada" }, { status: 500 });
  };

  return calls;
}

Deno.test({
  name: "OPTIONS responde com CORS",
  fn: async () => {
    resetEnv();
    const response = await handleContactMessageRequest(
      new Request("https://example.functions.local/contact-message", {
        method: "OPTIONS",
        headers: { Origin: "https://prodforge.techtupa.com.br" },
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("Access-Control-Allow-Origin"),
      "https://prodforge.techtupa.com.br",
    );
  },
});

Deno.test({
  name: "POST sem nome retorna erro amigável",
  fn: async () => {
    resetEnv();
    const response = await handleContactMessageRequest(
      buildRequest(buildValidPayload({ name: "" })),
    );
    const payload = await response.json();

    assertEquals(response.status, 400);
    assertEquals(payload.field_errors.name, "Informe seu nome.");
  },
});

Deno.test({
  name: "POST com e-mail inválido retorna erro amigável",
  fn: async () => {
    resetEnv();
    const response = await handleContactMessageRequest(
      buildRequest(buildValidPayload({ email: "email-invalido" })),
    );
    const payload = await response.json();

    assertEquals(response.status, 400);
    assertEquals(payload.field_errors.email, "Informe um e-mail válido.");
  },
});

Deno.test({
  name: "POST com mensagem grande demais retorna erro amigável",
  fn: async () => {
    resetEnv();
    const response = await handleContactMessageRequest(
      buildRequest(buildValidPayload({ message: "a".repeat(4001) })),
    );
    const payload = await response.json();

    assertEquals(response.status, 400);
    assertEquals(payload.field_errors.message, "Use até 4000 caracteres.");
  },
});

Deno.test({
  name: "honeypot preenchido não grava nem envia e-mail",
  fn: async () => {
    resetEnv();
    const calls = mockSupabaseFetch();
    try {
      const response = await handleContactMessageRequest(
        buildRequest(buildValidPayload({ company_site: "https://spam.test" })),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, false);
      assertEquals(calls.length, 0);
    } finally {
      globalThis.fetch = ORIGINAL_FETCH;
    }
  },
});

Deno.test({
  name: "sem RESEND_API_KEY registra mensagem e marca email_sent false",
  fn: async () => {
    resetEnv();
    setSupabaseEnv();
    const calls = mockSupabaseFetch();
    try {
      const response = await handleContactMessageRequest(
        buildRequest(buildValidPayload()),
      );
      const payload = await response.json();
      const patchCall = calls.find((call) => call.method === "PATCH");
      const patchBody = patchCall?.body ?? {};

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(calls.some((call) => call.method === "POST"), true);
      assertEquals(patchBody.email_sent, false);
      assertMatch(patchBody.email_error, /RESEND_API_KEY/);
    } finally {
      globalThis.fetch = ORIGINAL_FETCH;
    }
  },
});

Deno.test({
  name: "com env vars configuradas envia e-mail e marca email_sent true",
  fn: async () => {
    resetEnv();
    setSupabaseEnv();
    Deno.env.set("RESEND_API_KEY", "resend-test-key");
    Deno.env.set("CONTACT_TO_EMAIL", "interno@example.com");
    Deno.env.set("CONTACT_FROM_EMAIL", "ProdForge <contato@example.com>");
    const calls = mockSupabaseFetch();
    try {
      const response = await handleContactMessageRequest(
        buildRequest(buildValidPayload({ subject: "Assunto interno" })),
      );
      const payload = await response.json();
      const resendCall = calls.find((call) =>
        call.url === "https://api.resend.com/emails"
      );
      const patchCall = calls.find((call) => call.method === "PATCH");
      const resendBody = resendCall?.body ?? {};
      const patchBody = patchCall?.body ?? {};

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(
        resendBody.subject,
        "[ProdForge] Nova mensagem de contato: Assunto interno",
      );
      assertEquals(patchBody.email_sent, true);
      assertEquals(patchBody.email_error, null);
    } finally {
      globalThis.fetch = ORIGINAL_FETCH;
    }
  },
});
