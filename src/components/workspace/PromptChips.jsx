function PromptChips({ label, items, onSelect, itemActionLabel = 'Inserir sugestão' }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className="prompt-chips" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="prompt-chip"
          onClick={() => onSelect(item.text)}
          aria-label={`${itemActionLabel}: ${item.label}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default PromptChips
