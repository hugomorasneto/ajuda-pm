import { useCopy, useLanguage } from '../i18n/context'
import Link from '../i18n/LocalizedLink'
import { formatPublicDate, usePublicPageMetadata } from '../hooks/usePublicPageMetadata'

const POLICY_LAST_UPDATED = '2026-05-06'
// TODO: revisar este e-mail quando o canal oficial de privacidade estiver definido.
const CONTACT_EMAIL = 'contato@techtupa.com.br'

const getPolicySummary = (t) => [
  t('privacyPolicyPage_dados_de_conta_autenticacao_e'),
  t('privacyPolicyPage_briefings_historias_de_usuario_e'),
  t('privacyPolicyPage_armazenamento_em_banco_de_dados'),
  t('privacyPolicyPage_cookies_essenciais_analiticos_e_categoria'),
  t('privacyPolicyPage_processamento_por_servicos_de_ia'),
]

const getPolicySections = (t) => [
  {
    id: 'quem-somos',
    title: t('privacyPolicyPage_quem_somos'),
    paragraphs: [
      t('privacyPolicyPage_o_prodforge_e_uma_plataforma'),
      t('privacyPolicyPage_esta_politica_de_privacidade_descreve'),
    ],
  },
  {
    id: 'quais-dados-podemos-coletar',
    title: t('privacyPolicyPage_quais_dados_podemos_coletar'),
    paragraphs: [
      t('privacyPolicyPage_podemos_coletar_dados_informados_diretamente'),
    ],
    bullets: [
      t('privacyPolicyPage_dados_de_cadastro_e_autenticacao'),
      t('privacyPolicyPage_conteudos_inseridos_nos_formularios_como'),
      t('privacyPolicyPage_historico_de_uso_versoes_geradas'),
      t('privacyPolicyPage_dados_tecnicos_de_navegacao_como'),
      t('privacyPolicyPage_dados_de_comunicacao_como_mensagens'),
      t('privacyPolicyPage_informacoes_necessarias_para_eventual_monetizacao'),
    ],
  },
  {
    id: 'como-usamos-os-dados',
    title: t('privacyPolicyPage_como_usamos_os_dados'),
    paragraphs: [
      t('privacyPolicyPage_usamos_os_dados_para_entregar'),
    ],
    bullets: [
      t('privacyPolicyPage_criar_e_manter_sua_conta'),
      t('privacyPolicyPage_gerar_revisar_salvar_versionar_e'),
      t('privacyPolicyPage_entender_uso_desempenho_erros_e'),
      t('privacyPolicyPage_enviar_comunicacoes_relacionadas_a_conta'),
      t('privacyPolicyPage_proteger_a_plataforma_contra_abuso'),
      t('privacyPolicyPage_gerenciar_limites_de_uso_planos'),
    ],
  },
  {
    id: 'armazenamento-em-banco-de-dados',
    title: t('privacyPolicyPage_armazenamento_em_banco_de_dados_26'),
    paragraphs: [
      t('privacyPolicyPage_dados_de_conta_projetos_preferencias'),
      t('privacyPolicyPage_esse_armazenamento_permite_recuperar_conteudo'),
    ],
  },
  {
    id: 'uso-de-inteligencia-artificial',
    title: t('privacyPolicyPage_uso_de_inteligencia_artificial'),
    paragraphs: [
      t('privacyPolicyPage_dados_inseridos_pelo_usuario_podem'),
      t('privacyPolicyPage_a_qualidade_das_respostas_depende'),
      t('privacyPolicyPage_voce_nao_deve_inserir_informacoes'),
    ],
    note: t('privacyPolicyPage_sempre_que_possivel_remova_ou'),
  },
  {
    id: 'cookies-e-tecnologias-similares',
    title: t('privacyPolicyPage_cookies_e_tecnologias_similares'),
    paragraphs: [
      t('privacyPolicyPage_podemos_usar_cookies_armazenamento_local'),
      t('privacyPolicyPage_cookies_essenciais_sao_necessarios_para'),
      t('privacyPolicyPage_voce_pode_aceitar_todos_os'),
    ],
  },
  {
    id: 'compartilhamento-de-dados',
    title: t('privacyPolicyPage_compartilhamento_de_dados'),
    paragraphs: [
      t('privacyPolicyPage_nao_usamos_dados_pessoais_como'),
    ],
    bullets: [
      t('privacyPolicyPage_provedores_de_infraestrutura_hospedagem_banco'),
      t('privacyPolicyPage_servicos_de_ia_usados_para'),
      t('privacyPolicyPage_ferramentas_de_pagamento_faturamento_prevencao'),
      t('privacyPolicyPage_autoridades_publicas_quando_houver_obrigacao'),
    ],
  },
  {
    id: 'seguranca-das-informacoes',
    title: t('privacyPolicyPage_seguranca_das_informacoes'),
    paragraphs: [
      t('privacyPolicyPage_adotamos_medidas_tecnicas_e_organizacionais'),
      t('privacyPolicyPage_essas_medidas_podem_incluir_autenticacao'),
    ],
  },
  {
    id: 'retencao-dos-dados',
    title: t('privacyPolicyPage_retencao_dos_dados'),
    paragraphs: [
      t('privacyPolicyPage_mantemos_dados_pelo_tempo_necessario'),
      t('privacyPolicyPage_conteudos_salvos_na_bancada_versoes'),
    ],
  },
  {
    id: 'direitos-do-titular',
    title: t('privacyPolicyPage_direitos_do_titular_conforme_a'),
    paragraphs: [
      t('privacyPolicyPage_nos_termos_da_lgpd_voce'),
      t('privacyPolicyPage_para_exercer_esses_direitos_envie'),
    ],
  },
  {
    id: 'contato',
    title: t('privacyPolicyPage_contato'),
    paragraphs: [
      t('privacyPolicyPage_para_duvidas_solicitacoes_ou_comentarios'),
    ],
    contact: CONTACT_EMAIL,
  },
  {
    id: 'atualizacoes-desta-politica',
    title: t('privacyPolicyPage_atualizacoes_desta_politica'),
    paragraphs: [
      t('privacyPolicyPage_esta_politica_pode_ser_atualizada'),
      t('privacyPolicyPage_quando_houver_mudancas_relevantes_poderemos'),
    ],
  },
]

