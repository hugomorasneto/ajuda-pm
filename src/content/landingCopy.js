import { FREE_GENERATION_LIMIT, FREE_PLAN_NAME, PRO_PLAN_NAME } from '../constants/app'

export const getLandingCopy = (t) => ({
  contextStrip: [
    {
      icon: 'bolt',
      value: t('landingCopy_60_segundos'),
      description: t('landingCopy_da_demanda_vaga_a_uma'),
    },
    {
      icon: 'check',
      value: t('landingCopy_criterios_e_trincas'),
      description: t('landingCopy_aceite_gaps_e_qa_no'),
    },
    {
      icon: 'unlock',
      value: t('landingCopy_comece_gratis'),
      description: t('landingCopy_teste_com_contexto_real_sem'),
    },
  ],
  hero: {
    eyebrow: t('landingCopy_feito_para_pms_e_times'),
    title: t('landingCopy_transforme_briefings_confusos_em_user'),
    description:
      t('landingCopy_use_ia_para_transformar_contexto'),
    microcopy: t('landingCopy_gratis_para_comecar_sem_cartao'),
    trustSignals: [
      t('landingCopy_gratis_para_comecar'),
      t('landingCopy_sem_cartao'),
      t('landingCopy_criado_para_pms_pos_devs'),
      t('landingCopy_gera_criterios_trincas_e_checklist'),
      t('landingCopy_copia_em_markdown_pronta_para'),
    ],
    stats: [
      { value: t('landingCopy_60_segundos'), label: t('landingCopy_da_demanda_vaga_a_uma_17') },
      { value: t('landingCopy_criterios_trincas'), label: t('landingCopy_aceite_gaps_e_pontos_frageis') },
      { value: t('landingCopy_100_gratis'), label: t('landingCopy_para_comecar_sem_cartao_e') },
    ],
    preview: {
      imageAlt:
        t('landingCopy_interface_visual_transformando_briefing_em'),
      problemLabel: t('landingCopy_briefing_bruto'),
      problemTitle: t('landingCopy_dominio_corporativo_no_onboarding_b'),
      problemItems: [
        t('landingCopy_usuarios_avancam_com_dominio_invalido'),
        t('landingCopy_dev_e_qa_ainda_nao'),
      ],
      problemStatus: t('landingCopy_entrada_vaga'),
      transitionLabel: t('landingCopy_a_ia_estrutura'),
      furnaceTitle: t('landingCopy_organizando_contexto'),
      furnaceBody: t('landingCopy_analisando_estruturando_e_refinando_a'),
      storyLabel: t('landingCopy_user_story_estruturada'),
      storyTitle: t('landingCopy_validar_dominio_corporativo_no_onboarding'),
      outputPills: [t('landingCopy_objetivo'), t('landingCopy_criterios'), 'QA'],
      objectiveLabel: t('landingCopy_objetivo'),
      objective:
        t('landingCopy_validar_dominio_elegivel_antes_de'),
      criteriaLabel: t('landingCopy_criterios_de_aceite'),
      criteria: [
        t('landingCopy_bloquear_avanco_com_dominio_em'),
        t('landingCopy_exibir_mensagem_orientando_a_correcao'),
      ],
      qualityLabel: t('landingCopy_nivel_de_refinamento'),
      qualityValue: '82%',
      readyLabel: t('landingCopy_pronta'),
      gapsLabel: t('landingCopy_gaps_para_decidir'),
      gaps: [t('landingCopy_confirmar_excecoes_para_dominios_parceiros')],
      qaLabel: t('landingCopy_inspecao_final'),
      qa: [
        t('landingCopy_testar_dominio_valido_invalido_e'),
      ],
      footerHighlights: [t('landingCopy_objetivo_claro'), t('landingCopy_checklist_pronto')],
    },
  },
  workflow: {
    eyebrow: t('landingCopy_como_funciona'),
    title: t('landingCopy_do_briefing_confuso_a_user'),
    description:
      t('landingCopy_uma_sequencia_curta_para_organizar'),
    steps: [
      {
        step: '01',
        title: t('landingCopy_cole_o_contexto_real'),
        description:
      t('landingCopy_cole_a_demanda_como_ela'),
      },
      {
        step: '02',
        title: t('landingCopy_a_ia_organiza'),
        description:
          t('landingCopy_o_prodforge_estrutura_objetivo_user'),
      },
      {
        step: '03',
        title: t('landingCopy_receba_a_user_story_pronta'),
        description:
          t('landingCopy_revise_com_mais_clareza_antes'),
      },
    ],
  },
  beforeAfter: {
    eyebrow: t('landingCopy_antes_e_depois'),
    title: t('landingCopy_menos_ruido_mais_clareza_entregas'),
    description:
      t('landingCopy_veja_como_uma_demanda_solta'),
    transition: {
      copy: t('landingCopy_a_ia_transforma_contexto_solto'),
      label: t('landingCopy_transformacao_de_demanda_vaga_em'),
    },
    before: {
      label: t('landingCopy_antes'),
      title: t('landingCopy_demanda_vaga'),
      story: t('landingCopy_melhorar_onboarding_para_empresas_e'),
      issues: [
        t('landingCopy_nao_diz_qual_problema_precisa'),
        t('landingCopy_nao_define_o_comportamento_esperado'),
        t('landingCopy_nao_traz_criterios_de_aceite'),
      ],
    },
    after: {
      label: t('landingCopy_depois'),
      statusLabel: t('landingCopy_pronto_para_refinamento'),
      title: t('landingCopy_user_story_estruturada'),
      indicators: [t('landingCopy_objetivo_claro'), t('landingCopy_user_story'), t('landingCopy_criterios_de_aceite'), t('landingCopy_gaps_identificados')],
      objective:
        t('landingCopy_reduzir_cadastros_inconsistentes_e_dar'),
      story:
        t('landingCopy_como_pessoa_responsavel_pelo_cadastro'),
      criteria: [
        t('landingCopy_permitir_avanco_apenas_quando_o'),
        t('landingCopy_exibir_mensagem_clara_quando_o'),
      ],
      notes: t('landingCopy_gap_visivel_confirmar_a_lista'),
      scoreLabel: t('landingCopy_pronta_para_priorizar'),
      scoreValue: '91%',
    },
  },
  benefits: {
    eyebrow: t('landingCopy_produto_desenvolvimento_e_qa'),
    title: t('landingCopy_cada_papel_com_menos_ruido'),
    description:
      t('landingCopy_a_prodforge_transforma_briefing_confuso'),
    items: [
      {
        role: 'PM/PO',
        tone: 'pm',
        image: 'pm-strategist-forge',
        imageAlt: t('landingCopy_estrategista_de_produto_representando_clareza'),
        title: t('landingCopy_pm_po_estrategia_sem_perder'),
        description: t('landingCopy_organize_problema_objetivo_impacto_e'),
        benefits: [
          t('landingCopy_menos_briefing_solto'),
          t('landingCopy_mais_clareza_de_decisao'),
          t('landingCopy_melhor_alinhamento_com_negocio'),
        ],
      },
      {
        role: 'Dev',
        tone: 'dev',
        image: 'dev-forgemaster-blade',
        imageAlt: t('landingCopy_engenheiro_representando_implementacao_clara_com'),
        title: t('landingCopy_dev_implementacao_com_menos_adivinhacao'),
        description: t('landingCopy_receba_historias_com_comportamento_esperado'),
        benefits: [
          t('landingCopy_menos_retrabalho'),
          t('landingCopy_menos_duvida_no_refinamento'),
          t('landingCopy_mais_previsibilidade_tecnica'),
        ],
      },
      {
        role: 'QA',
        tone: 'qa',
        image: 'qa-guardian-shield',
        imageAlt: t('landingCopy_guardiao_de_qualidade_representando_validacao'),
        title: t('landingCopy_qa_validacao_antes_do_problema'),
        description: t('landingCopy_use_criterios_e_cenarios_mais'),
        benefits: [
          t('landingCopy_criterios_mais_testaveis'),
          t('landingCopy_excecoes_mais_visiveis'),
          t('landingCopy_menos_falhas_escapando'),
        ],
      },
    ],
  },
  learningTeaser: {
    eyebrow: t('landingCopy_campo_de_treino_prodforge'),
    title: t('landingCopy_aprenda_enquanto_faz'),
    description:
      t('landingCopy_guias_praticos_para_entender_o'),
    footer:
      t('landingCopy_cada_guia_traz_um_caminho'),
  },
  pricing: {
    eyebrow: t('landingCopy_planos'),
    title: t('landingCopy_comece_gratis_escale_quando_precisar'),
    description: t('landingCopy_comece_sem_cartao_evolua_quando'),
    free: {
      name: FREE_PLAN_NAME,
      badge: t('landingCopy_gratis'),
      description: t('landingCopy_para_validar_o_fluxo_com'),
      items: [
        t('landingCopy_geracoes_de_user_story_por', { p1: FREE_GENERATION_LIMIT }),
        t('landingCopy_historico_de_pecas_forjadas_por'),
        t('landingCopy_inspecao_basica_com_score_trincas'),
      ],
    },
    pro: {
      name: PRO_PLAN_NAME,
      badge: t('landingCopy_mais_popular'),
      description: t('landingCopy_para_times_que_precisam_de'),
      items: [
        t('landingCopy_mais_geracoes_e_versoes_por'),
        t('landingCopy_comparacao_de_versoes_e_formatos'),
        t('landingCopy_padroes_do_time_templates_e'),
      ],
    },
  },
  leadCapture: {
    eyebrow: t('landingCopy_interesse_no_plano', { p1: PRO_PLAN_NAME }),
    title: t('landingCopy_quer_testar_o_plano', { p1: PRO_PLAN_NAME }),
    description:
      t('landingCopy_construido_para_pms_e_pos'),
    formTitle: t('landingCopy_entre_na_lista_de_interesse'),
    formDescription:
      t('landingCopy_cadastre_seu_e_mail_para', { p1: PRO_PLAN_NAME }),
    buttonLabel: t('landingCopy_avise_quando_abrir'),
    note: t('landingCopy_sem_spam_apenas_novidades_relevantes'),
  },
  faq: {
    eyebrow: t('landingCopy_duvidas_rapidas'),
    title: t('landingCopy_antes_de_abrir_a_bancada'),
    description:
      t('landingCopy_respostas_diretas_para_testar_a'),
    items: [
      {
        question: t('landingCopy_preciso_cadastrar_cartao_para_testar'),
        answer: t('landingCopy_nao_voce_pode_comecar_gratis'),
      },
      {
        question: t('landingCopy_a_prodforge_substitui_o_pm'),
        answer:
          t('landingCopy_nao_a_ia_estrutura_o'),
      },
      {
        question: t('landingCopy_posso_usar_com_devs_e'),
        answer:
          t('landingCopy_sim_a_saida_da_prodforge'),
      },
      {
        question: t('landingCopy_meus_briefings_ficam_salvos'),
        answer:
          t('landingCopy_as_pecas_geradas_podem_ser'),
      },
      {
        question: t('landingCopy_a_prodforge_ja_tem_integracao'),
        answer:
          t('landingCopy_ainda_nao_ha_integracao_direta'),
      },
      {
        question: t('landingCopy_o_que_e_uma_peca'),
        answer:
          t('landingCopy_e_a_user_story_estruturada'),
      },
    ],
  },
  finalCta: {
    eyebrow: t('landingCopy_pronto_para_comecar'),
    title: t('landingCopy_pronto_para_transformar_seu_briefing'),
    description:
      t('landingCopy_organize_briefing_contexto_e_criterios'),
  },
})
