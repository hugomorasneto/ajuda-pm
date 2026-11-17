import { useCopy } from '../../i18n/context'
function WorkspaceEmptyState({ hasDraft }) {
  const t = useCopy('forge')
  return (
    <section className="panel workspace-state workspace-state--empty workspace-state--compact workspace-state--pre-forge">
      <div className="workspace-state__content">
        <div className="workspace-state__copy">
          <p className="workspace-state__eyebrow">{t('after_generation')}</p>
          <h2>{hasDraft ? t('ready_to_show_the_first_version') : t('the_result_and_inspection_appear_here')}</h2>
          <p>{t('after_generation_find_the_first_version')}</p>
        </div>
      </div>
    </section>
  )
}

export default WorkspaceEmptyState
