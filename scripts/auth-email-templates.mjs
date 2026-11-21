import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const authEmailTypes = ['confirmation', 'invite', 'magic_link', 'recovery', 'email_change', 'reauthentication']
const read = language => JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}/authEmails.json`, import.meta.url), 'utf8'))
const catalogs = { 'pt-BR': read('pt-BR'), en: read('en') }
// Built-in Go template functions only. RedirectTo is already validated by Auth.
// A request (including resend in a different language) overrides signup metadata.
const selectLanguage = '{{ $en := printf "%s/check-email?lang=en&" .SiteURL }}{{ $pt := printf "%s/check-email?lang=pt-BR&" .SiteURL }}{{ $explicitEn := eq (printf "%.*s" (len $en) .RedirectTo) $en }}{{ $explicitPt := eq (printf "%.*s" (len $pt) .RedirectTo) $pt }}{{ $saved := printf "%v" .Data.prodforge_email_language }}{{ if eq $saved "<nil>" }}{{ with .Data.prodforge_legal_acceptance }}{{ if eq (printf "%T" .) "map[string]interface {}" }}{{ $saved = printf "%v" .language }}{{ end }}{{ end }}{{ end }}{{ $english := or $explicitEn (and (not $explicitPt) (eq $saved "en")) }}'
const choose = (english, portuguese) => `{{ if $english }}${english}{{ else }}${portuguese}{{ end }}`
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
function content(type, language) {
  const c = catalogs[language]
  const action = type === 'reauthentication'
    ? '<p style="font-size:28px;letter-spacing:4px;font-weight:bold">{{ .Token }}</p>'
    : `<p style="margin:28px 0"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 20px;background:#385c3f;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">${escape(c[type + 'Action'])}</a></p>
<p>${escape(c.return)}</p><p>${escape(c.fallbackLink)}</p><p style="overflow-wrap:anywhere;word-break:break-all"><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>`
  return `<h1 style="font-size:24px;line-height:1.3">${escape(c[type + 'Title'])}</h1><p>${escape(c[type + 'Intro'])}</p>${action}<p style="margin-top:28px;color:#555">${escape(c.ignore)}</p><p>${escape(c.footer)}</p>`
}
export function buildAuthEmailConfig() {
  return Object.fromEntries(authEmailTypes.flatMap(type => [
    [`mailer_subjects_${type}`, selectLanguage + choose(catalogs.en[type + 'Subject'], catalogs['pt-BR'][type + 'Subject'])],
    [`mailer_templates_${type}_content`, `${selectLanguage}<!doctype html><html lang="${choose('en', 'pt-BR')}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="UTF-8"></head><body style="margin:0;background:#f5f3ed;color:#202820;font-family:Arial,sans-serif;line-height:1.6"><main style="max-width:560px;margin:24px auto;padding:24px;background:#fff;border-radius:12px"><p style="font-weight:bold;font-size:20px">ProdForge</p>${choose(content(type, 'en'), content(type, 'pt-BR'))}</main></body></html>`],
  ]))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(buildAuthEmailConfig(), null, 2) + '\n')
}
