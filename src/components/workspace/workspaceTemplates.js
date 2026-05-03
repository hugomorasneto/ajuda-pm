export const QUICK_TEMPLATES = [
  {
    id: 'recuperacao-senha',
    label: 'Recuperacao de senha',
    emoji: '🔑',
    context:
      'Usuarios nao conseguem recuperar senha em dispositivos mobile. O link enviado por e-mail nao funciona no app nativo e o suporte esta recebendo muitos chamados sobre isso.',
    requirements:
      'Link de recuperacao deve funcionar no app mobile e no browser.\nLink expira em 24h.\nUsuario nao perde dados da sessao ativa.\nCompativel com iOS e Android.',
  },
  {
    id: 'onboarding-b2b',
    label: 'Validacao de dominio B2B',
    emoji: '🏢',
    context:
      'O onboarding B2B esta gerando cadastros inconsistentes porque o dominio corporativo do e-mail nao e validado durante o registro. A operacao precisa revisar manualmente cada cadastro.',
    requirements:
      'Validar formato do dominio antes de avancar.\nBloquear dominios genericos como gmail e hotmail.\nExibir mensagem de erro clara sem perder dados preenchidos.\nRegistrar tentativas invalidas para analise.',
  },
  {
    id: 'filtro-busca',
    label: 'Filtro de busca combinavel',
    emoji: '🔍',
    context:
      'Usuarios nao conseguem filtrar a listagem por categoria e faixa de preco ao mesmo tempo. Ao aplicar um filtro, o outro e resetado, gerando frustracao e abandono da busca.',
    requirements:
      'Filtros combinaveis sem resetar selecoes anteriores.\nResultado atualizado sem recarregar a pagina.\nPersistir filtros ativos na URL para compartilhamento.\nBotao para limpar todos os filtros de uma vez.',
  },
  {
    id: 'notificacao-pagamento',
    label: 'Confirmacao de pagamento',
    emoji: '💳',
    context:
      'Clientes nao recebem confirmacao apos um pagamento aprovado. Muitos abrem chamado no suporte achando que o pagamento falhou, gerando retrabalho operacional desnecessario.',
    requirements:
      'E-mail de confirmacao com resumo do pagamento em ate 2 minutos.\nLink para recibo no corpo do e-mail.\nPush notification no app se o usuario tiver notificacoes ativas.\nRegistrar falha de envio para reprocessamento.',
  },
]
