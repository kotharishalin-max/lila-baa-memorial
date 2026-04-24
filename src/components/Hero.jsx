import './Hero.css'

// Public folder asset — Vite prefixes with BASE_URL automatically at build time
const heroImg = `${import.meta.env.BASE_URL}hero/lila-baa.jpg`

export default function Hero({ bio }) {
  return (
    <header className="hero">
      <div className="hero-image-wrap">
        <img
          className="hero-image"
          src={heroImg}
          alt="Lila Baa — Lilavatiben Champaklal Kothari — in a lavender garden"
          loading="eager"
          fetchPriority="high"
        />
        <div className="hero-scrim" aria-hidden="true" />
      </div>
      <div className="hero-content">
        <p className="hero-kicker">In loving memory</p>
        <h1 className="hero-name">
          <span className="hero-name-given">Lila Baa</span>
          <span className="hero-name-full">{bio.fullName}</span>
        </h1>
        <p className="hero-aka">
          <em>Ba</em> to her children and grandchildren · <em>Liba</em> to her
          great-grandchildren
        </p>
        <p className="hero-dates">
          Passed on {bio.passedOn.display} · {bio.passedOn.age}
        </p>
        <nav className="hero-nav" aria-label="Jump to section">
          <a href="#about">About</a>
          <a href="#family">Family</a>
          <a href="#besnu">Besnu</a>
          <a href="#photos">Photos</a>
        </nav>
      </div>
    </header>
  )
}
