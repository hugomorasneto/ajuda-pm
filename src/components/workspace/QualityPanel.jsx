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
        <div className="quality-panel__empty">
          <p className="quality-panel__eyebrow">Painel de revisão</p>
          <h2>Qualidade, gaps e exportações aparecem aqui.</h2>
          <p>
            Gere uma user story para visualizar a pontuação de revisão, checklist de QA e ações de
            exportação no mesmo fluxo.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="panel quality-panel">
      <header className="quality-panel__header">
        <div>
          <p className="quality-panel__eyebrow">Painel de revisão</p>
          <h2>Qualidade e ações</h2>
        </div>
        <p className="quality-panel__intro">
          Use este painel para revisar a consistência da user story antes de exportar.
        </p>
      </header>

      <QualityScore story={story} />

      <section className={`quality-panel__block quality-panel__usage ${hasReachedLimit ? 'quality-panel__usage--warning' : ''}`}>
        <div className="quality-panel__block-header">
          <div>
            <p className="quality-panel__eyebrow">Plano</p>
            <h3>{isPremium ? 'Premium' : 'Free'}</h3>
          </div>
        </div>

        <p className="quality-panel__usage-copy">
          {isPremium
            ? 'Seu plano está com gerações liberadas.'
            : `Você usou ${usageCount}/${freeGenerationLimit} gerações. Restam ${remainingGenerations} nesta conta.`}
        </p>
      </section>

      <ExportActionsBar
        story={story}
        onCopyPlain={onCopyPlain}
        plainCopyMessage={plainCopyMessage}
        isCopyingPlain={isCopyingPlain}
      />

      <GapList items={story.gaps} />
      <QaChecklist items={story.qa_checklist} />
    </aside>
  )
}

export default QualityPanel