function PrivacySection({ section, index }) {
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

        {section.contact ? (
          <p className="privacy-policy-section__contact">
            <a href={`mailto:${section.contact}`}>{section.contact}</a>
          </p>
        ) : null}
      </div>
    </article>
  )
}

function PrivacyPolicyPage() {
  const t = useCopy('privacyPolicyPage')
  const { language, preview } = useLanguage()
  const policySections = getPolicySections(t)
  const policySummary = getPolicySummary(t)
  usePublicPageMetadata('privacyPolicy')

  return (
    <div className="page privacy-policy-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('privacyPolicyPage_privacidade_e_dados')}</p>
          <h1>{t('privacyPolicyPage_politica_de_privacidade')}</h1>
          <p>
            {t('privacyPolicyPage_esta_pagina_descreve_como_o')}
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/">
              {t('privacyPolicyPage_voltar_para_a_pagina_inicial')}
            </Link>
            <a className="forge-button forge-button--ghost forge-button--md" href={`mailto:${CONTACT_EMAIL}`}>
              {t('privacyPolicyPage_falar_sobre_dados')}
            </a>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label={t('privacyPolicyPage_resumo_da_politica')}>
          <p className="privacy-policy-hero__summary-label">{t('privacyPolicyPage_ultima_atualizacao')}</p>
          <p className="privacy-policy-hero__summary-date">
            {preview ? t('privacyPolicyPage_vigencia_em_revisao') : formatPublicDate(POLICY_LAST_UPDATED, language)}
          </p>
          <ul>
            {policySummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="privacy-policy-content">
        <aside className="privacy-policy-toc" aria-label={t('privacyPolicyPage_secoes_da_politica_de_privacidade')}>
          <p className="privacy-policy-toc__title">{t('privacyPolicyPage_nesta_politica')}</p>
          <nav>
            {policySections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="privacy-policy-sections">
          <p className="privacy-policy-intro">
            {t('privacyPolicyPage_a_politica_foi_escrita_em')}
          </p>

          {policySections.map((section, index) => (
            <PrivacySection key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
