import { Link } from 'react-router-dom'

const QUICK_TEMPLATES = [
  {
    id: 'recuperacao-senha',
    label: 'Recuperação de senha',
    emoji: '🔑',
    context:
      'Usuários não conseguem recuperar senha em dispositivos mobile. O link enviado por e-mail não funciona no app nativo e o suporte está recebendo muitos chamados sobre isso.',
    requirements:
      'Link de recuperação deve funcionar no app mobile e no browser. Link expira em 24h. Usuário não perde dados da sessão ativa. Compatível com iOS e Android.',
  },
  {
    id: 'onboarding-b2b',
    label: 'Validação de domínio B2B',
    emoji: '🏢',
    context:
      'O onboarding B2B está gerando cadastros inconsistentes porque o domínio corporativo do e-mail não é validado durante o registro. A operação precisa revisar manualmente cada cadastro.',
    requirements:
      'Validar formato do domínio antes de avançar. Bloquear domínios genéricos como gmail e hotmail. Exibir mensagem de erro clara sem perder dados preenchidos. Registrar tentativas inválidas para análise.',
  },
  {
    id: 'filtro-busca',
    label: 'Filtro de busca combinável',
    emoji: '🔍',
    context:
      'Usuários não conseguem filtrar a listagem por categoria e faixa de preço ao mesmo tempo. Ao aplicar um filtro, o outro é resetado, gerando frustração e abandono da busca.',
    requirements:
      'Filtros combináveis sem resetar seleções anteriores. Resultado atualizado sem recarregar a página. Persistir filtros ativos na URL para compartilhamento. Botão para limpar todos os filtros de uma vez.',
  },
  {
    id: 'notificacao-pagamento',
    label: 'Confirmação de pagamento',
    emoji: '💳',
    context:
      'Clientes não recebem confirmação após um pagamento aprovado. Muitos abrem chamado no suporte achando que o pagamento falhou, gerando retrabalho operacional desnecessário.',
    requirements:
      'E-mail de confirmação com resumo do pagamento em até 2 minutos. Link para recibo no corpo do e-mail. Push notification no app se o usuário tiver notificações ativas. Registrar falha de envio para reprocessamento.',
  },
]

function WorkspaceEmptyState({ hasDraft, onApplyTemplate }) {
  if (hasDraft) {
    return (
      <section className="panel workspace-state workspace-state--empty">
        <div className="workspace-state__content">
          <div className="workspace-state__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
              <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
            </svg>
          </div>
          <div className="workspace-state__copy">
            <h2>Parece que você tem algo em mente.</h2>
            <p>Clique em <strong>Gerar Story</strong> para transformar o contexto em uma user story estruturada.</p>
          </div>
          <ul className="workspace-state__hints" aria-label="Dicas">
            <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> Seja específico</li>
            <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> Use exemplos reais</li>
            <li><span className="workspace-state__hint-mark" aria-hidden="true">✦</span> 1 problema por story</li>
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section className="panel workspace-state workspace-state--empty">
      <div className="workspace-state__content">
        <div className="workspace-state__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
            <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
          </svg>
        </div>

        <div className="workspace-state__copy">
          <h2>Cole seu contexto e gere a primeira versão.</h2>
          <p>
            Preencha o <strong>Contexto</strong> com o problema real e os{' '}
            <strong>Requisitos</strong> com regras e restrições — ou escolha um
            template abaixo para começar em segundos.
          </p>
        </div>

        {/* Templates rápidos */}
        <div className="ws-templates">
          <p className="ws-templates__label">Começar com um template</p>
          <div className="ws-templates__grid">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="ws-template-chip"
                onClick={() => onApplyTemplate?.(tpl)}
              >
                <span className="ws-template-chip__emoji" aria-hidden="true">{tpl.emoji}</span>
                <span className="ws-template-chip__label">{tpl.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ação manual */}
        <div className="workspace-state__divider" aria-hidden="true">
          <span>ou</span>
        </div>

        <div className="workspace-state__actions">
          <a className="btn btn-secondary btn-small" href="#workspace-context">
            Preencher do zero
          </a>
        </div>

        {/* Link Academia */}
        <div className="workspace-state__learn-link">
          <span>Nunca escreveu uma user story?</span>
          <Link to="/aprender/user-stories-na-pratica" className="workspace-state__learn-cta">
            Ver guia prático →
          </Link>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
