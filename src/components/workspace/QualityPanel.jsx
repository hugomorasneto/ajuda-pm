import ExportActionsBar from './ExportActionsBar'
import GapList from './GapList'
import QaChecklist from './QaChecklist'
import QualityScore from './QualityScore'

function QualityPanel({
  story,
  isPremium,
  usageCount,
  remainingGenerations,
  freeGenerationLimit,
  hasReachedLimit,
  onCopyPlain,
  plainCopyMessage,
  isCopyingPlain,
}) {
  if (!story) {
    return (
      <aside className="panel quality-panel quality-panel--empty">
        <div className="quality-panel__header quality-panel__header--empty">
          <div>
            <p className="quality-panel__eyebrow">Painel de revisão</p>
            <h2>Revise qualidade, gaps e exportações no mesmo fluxo.</h2>
          </div>
          <p className="quality-panel__intro">
            Quando a primeira versão ficar pronta, este painel mostra o que falta decidir antes de
            enviar a user story para backlog, dev e QA.
          </p>
        </div>

        <section className="quality-score quality-score--placeholder">
          <div className="quality-score__header">
            <div>
              <p className="quality-panel__eyebrow">Qualidade</p>
              <h3>Pontuação de revisão</h3>
            </div>
            <strong className="quality-score__value">--</strong>
          </div>
          <div className="quality-score__bar" aria-hidden="true">
            <span className="quality-score__bar-fill" style={{ width: '36%' }} />
          </div>
          <p className="quality-score__note">
            O score aparece depois da geração para indicar se a base já está pronta para revisão.
          </p>
        </section>

        <div className="quality-panel__empty-grid">
          <section className="quality-panel__block">
            <div className="quality-panel__block-header">
              <div>
                <p className="quality-panel__eyebrow">Gaps</p>
                <h3>O que ainda pede decisão</h3>
              </div>
            </div>
            <p className="quality-panel__empty-note">
              Ambiguidades, exceções e dependências críticas aparecem aqui.
            </p>
          </section>

          <section className="quality-panel__block">
            <div className="quality-panel__block-header">
              <div>
                <p className="quality-panel__eyebrow">QA</p>
                <h3>Checklist de validação</h3>
              </div>
            </div>
            <p className="quality-panel__empty-note">
              O painel destaca cenários importantes para validar antes da entrega.
            </p>
          </section>

          <section className="quality-panel__block">
            <div className="quality-panel__block-header">
              <div>
                <p className="quality-panel__eyebrow">Exportar</p>
                <h3>Pronto para compartilhar</h3>
              </div>
            </div>
            <p className="quality-panel__empty-note">
              Copie em Markdown, formato Jira ou texto simples quando a revisão estiver concluída.
            </p>
          </section>
        </div>
      </aside>
    )
  }

  return (
    <aside className="panel quality-panel">
      <header className="quality-panel__header">
        <div>
          <p className="quality-panel__eyebrow">Painel de revisão</p>
          <h2>Revise antes de exportar</h2>
        </div>
        <p className="quality-panel__intro">
          Use este painel para validar clareza, pendências e ações antes de compartilhar a user story.
        </p>
      </header>

      <QualityScore story={story} />

      <GapList items={story.gaps} />
      <QaChecklist items={story.qa_checklist} />

      <ExportActionsBar
        story={story}
        onCopyPlain={onCopyPlain}
        plainCopyMessage={plainCopyMessage}
        isCopyingPlain={isCopyingPlain}
      />

      <section
        className={`quality-panel__block quality-panel__usage ${hasReachedLimit ? 'quality-panel__usage--warning' : ''}`}
      >
        <div className="quality-panel__block-header">
          <div>
            <p className="quality-panel__eyebrow">Plano</p>
            <h3>{isPremium ? 'Pro' : 'Free'}</h3>
          </div>
        </div>

        <p className="quality-panel__usage-copy">
          {isPremium
            ? 'Seu plano está com gerações liberadas.'
            : `Você usou ${usageCount}/${freeGenerationLimit} gerações. Restam ${remainingGenerations} nesta conta.`}
        </p>
      </section>
    </aside>
  )
}

export default QualityPanel
