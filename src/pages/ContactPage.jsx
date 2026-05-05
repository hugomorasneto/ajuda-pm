import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'

const CONTACT_LAST_UPDATED = '05/05/2026'
// TODO: revisar este e-mail quando o canal oficial de contato do ProdForge estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const contactChannels = [
  {
    title: 'Suporte e dúvidas sobre o produto',
    description:
      'Use este canal para dúvidas sobre cadastro, acesso, uso da Bancada, histórico, limites de uso ou comportamento esperado da plataforma.',
    subject: 'Suporte e dúvidas sobre o ProdForge',
  },
  {
    title: 'Privacidade e dados pessoais',
    description:
      'Envie solicitações sobre preferências de privacidade, dados salvos no navegador, informações de conta ou dúvidas sobre uso de dados no ProdForge.',
    subject: 'Privacidade e dados pessoais no ProdForge',
  },
  {
    title: 'Parcerias ou contato comercial',
    description:
      'Fale sobre planos, uso em times de produto, parcerias, treinamentos, propostas comerciais ou adoção do ProdForge em uma organização.',
    subject: 'Contato comercial sobre o ProdForge',
  },
  {
    title: 'Sugestões de melhoria',
    description:
      'Compartilhe ideias para melhorar user stories, critérios de aceite, insights técnicos, fluxos com IA, experiência da Bancada ou materiais de aprendizado.',
    subject: 'Sugestão de melhoria para o ProdForge',
  },
]

const quickLinks = [
  { label: 'Política de Privacidade', to: '/politica-de-privacidade' },
  { label: 'Termos de Uso', to: '/termos-de-uso' },
  { label: 'Preferências de Privacidade', to: '/preferencias-de-privacidade' },
]

const initialFormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

function buildMailtoHref(assunto, corpo) {
  const query = new URLSearchParams({
    subject: assunto,
    body: corpo,
  })

  return 'mailto:' + CONTACT_EMAIL + '?' + query.toString()
}

function ContactPage() {
  const [formData, setFormData] = useState(initialFormState)
  const [statusMessage, setStatusMessage] = useState('')

  const pageDescription =
    'Entre em contato com o ProdForge para dúvidas, suporte, privacidade, sugestões de melhoria, parcerias ou assuntos comerciais.'

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

  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const subject = formData.subject.trim() || 'Contato pelo ProdForge'
    const body = [
      'Olá, equipe ProdForge.',
      '',
      `Nome: ${formData.name.trim() || 'Não informado'}`,
      `E-mail: ${formData.email.trim() || 'Não informado'}`,
      `Assunto: ${subject}`,
      '',
      'Mensagem:',
      formData.message.trim(),
      '',
      'Esta mensagem foi preparada pela página pública de contato do ProdForge.',
    ].join('\n')

    if (typeof window !== 'undefined') {
      window.location.href = buildMailtoHref(subject, body)
    }

    setStatusMessage(
      'Abrimos seu aplicativo de e-mail com a mensagem preenchida. Revise o conteúdo antes de enviar.',
    )
  }

  return (
    <div className="page privacy-policy-page contact-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Canal oficial</p>
          <h1>Contato</h1>
          <p>
            Fale com o ProdForge para dúvidas, suporte, privacidade, sugestões de melhoria, parcerias
            ou assuntos comerciais ligados à plataforma e aos fluxos de produto com IA.
          </p>

          <div className="privacy-policy-hero__actions">
            <a className="forge-button forge-button--metal forge-button--md" href={`mailto:${CONTACT_EMAIL}`}>
              Enviar e-mail
            </a>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/politica-de-privacidade">
              Ver política
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary contact-page__summary" aria-label="Resumo do canal de contato">
          <p className="privacy-policy-hero__summary-label">E-mail principal</p>
          <p className="contact-page__email">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <p>O canal oficial de contato do ProdForge é o e-mail exibido nesta página.</p>
          <p className="privacy-policy-hero__summary-date">Atualizado em {CONTACT_LAST_UPDATED}</p>
        </aside>
      </section>

      <div className="contact-page__grid">
        <section className="contact-page__channels" aria-labelledby="contact-channels-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Bancada de atendimento</p>
            <h2 id="contact-channels-title">Como podemos ajudar</h2>
          </div>

          <div className="contact-page__cards">
            {contactChannels.map((channel) => (
              <article className="contact-card forge-panel forge-panel--metal" key={channel.title}>
                <div>
                  <h3>{channel.title}</h3>
                  <p>{channel.description}</p>
                </div>
                <a href={buildMailtoHref(channel.subject, `Olá, equipe ProdForge.\n\nQuero falar sobre: ${channel.title}.`)}>
                  Escrever sobre este assunto
                </a>
              </article>
            ))}
          </div>
        </section>

        <aside className="contact-page__quick-links forge-panel forge-panel--metal" aria-labelledby="contact-links-title">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Links rápidos</p>
          <h2 id="contact-links-title">Documentos úteis</h2>
          <p>
            Consulte os documentos públicos antes de enviar sua mensagem, especialmente em assuntos
            ligados a privacidade, dados e uso da plataforma.
          </p>
          <nav aria-label="Links úteis de contato">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="contact-page__form-card forge-panel forge-panel--metal" aria-labelledby="contact-form-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Mensagem por e-mail</p>
            <h2 id="contact-form-title">Preparar mensagem</h2>
            <p>
              O formulário não envia dados para servidores. Ele apenas prepara um e-mail no seu
              aplicativo para que você revise e envie pelo canal oficial.
            </p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              <span>Nome</span>
              <input
                autoComplete="name"
                name="name"
                onChange={handleFieldChange}
                placeholder="Seu nome"
                type="text"
                value={formData.name}
              />
            </label>

            <label>
              <span>E-mail</span>
              <input
                autoComplete="email"
                name="email"
                onChange={handleFieldChange}
                placeholder="seu.email@empresa.com"
                type="email"
                value={formData.email}
              />
            </label>

            <label>
              <span>Assunto</span>
              <input
                autoComplete="off"
                name="subject"
                onChange={handleFieldChange}
                placeholder="Ex.: dúvida sobre privacidade"
                type="text"
                value={formData.subject}
              />
            </label>

            <label className="contact-form__message">
              <span>Mensagem</span>
              <textarea
                name="message"
                onChange={handleFieldChange}
                placeholder="Descreva sua dúvida, sugestão ou solicitação."
                required
                rows={6}
                value={formData.message}
              />
            </label>

            {statusMessage ? (
              <p className="contact-form__status" role="status" aria-live="polite">
                {statusMessage}
              </p>
            ) : null}

            <button className="forge-button forge-button--ember forge-button--md" type="submit">
              Enviar mensagem
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default ContactPage
