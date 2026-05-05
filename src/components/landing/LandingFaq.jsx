import { useId, useState } from 'react'

function LandingFaq({ content }) {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState(0)

  if (!content?.items?.length) return null

  return (
    <section className="landing-section landing-faq" aria-labelledby="landing-faq-title">
      <div className="landing-section__intro">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2 id="landing-faq-title">{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-faq__grid">
        {content.items.map((item, index) => {
          const isOpen = openIndex === index
          const triggerId = `${baseId}-trigger-${index}`
          const panelId = `${baseId}-panel-${index}`

          return (
            <article className="landing-faq__item forge-panel forge-panel--metal" key={item.question}>
              <button
                type="button"
                className="landing-faq__trigger"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span>{item.question}</span>
                <span className="landing-faq__icon" aria-hidden="true">
                  {isOpen ? '-' : '+'}
                </span>
              </button>

              <div
                className="landing-faq__answer"
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
              >
                <p>{item.answer}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default LandingFaq
