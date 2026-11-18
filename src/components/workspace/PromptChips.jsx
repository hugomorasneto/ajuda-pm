import { useCopy } from '../../i18n/context'
function PromptChips({ label, items, onSelect, itemActionLabel }) {
  const t = useCopy('forge')
  if (!Array.isArray(items) || items.length === 0) return null

  const actionLabel = itemActionLabel ?? t('insert_suggestion')

  return (
    <div className="prompt-chips" aria-label={label}>
      {items.map((item) => (
        <button
          key={t(item.label)}
          type="button"
          className="prompt-chip"
          onClick={() => onSelect(t(item.text))}
          aria-label={`${actionLabel}: ${t(item.label)}`}
        >
          {t(item.label)}
        </button>
      ))}
    </div>
  )
}

export default PromptChips
