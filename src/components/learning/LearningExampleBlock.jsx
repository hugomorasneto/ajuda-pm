function LearningExampleBlock({ example }) {
  return (
    <section className="learning-guide-block learning-guide-example" id="exemplo">
      <div className="learning-guide-block__header">
        <span className="badge-pill">Exemplo real</span>
        <h2>{example.title}</h2>
      </div>

      <div className="learning-guide-example__body">
        <p>{example.summary}</p>
        <ul>
          {example.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <p className="learning-guide-example__result">{example.result}</p>
      </div>
    </section>
  )
}

export default LearningExampleBlock
