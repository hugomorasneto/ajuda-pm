export const getFaqCategories = (t) => [
  {
    id: 'sobre-o-prodforge',
    title: t('faqPage_sobre_o_prodforge'),
    description: t('faqPage_entenda_a_proposta_do_produto'),
    items: [
      {
        id: 'o-que-e-o-prodforge',
        question: t('faqPage_o_que_e_o_prodforge'),
        answer:
          t('faqPage_o_prodforge_e_uma_plataforma'),
      },
      {
        id: 'para-quem-foi-criado',
        question: t('faqPage_para_quem_o_prodforge_foi'),
        answer:
          t('faqPage_ele_foi_criado_para_pms'),
      },
      {
        id: 'iniciantes-em-produto',
        question: t('faqPage_posso_usar_o_prodforge_mesmo'),
        answer:
          t('faqPage_sim_o_prodforge_ajuda_a'),
      },
    ],
  },
  {
    id: 'uso-da-ia',
    title: t('faqPage_uso_da_ia'),
    description: t('faqPage_veja_como_a_inteligencia_artificial'),
    items: [
      {
        id: 'substitui-pm-ou-po',
        question: t('faqPage_o_prodforge_substitui_um_product'),
        answer:
          t('faqPage_nao_a_ia_funciona_como'),
      },
      {
        id: 'como-a-ia-ajuda',
        question: t('faqPage_como_a_ia_ajuda_na'),
        answer:
          t('faqPage_a_ia_pode_transformar_contexto'),
      },
    ],
  },
  {
    id: 'historias-de-usuario',
    title: t('faqPage_historias_de_usuario'),
    description: t('faqPage_duvidas_sobre_qualidade_revisao_e'),
    items: [
      {
        id: 'prontas-para-desenvolvimento',
        question: t('faqPage_as_historias_geradas_pela_ia'),
        answer:
          t('faqPage_elas_sao_uma_base_de'),
      },
      {
        id: 'informacoes-para-boa-historia',
        question: t('faqPage_que_tipo_de_informacao_eu'),
        answer:
          t('faqPage_informe_problema_objetivo_usuario_impactado'),
      },
    ],
  },
  {
    id: 'conta-e-acesso',
    title: t('faqPage_conta_e_acesso'),
    description: t('faqPage_informacoes_sobre_cadastro_uso_autenticado'),
    items: [
      {
        id: 'salva-historico',
        question: t('faqPage_o_prodforge_salva_meu_historico'),
        answer:
          t('faqPage_em_areas_autenticadas_o_prodforge'),
      },
    ],
  },
  {
    id: 'privacidade-e-dados',
    title: t('faqPage_privacidade_e_dados'),
    description: t('faqPage_orientacoes_rapidas_sobre_o_que'),
    items: [
      {
        id: 'dados-confidenciais',
        question: t('faqPage_posso_inserir_dados_confidenciais_estrategicos'),
        answer:
          t('faqPage_evite_inserir_dados_sensiveis_confidenciais'),
      },
      {
        id: 'alterar-preferencias',
        question: t('faqPage_como_altero_minhas_preferencias_de'),
        answer:
          t('faqPage_acesse_a_pagina_de_preferencias'),
        action: { label: t('faqPage_abrir_preferencias'), to: '/preferencias-de-privacidade' },
      },
    ],
  },
  {
    id: 'planos-e-limites',
    title: t('faqPage_planos_e_limites'),
    description: t('faqPage_o_que_ja_pode_existir'),
    items: [
      {
        id: 'versao-gratuita',
        question: t('faqPage_existe_versao_gratuita'),
        answer:
          t('faqPage_sim_o_produto_pode_oferecer'),
      },
      {
        id: 'recursos-premium',
        question: t('faqPage_quais_recursos_podem_ser_premium'),
        answer:
          t('faqPage_recursos_como_historico_avancado_projetos'),
      },
      {
        id: 'integracoes',
        question: t('faqPage_o_prodforge_se_integra_com'),
        answer:
          t('faqPage_integracoes_diretas_podem_entrar_no'),
      },
    ],
  },
  {
    id: 'suporte',
    title: t('faqPage_suporte'),
    description: t('faqPage_canais_para_tirar_duvidas_enviar'),
    items: [
      {
        id: 'entrar-em-contato',
        question: t('faqPage_como_entro_em_contato_em'),
        answer:
          t('faqPage_use_a_pagina_de_contato'),
        action: { label: t('faqPage_ir_para_contato'), to: '/contato' },
      },
    ],
  },
]
