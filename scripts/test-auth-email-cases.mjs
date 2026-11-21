import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { setTimeout } from 'node:timers/promises'
import { authEmailTypes } from './auth-email-templates.mjs'

export function decodeAuthEmail(raw) {
  const header = raw.match(/^Subject: (.+(?:\r\n[ \t].+)*)/m)?.[1]?.replace(/\r\n[ \t]+/g, '')
  const subject = header?.replace(/(\?=)\s+(?==\?)/g, '$1').replace(/=\?utf-8\?([bq])\?([^?]+)\?=/gi, (_, encoding, value) =>
    encoding.toLowerCase() === 'b' ? Buffer.from(value, 'base64').toString('utf8')
      : Buffer.from(value.replaceAll('_', ' ').replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8'))
  const decoded = Buffer.from(raw.replace(/=\r\n/g, '').replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8')
  return { subject, html: decoded.slice(decoded.indexOf('<!doctype html>')), link: decoded.match(/https?:\/\/127\.0\.0\.1[^\s"<>]+/g)?.find(url => url.includes('/verify?'))?.replaceAll('&amp;', '&') }
}
export function assertAuthEmail(raw, type, language) {
  const copy = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}/authEmails.json`, import.meta.url), 'utf8'))
  const result = decodeAuthEmail(raw)
  assert.equal(result.subject, copy[type + 'Subject'], `${type} subject follows request language`)
  assert.ok(result.html.includes(`<html lang="${language}">`), `${type} html lang follows request`)
  assert.ok(result.html.includes(copy[type + 'Title']), `${type} body follows request language`)
  assert.ok(!result.html.includes('{{'), 'No unrendered template expression')
  return result
}
export async function testAuthEmailCases(api, mailUrl, site, serviceJwt, legalRelease) {
  assert.match(api, /^http:\/\/127\.0\.0\.1:\d+$/)
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  const admin = createClient(api, serviceJwt, options)
  const password = 'local-fictional-password'
  async function captured(email, before) {
    for (let i = 0; i < 30; i++) {
      const messages = await (await fetch(mailUrl)).json()
      const raw = messages.slice(before).find(message => message.includes(`To: ${email}`) || message.includes(`<${email}>`))
      if (raw) return raw
      await setTimeout(100)
    }
    throw new Error('Local SMTP did not receive the expected fictional message')
  }
  async function create(email, data, confirmed = true) {
    const response = await admin.auth.admin.createUser({ email, password, email_confirm: confirmed, user_metadata: data })
    assert.equal(response.error, null, 'Local fixture created')
  }
  for (const language of ['pt-BR', 'en']) {
    for (const type of authEmailTypes) {
      const email = `${type}-${language.toLowerCase()}@example.test`
      const opposite = language === 'en' ? 'pt-BR' : 'en'
      const data = { prodforge_email_language: type === 'reauthentication' ? language : opposite }
      const target = '/projetos/local/roda/local?tag=1&tag=2&ref=a%26b%23c#main-content'
      const redirectTo = site + '/check-email?' + new URLSearchParams({ lang: language, from: target })
      if (type !== 'invite') await create(email, data, type !== 'confirmation')
      const client = createClient(api, 'test-anon-key', options)
      if (['email_change', 'reauthentication'].includes(type)) {
        assert.equal((await client.auth.signInWithPassword({ email, password })).error, null)
      }
      const before = (await (await fetch(mailUrl)).json()).length
      let response
      if (type === 'confirmation') response = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } })
      if (type === 'invite') response = await admin.auth.admin.inviteUserByEmail(email, { data, redirectTo })
      if (type === 'magic_link') response = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })
      if (type === 'recovery') response = await client.auth.resetPasswordForEmail(email, { redirectTo })
      if (type === 'email_change') response = await client.auth.updateUser({ email: `new-${email}` }, { emailRedirectTo: redirectTo })
      if (type === 'reauthentication') response = await client.auth.reauthenticate()
      assert.equal(response.error, null, `Local ${type} requested`)
      const result = assertAuthEmail(await captured(email, before), type, language)
      if (type === 'reauthentication') assert.match(result.html, /\b\d{6}\b/, 'Verification code retained')
      else {
        assert.ok(result.link, `${type} includes a real Auth link`)
        assert.equal(new URL(result.link).searchParams.get('redirect_to'), redirectTo, `${type} keeps the exact destination`)
      }
      if (type === 'email_change') assertAuthEmail(await captured(`new-${email}`, before), type, language)
      console.log(`PASS email ${type} ${language}: localized subject/body, request precedence and original action`)
    }
  }
  for (const [name, data, language] of [
    ['legacy', {}, 'pt-BR'],
    ['unsupported', { prodforge_email_language: 'fr' }, 'pt-BR'],
    ['malformed', { prodforge_email_language: { unsafe: true } }, 'pt-BR'],
    ['historic', { prodforge_legal_acceptance: { ...legalRelease, language: 'en' } }, 'en'],
  ]) {
    const email = `${name}@example.test`
    await create(email, data, false)
    const before = (await (await fetch(mailUrl)).json()).length
    const response = await admin.auth.resend({ type: 'signup', email })
    assert.equal(response.error, null)
    assertAuthEmail(await captured(email, before), 'confirmation', language)
    console.log(`PASS email fallback ${name}: ${language}`)
  }
}
