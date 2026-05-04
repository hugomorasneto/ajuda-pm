export const QUICK_TEMPLATES = [
  {
    id: 'recuperacao-senha',
    label: 'Recuperação de senha',
    emoji: '🔑',
    context:
      'Usuários não conseguem recuperar senha em dispositivos mobile. O link enviado por e-mail não funciona no app nativo e o suporte está recebendo muitos chamados sobre isso.',
    requirements:
      'Link de recuperação deve funcionar no app mobile e no browser.\nLink expira em 24h.\nUsuário não perde dados da sessão ativa.\nCompatível com iOS e Android.',
  },
  {
    id: 'onboarding-b2b',
    label: 'Validação de domínio B2B',
    emoji: '🏢',
    context:
      'O onboarding B2B está gerando cadastros inconsistentes porque o domínio corporativo do e-mail não é validado durante o registro. A operação precisa revisar manualmente cada cadastro.',
    requirements:
      'Validar formato do domínio antes de avançar.\nBloquear domínios genéricos como gmail e hotmail.\nExibir mensagem de erro clara sem perder dados preenchidos.\nRegistrar tentativas inválidas para análise.',
  },
  {
    id: 'filtro-busca',
    label: 'Filtro de busca combinável',
    emoji: '🔍',
    context:
      'Usuários não conseguem filtrar a listagem por categoria e faixa de preço ao mesmo tempo. Ao aplicar um filtro, o outro é redefinido, gerando frustração e abandono da busca.',
    requirements:
      'Filtros combináveis sem redefinir seleções anteriores.\nResultado atualizado sem recarregar a página.\nPersistir filtros ativos na URL para compartilhamento.\nBotão para limpar todos os filtros de uma vez.',
  },
  {
    id: 'notificacao-pagamento',
    label: 'Confirmação de pagamento',
    emoji: '💳',
    context:
      'Clientes não recebem confirmação após um pagamento aprovado. Muitos abrem chamado no suporte achando que o pagamento falhou, gerando retrabalho operacional desnecessário.',
    requirements:
      'E-mail de confirmação com resumo do pagamento em até 2 minutos.\nLink para recibo no corpo do e-mail.\nPush notification no app se o usuário tiver notificações ativas.\nRegistrar falha de envio para reprocessamento.',
  },
]
