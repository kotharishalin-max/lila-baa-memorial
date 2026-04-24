import './BesnuSection.css'
import TrackCard from './TrackCard.jsx'

export default function BesnuSection({ tracks }) {
  return (
    <section id="besnu" className="besnu section">
      <div className="section-inner">
        <p className="section-label">Besnu</p>
        <h2 className="besnu-heading">
          The recordings.
          <br />
          <span className="besnu-subheading">
            25 tracks · Sindhu Bhawan Hall, Ahmedabad · April 20, 2026
          </span>
        </h2>

        <p className="besnu-intro prose">
          The besnu opened with Sanskrit invocations and closed with a
          traditional shradhanjali prayer. In between: twenty bhajans from the
          Gujarati, Hindi, and Pushtimarg traditions, four family tributes —
          her son, her son-in-law, and her granddaughter speaking in turn — and
          a song Shalin sang for his grandmother.
        </p>
        <p className="besnu-intro-hint prose">
          Tap any track to open it. Lyrics are available in Gujarati script,
          romanized English, and a short meaning.
        </p>

        <ol className="track-list">
          {tracks.map((t) => (
            <TrackCard key={t.number} track={t} />
          ))}
        </ol>
      </div>
    </section>
  )
}
