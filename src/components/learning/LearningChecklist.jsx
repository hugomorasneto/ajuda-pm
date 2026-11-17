import { useCopy } from '../../i18n/context'
function LearningChecklist({ items }) {
  const t = useCopy('learning')
  return (
    <section className="learning-guide-block learning-guide-checklist" id="checklist">
      <div className="learning-guide-block__header">
        <span className="badge-pill badge-pill--success">{t('checklistBadge')}</span>
        <h2>{t('checklistTitle')}</h2>
      </div>

      <ol className="learning-guide-checklist__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  )
}

export default LearningChecklist
