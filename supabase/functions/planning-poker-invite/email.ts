import portuguese from "./locales/pt-BR.json" with { type: "json" };
import english from "./locales/en.json" with { type: "json" };

export type InviteLanguage = "pt-BR" | "en";
type CopyKey = keyof typeof portuguese;
export type InviteEmailContext = {
  language: InviteLanguage;
  inviteUrl: string;
  storyCount: number;
  project: { name: string };
  session: {
    name: string;
    scoring_scale: string;
    vote_time_limit_seconds: number | null;
  };
};

// The validated link is the existing API's single source for language and room.
export function localizeInviteUrl(
  inviteUrl: string,
): { inviteUrl: string; language: InviteLanguage } {
  const url = new URL(inviteUrl);
  const requested = url.searchParams.get("lang");
  if (requested === "en" || requested === "pt-BR") {
    return { inviteUrl, language: requested };
  }
  // Keep opaque/duplicate query values and the anchor byte-for-byte.
  const retained = url.search.slice(1).split("&").filter((field) =>
    field && !new URLSearchParams(field).has("lang")
  ).join("&");
  url.search = (retained ? retained + "&" : "") + "lang=pt-BR";
  return { inviteUrl: url.toString(), language: "pt-BR" };
}

export function inviteCopy(
  language: InviteLanguage,
  key: CopyKey,
  count?: number,
): string {
  return (language === "en" ? english : portuguese)[key].replace(
    "{{count}}",
    String(count ?? ""),
  );
}
function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    ">",
    "&gt;",
  ).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function fields(context: InviteEmailContext): Array<[string, string]> {
  const t = (key: CopyKey, count?: number) =>
    inviteCopy(context.language, key, count);
  const seconds = context.session.vote_time_limit_seconds;
  const minutes = Math.round((seconds ?? 0) / 60);
  const timer = !seconds
    ? t("no_timer")
    : seconds < 60
    ? t("seconds", seconds)
    : minutes === 1
    ? t("minute_one")
    : t("minute_many", minutes);
  const scale = ({
    fibonacci: "Fibonacci",
    tshirt: "T-shirt",
    custom: t("custom_scale"),
  } as Record<string, string>)[context.session.scoring_scale] ??
    context.session.scoring_scale;
  return [
    [t("project"), context.project.name],
    [t("session"), context.session.name],
    [
      t("stories"),
      context.storyCount === 1
        ? t("story_one")
        : t("story_many", context.storyCount),
    ],
    [t("scale"), scale],
    [t("timer"), timer],
  ];
}
export function inviteEmailSubject(context: InviteEmailContext): string {
  return `${inviteCopy(context.language, "subject")}: ${context.session.name}`
    .replace(/[\r\n]+/g, " ");
}
export function buildInviteEmailText(context: InviteEmailContext): string {
  const t = (key: CopyKey) => inviteCopy(context.language, key);
  return [
    t("intro"),
    "",
    ...fields(context).map(([label, value]) => `${label}: ${value}`),
    "",
    t("action"),
    context.inviteUrl,
    "",
    t("sign_in"),
    "",
    t("votes"),
  ].join("\n");
}
export function buildInviteEmailHtml(context: InviteEmailContext): string {
  const t = (key: CopyKey) => escape(inviteCopy(context.language, key));
  const url = escape(context.inviteUrl);
  return `<!doctype html><html lang="${context.language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f5f3ed;color:#202820;font-family:Arial,sans-serif;line-height:1.6"><main style="max-width:560px;margin:24px auto;padding:24px;background:#fff;border-radius:12px">
<p style="font-size:20px;font-weight:bold">ProdForge</p><h1 style="font-size:24px;line-height:1.3">${
    t("title")
  }</h1><p>${t("intro")}</p>
<table style="border-collapse:collapse;width:100%;table-layout:fixed"><tbody>${
    fields(context).map(([label, value]) =>
      `<tr><th scope="row" style="text-align:left;vertical-align:top;width:90px;padding:8px 8px 8px 0;border-bottom:1px solid #e5e7eb;overflow-wrap:anywhere">${
        escape(label)
      }</th><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;overflow-wrap:anywhere;word-break:break-word">${
        escape(value)
      }</td></tr>`
    ).join("")
  }</tbody></table>
<p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#f97316;color:#111827;font-weight:bold;text-decoration:none">${
    t("action")
  }</a></p>
<p>${
    t("fallback")
  }</p><p style="overflow-wrap:anywhere;word-break:break-all"><a href="${url}">${url}</a></p><p>${
    t("sign_in")
  }</p><p>${t("votes")}</p>
</main></body></html>`;
}
