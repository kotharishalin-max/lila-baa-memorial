import './AboutBaa.css'

export default function AboutBaa({ bio }) {
  return (
    <section id="about" className="about section">
      <div className="section-inner">
        <p className="section-label">About</p>
        <h2 className="about-heading">
          For Ba. For Liba.
          <br />
          <span className="about-subheading">
            Four days after she reached Shriji's feet.
          </span>
        </h2>

        <div className="prose">
          {bio.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <dl className="about-facts">
          <div>
            <dt>Besnu</dt>
            <dd>
              {bio.besnu.display}
              <span className="fact-note">{bio.besnu.venue}</span>
            </dd>
          </div>
          <div>
            <dt>Passed on</dt>
            <dd>
              {bio.passedOn.display}
              <span className="fact-note">{bio.passedOn.age}</span>
            </dd>
          </div>
          <div>
            <dt>Family</dt>
            <dd>
              {bio.counts.children} children
              <span className="fact-note">
                {bio.counts.grandchildren} grandchildren ·{' '}
                {bio.counts.greatGrandchildren} great-grandchildren
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
