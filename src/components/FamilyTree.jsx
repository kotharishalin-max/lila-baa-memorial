import './FamilyTree.css'

export default function FamilyTree({ childrenList, namedInEulogies }) {
  return (
    <section id="family" className="family section">
      <div className="section-inner">
        <p className="section-label">Family</p>
        <h2 className="family-heading">The people she leaves behind</h2>

        <div className="family-children">
          {childrenList.map((c) => (
            <article className="family-card" key={c.name}>
              <p className="family-relation">{c.relation}</p>
              <p className="family-name">{c.name}</p>
              <p className="family-spouse">
                <span className="amp">&amp;</span> {c.spouse}
              </p>
              {c.note && <p className="family-note">{c.note}</p>}
            </article>
          ))}
        </div>

        <div className="family-named">
          <h3>Named in the speeches</h3>
          <p className="family-named-intro">
            Grandchildren and great-grandchildren remembered by name during the
            besnu:
          </p>
          <dl>
            <div>
              <dt>Grandchildren</dt>
              <dd>
                <ul>
                  {namedInEulogies.grandchildren.map((g) => (
                    <li key={g.name}>
                      <strong>{g.name}</strong> — {g.note}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Great-grandchildren</dt>
              <dd>
                <ul>
                  {namedInEulogies.greatGrandchildren.map((g) => (
                    <li key={g.name}>
                      <strong>{g.name}</strong> — {g.note}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Extended family (Barai household)</dt>
              <dd>{namedInEulogies.extendedFamily.join(' · ')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
