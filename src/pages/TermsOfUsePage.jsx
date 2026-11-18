import { useCopy, useLanguage } from '../i18n/context'
import Link from '../i18n/LocalizedLink'
import { formatPublicDate, usePublicPageMetadata } from '../hooks/usePublicPageMetadata'

const TERMS_LAST_UPDATED = '2026-05-06'
// TODO: revisar este e-mail quando o canal oficial de termos e suporte estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const getTermsSummary = (t) => [
  t('termsOfUsePage_plataforma_de_apoio_para_historias'),
  t('termsOfUsePage_uso_responsavel_de_briefings_requisitos'),
  t('termsOfUsePage_respostas_da_ia_como_sugestoes'),
  t('termsOfUsePage_planos_limites_privacidade_e_canais'),
]

const getTermsSections = (t) => [
  {
    id: 'aceitacao-e-escopo',
    title: t('termsOfUsePage_aceitacao_e_escopo'),
    paragraphs: [
      t('termsOfUsePage_estes_termos_de_uso_regulam'),
      t('termsOfUsePage_ao_acessar_ou_usar_o'),
      t('termsOfUsePage_a_versao_publicada_nesta_pagina'),
    ],
  },
  {
    id: 'o-que-e-o-prodforge',
    title: t('termsOfUsePage_o_que_e_o_prodforge'),
    paragraphs: [
      t('termsOfUsePage_o_prodforge_e_uma_plataforma'),
      t('termsOfUsePage_o_produto_foi_pensado_para'),
      t('termsOfUsePage_a_plataforma_ajuda_a_estruturar'),
    ],
  },
  {
    id: 'uso-permitido-da-plataforma',
    title: t('termsOfUsePage_uso_permitido_da_plataforma'),
    paragraphs: [
      t('termsOfUsePage_voce_pode_usar_o_prodforge'),
      t('termsOfUsePage_o_uso_deve_respeitar_leis'),
      t('termsOfUsePage_voce_nao_deve_usar_o'),
    ],
  },
  {
    id: 'conta-e-acesso',
    title: t('termsOfUsePage_conta_e_acesso'),
    paragraphs: [
      t('termsOfUsePage_para_usar_algumas_funcionalidades_voce'),
      t('termsOfUsePage_proteja_suas_credenciais_e_nao'),
      t('termsOfUsePage_o_acesso_ao_prodforge_pode'),
      t('termsOfUsePage_caso_identifique_acesso_indevido_suspeita'),
    ],
  },
  {
    id: 'uso-de-inteligencia-artificial',
    title: t('termsOfUsePage_uso_de_inteligencia_artificial'),
    paragraphs: [
      t('termsOfUsePage_o_prodforge_pode_usar_servicos'),
      t('termsOfUsePage_as_respostas_geradas_por_ia'),
      t('termsOfUsePage_a_ia_pode_gerar_respostas'),
      t('termsOfUsePage_o_prodforge_nao_substitui_julgamento'),
    ],
    note: t('termsOfUsePage_a_decisao_final_sobre_uso'),
  },
  {
    id: 'conteudos-inseridos-pelo-usuario',
    title: t('termsOfUsePage_conteudos_inseridos_pelo_usuario'),
    paragraphs: [
      t('termsOfUsePage_voce_e_responsavel_pelos_conteudos'),
      t('termsOfUsePage_nao_insira_dados_confidenciais_segredos'),
      t('termsOfUsePage_ao_inserir_conteudo_no_prodforge'),
      t('termsOfUsePage_esses_conteudos_podem_ser_armazenados'),
    ],
  },
  {
    id: 'planos-limites-e-recursos',
    title: t('termsOfUsePage_planos_limites_e_recursos'),
    paragraphs: [
      t('termsOfUsePage_o_prodforge_pode_oferecer_plano'),
      t('termsOfUsePage_recursos_pagos_podem_depender_de'),
      t('termsOfUsePage_planos_limites_beneficios_precos_regras'),
    ],
  },
  {
    id: 'disponibilidade-e-mudancas',
    title: t('termsOfUsePage_disponibilidade_e_mudancas'),
    paragraphs: [
      t('termsOfUsePage_trabalhamos_para_manter_o_prodforge'),
      t('termsOfUsePage_a_plataforma_pode_passar_por'),
      t('termsOfUsePage_o_prodforge_pode_alterar_estes'),
      t('termsOfUsePage_quando_houver_mudancas_relevantes_poderemos'),
    ],
  },
  {
    id: 'responsabilidades-e-limitacoes',
    title: t('termsOfUsePage_responsabilidades_e_limitacoes'),
    paragraphs: [
      t('termsOfUsePage_o_prodforge_busca_entregar_uma'),
      t('termsOfUsePage_o_uso_profissional_de_historias'),
      t('termsOfUsePage_na_medida_permitida_pela_legislacao'),
    ],
  },
  {
    id: 'privacidade-e-preferencias',
    title: t('termsOfUsePage_privacidade_cookies_e_preferencias'),
    paragraphs: [
      t('termsOfUsePage_o_tratamento_de_dados_pessoais'),
      t('termsOfUsePage_voce_tambem_pode_revisar_e'),
      t('termsOfUsePage_as_escolhas_de_privacidade_nao'),
    ],
    links: [
      { label: t('termsOfUsePage_ler_a_politica_de_privacidade'), to: '/politica-de-privacidade' },
      { label: t('termsOfUsePage_abrir_preferencias_de_privacidade'), to: '/preferencias-de-privacidade' },
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: t('termsOfUsePage_propriedade_intelectual'),
    paragraphs: [
      t('termsOfUsePage_a_marca_prodforge_identidade_visual'),
      t('termsOfUsePage_voce_mantem_seus_direitos_sobre'),
      t('termsOfUsePage_voce_nao_pode_copiar_revender'),
    ],
  },
  {
    id: 'condutas-proibidas',
    title: t('termsOfUsePage_condutas_proibidas'),
    paragraphs: [
      t('termsOfUsePage_para_proteger_a_experiencia_de'),
    ],
    bullets: [
      t('termsOfUsePage_tentar_acessar_contas_dados_projetos'),
      t('termsOfUsePage_usar_automacoes_abusivas_engenharia_reversa'),
      t('termsOfUsePage_inserir_conteudo_ilegal_discriminatorio_ofensivo'),
      t('termsOfUsePage_usar_a_plataforma_para_gerar'),
      t('termsOfUsePage_remover_avisos_mascarar_identidade_simular'),
    ],
  },
  {
    id: 'contato',
    title: t('termsOfUsePage_contato'),
    paragraphs: [
      t('termsOfUsePage_para_duvidas_solicitacoes_ou_comentarios'),
    ],
    contact: CONTACT_EMAIL,
  },
]

function TermsSection({ section, index }) {
  const t = useCopy('termsOfUsePage')
  return (
    <article className="privacy-policy-section forge-panel forge-panel--metal" id={section.id}>
      <div className="privacy-policy-section__header">
        <span className="privacy-policy-section__index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h2>{section.title}</h2>
      </div>

      <div className="privacy-policy-section__body">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}

        {section.bullets?.length ? (
          <ul>
            {section.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {section.note ? <p className="privacy-policy-section__note">{section.note}</p> : null}

        {section.links?.length ? (
          <div className="privacy-policy-hero__actions" aria-label={t('termsOfUsePage_links_de', { p1: section.title })}>
            {section.links.map((link) => (
              <Link className="forge-button forge-button--tech forge-button--sm" key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        {section.contact ? (
          <p className="privacy-policy-section__contact">
            <a href={`mailto:${section.contact}`}>{section.contact}</a>
          </p>
        ) : null}
      </div>
    </article>
  )
}

function TermsOfUsePage() {
  const t = useCopy('termsOfUsePage')
  const { language, preview } = useLanguage()
  const termsSections = getTermsSections(t)
  const termsSummary = getTermsSummary(t)
  usePublicPageMetadata('terms')

  return (
    <div className="page privacy-policy-page terms-of-use-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('termsOfUsePage_termos_da_bancada')}</p>
          <h1>{t('termsOfUsePage_termos_de_uso')}</h1>
          <p>
            {t('termsOfUsePage_estes_termos_regulam_o_uso')}
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/">
              {t('termsOfUsePage_voltar_para_a_pagina_inicial')}
            </Link>
            <a className="forge-button forge-button--ghost forge-button--md" href={`mailto:${CONTACT_EMAIL}`}>
              {t('termsOfUsePage_falar_sobre_os_termos')}
            </a>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label={t('termsOfUsePage_resumo_dos_termos')}>
          <p className="privacy-policy-hero__summary-label">{t('termsOfUsePage_ultima_atualizacao')}</p>
          <p className="privacy-policy-hero__summary-date">
            {preview ? t('termsOfUsePage_vigencia_em_revisao') : formatPublicDate(TERMS_LAST_UPDATED, language)}
          </p>
          <ul>
            {termsSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="privacy-policy-content">
        <aside className="privacy-policy-toc" aria-label={t('termsOfUsePage_secoes_dos_termos_de_uso')}>
          <p className="privacy-policy-toc__title">{t('termsOfUsePage_nestes_termos')}</p>
          <nav>
            {termsSections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            {t('termsOfUsePage_estes_termos_foram_escritos_em')}
          </p>

          {termsSections.map((section, index) => (
            <TermsSection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TermsOfUsePage
