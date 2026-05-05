import { Link } from 'react-router-dom'
import { QUICK_TEMPLATES } from './workspaceTemplates'

function WorkspaceEmptyState({ hasDraft, onApplyTemplate }) {
  if (hasDraft) {
    return (
      <section className="panel workspace-state workspace-state--empty workspace-state--forge-visual">
        <div className="workspace-state__content">
          <div className="workspace-state__icon" aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
              <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
            </svg>
          </div>
          <div className="workspace-state__copy">
            <h2>Parece que você tem algo em mente.</h2>
            <p>
              Clique em <strong>Forjar primeira versão</strong> para transformar a matéria-prima,
              seu briefing ou demanda inicial, em uma user story estruturada.
            </p>
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
    <section className="panel workspace-state workspace-state--empty workspace-state--forge-visual">
      <div className="workspace-state__content">
        <div className="workspace-state__icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
            <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z" />
          </svg>
        </div>

        <div className="workspace-state__copy">
          <h2>Descreva a matéria-prima da story.</h2>
          <p>
            Matéria-prima é o briefing, problema ou demanda inicial. Descreva o usuário impactado
            e as regras do produto. A ProdForge transforma
            esse insumo em uma user story pronta para refino.
          </p>
        </div>

        <div className="ws-templates">
          <p className="ws-templates__label">Começar com um exemplo</p>
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

        <div className="workspace-state__divider" aria-hidden="true">
          <span>ou</span>
        </div>

        <div className="workspace-state__actions">
          <a className="btn btn-secondary btn-small" href="#workspace-context">
            Começar do zero
          </a>
        </div>

        <div className="workspace-state__learn-link">
          <span>Quer melhorar sua primeira story?</span>
          <Link to="/aprender/user-stories-na-pratica" className="workspace-state__learn-cta">
            Ver guia prático -&gt;
          </Link>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
