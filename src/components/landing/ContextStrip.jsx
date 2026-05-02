const ICONS = {
  bolt: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M8 1.5L3 8h4.5L6 12.5l5-7H7L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  layers: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5L1.5 5 7 8.5 12.5 5 7 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M1.5 8.5L7 12l5.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  unlock: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2.5" y="6.5" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6.5V4a2.5 2.5 0 015 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
}

function ContextStrip({ items }) {
  return (
    <div className="context-strip" role="list" aria-label="Destaques do produto">
      {items.map((item, i) => (
        <div key={item.label} className="context-strip__item" role="listitem">
          {i > 0 && <span className="context-strip__divider" aria-hidden="true" />}
          <span className="context-strip__icon">{ICONS[item.icon]}</span>
          <span className="context-strip__label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default ContextStrip
