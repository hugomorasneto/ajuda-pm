function ComposerSection({ icon, label, error, children, footer }) {
  return (
    <section className={`composer-section ${error ? 'composer-section--error' : ''}`}>
      {(icon || label) && (
        <div className="composer-section__header">
          {icon && <span className="composer-section__icon">{icon}</span>}
          {label && <h3 className="composer-section__label">{label}</h3>}
        </div>
      )}

      <div className="composer-section__body">{children}</div>

      {footer ? <div className="composer-section__footer">{footer}</div> : null}
      {error ? <p className="field-error composer-section__error">{error}</p> : null}
    </section>
  )
}

export default ComposerSection
