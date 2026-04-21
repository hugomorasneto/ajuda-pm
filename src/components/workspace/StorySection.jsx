function StorySection({ eyebrow, title, actions, emphasis = false, children }) {
  return (
    <article className={`story-section ${emphasis ? 'story-section--emphasis' : ''}`}>
      <div className="story-section__header">
        <div>
          {eyebrow ? <p className="story-section__eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
        </div>
        {actions ? <div className="story-section__actions">{actions}</div> : null}
      </div>
      <div className="story-section__body">{children}</div>
    </article>
  )
}

export default StorySection
