import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'

const CONTACT_LAST_UPDATED = '06/05/2026'
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const contactChannels = [
  {
    eyebrow: 'Acesso e uso',
    title: 'Suporte e dúvidas gerais',
    description:
      'Para dúvidas sobre cadastro, login, acesso à Bancada, histórico, limites de uso ou funcionamento esperado da plataforma.',
    subject: 'Suporte e dúvidas gerais sobre o ProdForge',
    actionLabel: 'Escrever para suporte',
  },
  {
    eyebrow: 'LGPD',
    title: 'Privacidade e dados',
    description:
      'Para solicitações sobre dados pessoais, preferências de privacidade, informações de conta ou uso de dados no ProdForge.',
    subject: 'Privacidade e dados no ProdForge',
    actionLabel: 'Falar sobre privacidade',
  },
  {
    eyebrow: 'Evolução',
    title: 'Feedback sobre o produto',
    description:
      'Para compartilhar sugestões, problemas de uso, ideias para user stories, critérios de aceite, IA ou materiais de aprendizado.',
    subject: 'Feedback sobre o produto ProdForge',
    actionLabel: 'Enviar feedback',
  },
  {
    eyebrow: 'Profissional',
    title: 'Parcerias ou conversas profissionais',
    description:
      'Para falar sobre parcerias, adoção em times de produto, treinamentos, interesse em testar o produto ou conversas sobre o projeto.',
    subject: 'Parcerias ou conversa profissional sobre o ProdForge',
    actionLabel: 'Iniciar conversa',
  },
]

const contactReasons = [
  'Dúvidas sobre o produto',
  'Suporte de acesso',
  'Solicitações sobre dados e privacidade',
  'Feedback de usuários',
  'Interesse em testar o produto',
  'Contato profissional com o projeto',
]

const quickLinks = [
  { label: 'Política de Privacidade', to: '/politica-de-privacidade' },
  { label: 'Termos de Uso', to: '/termos-de-uso' },
  { label: 'Preferências de Privacidade', to: '/preferencias-de-privacidade' },
]

function buildMailtoHref(subject, body) {
  const query = new URLSearchParams({
    subject,
    body,
  })

  return `mailto:${CONTACT_EMAIL}?${query.toString()}`
}

function buildChannelBody(channelTitle) {
  return [
    'Olá, equipe ProdForge.',
    '',
    `Quero falar sobre: ${channelTitle}.`,
    '',
    'Contexto da solicitação:',
  ].join('\n')
}

function ContactPage() {
  const pageDescription =
    'Entre em contato com o ProdForge para dúvidas, suporte, privacidade, sugestões de melhoria, parcerias ou assuntos comerciais.'
  const generalContactHref = buildMailtoHref(
    'Contato pelo ProdForge',
    'Olá, equipe ProdForge.\n\nQuero falar sobre o ProdForge.\n\nContexto da solicitação:',
  )

  usePageMetadata({
    title: 'Contato | ProdForge',
    description: pageDescription,
    path: '/contato',
    ogTitle: 'Contato | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Contato | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contato',
      description: pageDescription,
      inLanguage: 'pt-BR',
      isPartOf: {
        '@type': 'WebSite',
        name: APP_NAME,
        url: 'https://prodforge.techtupa.com.br/',
      },
      dateModified: '2026-05-05',
    },
  })

  return (
    <div className="page privacy-policy-page contact-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Canal oficial</p>
          <h1>Fale com o ProdForge</h1>
          <p>Tire dúvidas, envie feedback ou fale sobre acesso, privacidade e evolução do produto.</p>

          <div className="privacy-policy-hero__actions">
            <a
              className="forge-button forge-button--metal forge-button--md"
              href={generalContactHref}
              aria-label={`Enviar e-mail para ${CONTACT_EMAIL}`}
            >
              Enviar e-mail
            </a>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/politica-de-privacidade">
              Ver Política de Privacidade
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary contact-page__summary" aria-label="Resumo do canal de contato">
          <p className="privacy-policy-hero__summary-label">E-mail principal</p>
          <p className="contact-page__email">
            <a href={generalContactHref} aria-label={`Enviar e-mail para ${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>Use este canal para assuntos públicos, suporte e solicitações relacionadas ao ProdForge.</p>
          <ul className="contact-page__reason-list" aria-label="Assuntos aceitos pelo canal de contato">
            {contactReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">Atualizado em {CONTACT_LAST_UPDATED}</p>
        </aside>
      </section>

      <div className="contact-page__grid">
        <section className="contact-page__channels" aria-labelledby="contact-channels-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Bancada de atendimento</p>
            <h2 id="contact-channels-title">Como podemos ajudar</h2>
            <p>Escolha o assunto mais próximo para abrir seu aplicativo de e-mail com o contexto já preenchido.</p>
          </div>

          <div className="contact-page__cards">
            {contactChannels.map((channel) => (
              <article className="contact-card forge-panel forge-panel--metal" key={channel.title}>
                <div className="contact-card__copy">
                  <p className="contact-card__eyebrow">{channel.eyebrow}</p>
                  <h3>{channel.title}</h3>
                  <p>{channel.description}</p>
                </div>
                <a
                  href={buildMailtoHref(channel.subject, buildChannelBody(channel.title))}
                  aria-label={`${channel.actionLabel}: ${channel.title}`}
                >
                  {channel.actionLabel}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="contact-page__mail-panel forge-panel forge-panel--metal" aria-labelledby="contact-mail-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Contato por e-mail</p>
            <h2 id="contact-mail-title">Envio direto pelo canal oficial</h2>
            <p>
              Nesta fase, o contato é feito por e-mail. A página não usa formulário com envio direto para
              servidores.
            </p>
          </div>

          <div className="contact-page__mail-actions">
            <a
              className="forge-button forge-button--ember forge-button--md"
              href={generalContactHref}
              aria-label={`Abrir e-mail para ${CONTACT_EMAIL}`}
            >
              Abrir e-mail para o ProdForge
            </a>
            <a className="contact-page__plain-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>

          <p className="contact-page__privacy-note">
            Ao entrar em contato, os dados enviados serão usados apenas para responder à solicitação,
            conforme a <Link to="/politica-de-privacidade">Política de Privacidade</Link>.
          </p>
        </section>

        <aside className="contact-page__quick-links forge-panel forge-panel--metal" aria-labelledby="contact-links-title">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Links rápidos</p>
          <h2 id="contact-links-title">Documentos úteis</h2>
          <p>
            Consulte os documentos públicos antes de enviar sua mensagem, especialmente em assuntos ligados
            a privacidade, dados e uso da plataforma.
          </p>
          <nav aria-label="Links úteis de contato">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}

export default ContactPage
