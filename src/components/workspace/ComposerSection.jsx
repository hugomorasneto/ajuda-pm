function ComposerSection({ eyebrow, title, description, error, children, footer }) {
  return (
    <section className={`composer-section ${error ? 'composer-section--error' : ''}`}>
      <div className="composer-section__header">
        <div>
          {eyebrow ? <p className="composer-section__eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>

      <div className="composer-section__body">{children}</div>

      {footer ? <div className="composer-section__footer">{footer}</div> : null}
      {error ? <p className="field-error composer-section__error">{error}</p> : null}
    </section>
  )
}

export default ComposerSection
