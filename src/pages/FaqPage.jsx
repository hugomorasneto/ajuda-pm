import { getFaqCategories } from '../content/faqData'
import { useCopy, useLanguage } from '../i18n/context'
import { useId, useState } from 'react'
import Link from '../i18n/LocalizedLink'
import { useAuth } from '../hooks/useAuth'
import { formatPublicDate, usePublicPageMetadata } from '../hooks/usePublicPageMetadata'

const FAQ_LAST_UPDATED = '2026-05-05'

const getFaqSummary = (t) => [
  t('faqPage_o_que_o_prodforge_faz'),
  t('faqPage_como_a_ia_apoia_sem'),
  t('faqPage_privacidade_historico_planos_e_proximos'),
]

const getUsefulLinks = (t) => [
  { label: t('faqPage_sobre_o_prodforge'), to: '/sobre' },
  { label: t('faqPage_contato'), to: '/contato' },
  { label: t('faqPage_politica_de_privacidade'), to: '/politica-de-privacidade' },
  { label: t('faqPage_termos_de_uso'), to: '/termos-de-uso' },
  { label: t('faqPage_preferencias_de_privacidade'), to: '/preferencias-de-privacidade' },
]

function getFirstQuestionId(faqCategories) {
  const firstCategory = faqCategories[0]
  const firstItem = firstCategory?.items?.[0]
  return firstCategory && firstItem ? `${firstCategory.id}-${firstItem.id}` : null
}

function FaqItem({ item, categoryId, isOpen, onToggle, baseId }) {
  const itemKey = `${categoryId}-${item.id}`
  const triggerId = `${baseId}-trigger-${itemKey}`
  const panelId = `${baseId}-panel-${itemKey}`

  return (
    <article className="faq-page__item forge-panel forge-panel--metal">
      <button
        type="button"
        className="faq-page__trigger"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(itemKey)}
      >
        <span>{item.question}</span>
        <span className="faq-page__icon" aria-hidden="true">
          {isOpen ? '-' : '+'}
        </span>
      </button>

      <div
        className="faq-page__answer"
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
      >
        <p>{item.answer}</p>
        {item.action ? (
          <Link to={item.action.to} className="faq-page__answer-link">
            {item.action.label}
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function FaqCategory({ category, openItemId, onToggle, baseId }) {
  const t = useCopy('faqPage')
  return (
    <section className="faq-page__category" id={category.id} aria-labelledby={`${category.id}-title`}>
      <div className="faq-page__category-header">
        <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">{t('faqPage_perguntas_frequentes')}</p>
        <h2 id={`${category.id}-title`}>{category.title}</h2>
        <p>{category.description}</p>
      </div>

      <div className="faq-page__items">
        {category.items.map((item) => {
          const itemKey = `${category.id}-${item.id}`

          return (
            <FaqItem
              key={item.id}
              item={item}
              categoryId={category.id}
              isOpen={openItemId === itemKey}
              onToggle={onToggle}
              baseId={baseId}
            />
          )
        })}
      </div>
    </section>
  )
}

function FaqPage() {
  const t = useCopy('faqPage')
  const { language } = useLanguage()
  const faqCategories = getFaqCategories(t)
  const usefulLinks = getUsefulLinks(t)
  const faqSummary = getFaqSummary(t)
  const baseId = useId()
  const { user } = useAuth()
  const [openItemId, setOpenItemId] = useState(() => getFirstQuestionId(faqCategories))

  usePublicPageMetadata('faq', faqCategories)

  function handleToggle(itemId) {
    setOpenItemId((currentItemId) => (currentItemId === itemId ? null : itemId))
  }

  return (
    <div className="page privacy-policy-page faq-page">
      <section className="privacy-policy-hero faq-page__hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('faqPage_duvidas_rapidas')}</p>
          <h1>{t('faqPage_perguntas_frequentes_59')}</h1>
          <p>
            {t('faqPage_respostas_diretas_sobre_o_prodforge')}
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
              {user ? t('faqPage_abrir_bancada') : t('faqPage_comecar_agora')}
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/sobre">
              {t('faqPage_conhecer_o_prodforge')}
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary faq-page__summary" aria-label={t('faqPage_resumo_do_faq')}>
          <p className="privacy-policy-hero__summary-label">{t('faqPage_nesta_pagina')}</p>
          <p className="faq-page__summary-title">{t('faqPage_objecoes_comuns_respostas_claras')}</p>
          <ul>
            {faqSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">{t('faqPage_atualizado_em')} {formatPublicDate(FAQ_LAST_UPDATED, language)}</p>
        </aside>
      </section>

      <div className="privacy-policy-content faq-page__content">
        <aside className="privacy-policy-toc faq-page__toc" aria-label={t('faqPage_categorias_do_faq')}>
          <p className="privacy-policy-toc__title">{t('faqPage_categorias')}</p>
          <nav>
            {faqCategories.map((category, index) => (
              <a key={category.id} href={`#${category.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {category.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="faq-page__categories">
          {faqCategories.map((category) => (
            <FaqCategory
              key={category.id}
              category={category}
              openItemId={openItemId}
              onToggle={handleToggle}
              baseId={baseId}
            />
          ))}
        </div>
      </div>

      <section className="faq-page__cta forge-panel forge-panel--metal forge-texture-layer" aria-labelledby="faq-cta-title">
        <div>
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('faqPage_ainda_ficou_duvida')}</p>
          <h2 id="faq-cta-title">{t('faqPage_leve_uma_demanda_real_para')}</h2>
          <p>
            {t('faqPage_a_forma_mais_rapida_de')}
          </p>
        </div>

        <div className="faq-page__cta-actions">
          <Link className="forge-button forge-button--ember forge-button--md" to={user ? '/tool' : '/signup'}>
            {user ? t('faqPage_abrir_bancada') : t('faqPage_comecar_agora')}
          </Link>
          <Link className="forge-button forge-button--metal forge-button--md" to="/contato">
            {t('faqPage_falar_com_contato')}
          </Link>
        </div>

        <nav className="faq-page__links" aria-label={t('faqPage_links_uteis_do_faq')}>
          {usefulLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  )
}

export default FaqPage
