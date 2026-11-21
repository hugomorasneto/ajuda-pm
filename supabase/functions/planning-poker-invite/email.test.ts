import {
  buildInviteEmailHtml,
  buildInviteEmailText,
  type InviteEmailContext,
  inviteEmailSubject,
  localizeInviteUrl,
} from "./email.ts";
import { deepStrictEqual as equal } from "node:assert";
function includes(actual: string, expected: string) {
  if (!actual.includes(expected)) throw new Error(`Missing ${expected}`);
}
const base =
  "https://prodforge.techtupa.com.br/roda?codigo=ABC123&ref=a%26b%23c&tag=1&tag=2";
for (const language of ["en", "pt-BR"] as const) {
  Deno.test(`preserves ${language} link, opaque query, duplicates and anchor`, () => {
    const inviteUrl = `${base}&lang=${language}#main-content`;
    equal(localizeInviteUrl(inviteUrl), { inviteUrl, language });
  });
  Deno.test(`renders localized ${language} subject, text and accessible HTML without translating names`, () => {
    const context: InviteEmailContext = {
      language,
      inviteUrl: `${base}&lang=${language}#main-content`,
      storyCount: 2,
      project: { name: "Projeto <script>alert(1)</script> & Companhia" },
      session: {
        name: "Roda original\r\nBcc: injected@example.test",
        scoring_scale: "custom",
        vote_time_limit_seconds: 180,
      },
    };
    const subject = inviteEmailSubject(context);
    equal(/[\r\n]/.test(subject), false);
    includes(
      subject,
      language === "en"
        ? "Planning Poker invitation:"
        : "Convite para a Roda da Fogueira:",
    );
    const html = buildInviteEmailHtml(context);
    includes(html, `lang="${language}"`);
    includes(html, "&lt;script&gt;");
    equal(html.includes("<script>"), false);
    includes(html, "&amp;lang=");
    const text = buildInviteEmailText(context);
    includes(text, context.project.name);
    includes(text, context.inviteUrl);
    includes(
      text,
      language === "en" ? "2 stories ready" : "2 histórias preparadas",
    );
    includes(text, language === "en" ? "3 minutes" : "3 minutos");
    includes(text, language === "en" ? "Custom" : "Personalizada");
    context.storyCount = 1;
    context.session.vote_time_limit_seconds = 60;
    includes(
      buildInviteEmailText(context),
      language === "en" ? "1 story ready" : "1 história preparada",
    );
    includes(
      buildInviteEmailText(context),
      language === "en" ? "1 minute" : "1 minuto",
    );
    context.session.vote_time_limit_seconds = 30;
    includes(
      buildInviteEmailText(context),
      language === "en" ? "30 seconds" : "30 segundos",
    );
    context.storyCount = 0;
    context.session.vote_time_limit_seconds = null;
    includes(
      buildInviteEmailText(context),
      language === "en" ? "no timer" : "sem timer",
    );
  });
}
for (const suffix of ["", "&lang=es", "&lang=", "&lang=es&lang=en"]) {
  Deno.test(`legacy/unsupported language defaults explicitly to pt-BR: ${suffix}`, () => {
    equal(localizeInviteUrl(base + suffix + "#main-content"), {
      language: "pt-BR",
      inviteUrl: base + "&lang=pt-BR#main-content",
    });
  });
}
