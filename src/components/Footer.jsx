import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-line">
          <em>In loving memory.</em>
        </p>
        <p className="footer-sub">
          Built by Shalin · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
