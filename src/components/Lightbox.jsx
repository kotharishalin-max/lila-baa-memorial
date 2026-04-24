import { useEffect, useRef } from 'react'
import './Lightbox.css'

export default function Lightbox({ items, index, onClose, onNext, onPrev }) {
  const item = items[index]
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft') onPrev()
    }
    document.addEventListener('keydown', onKey)
    // Prevent body scroll while open
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, onNext, onPrev])

  if (!item) return null

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => {
        // Close when clicking on the backdrop, not on the inner content
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <button
        type="button"
        className="lightbox-nav lightbox-prev"
        onClick={onPrev}
        aria-label="Previous"
      >
        ‹
      </button>

      <div className="lightbox-stage" ref={dialogRef}>
        {item.type === 'video' ? (
          <video
            key={item.id}
            className="lightbox-media"
            src={item.url}
            controls
            autoPlay
            playsInline
            poster={item.thumbUrl}
          />
        ) : (
          <img
            key={item.id}
            className="lightbox-media"
            src={item.url}
            alt={item.caption || item.originalName || item.filename}
          />
        )}
        <div className="lightbox-caption">
          {item.caption && <p className="caption-text">{item.caption}</p>}
          <p className="caption-meta">
            {item.uploader && <span>{item.uploader}</span>}
            {item.uploader && item.timestamp && <span className="sep"> · </span>}
            {item.timestamp && (
              <span>{new Date(item.timestamp).toLocaleDateString()}</span>
            )}
            <span className="sep"> · </span>
            <a
              href={item.url}
              download={item.originalName || item.filename}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </p>
        </div>
      </div>

      <button
        type="button"
        className="lightbox-nav lightbox-next"
        onClick={onNext}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  )
}
