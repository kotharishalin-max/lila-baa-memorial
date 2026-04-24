import { useCallback, useEffect, useState } from 'react'
import Lightbox from './Lightbox.jsx'
import UploadDropzone from './UploadDropzone.jsx'
import './PhotoGallery.css'

const MANIFEST_URL =
  'https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/manifest.json'

async function fetchManifest() {
  // Bust cache so newly uploaded photos appear soon after upload.
  const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`)
  return await res.json()
}

export default function PhotoGallery() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const loadManifest = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchManifest()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadManifest()
  }, [loadManifest])

  const openLightbox = (i) => setLightboxIndex(i)
  const closeLightbox = () => setLightboxIndex(null)
  const nextLightbox = () =>
    setLightboxIndex((i) => (i == null ? i : (i + 1) % items.length))
  const prevLightbox = () =>
    setLightboxIndex((i) =>
      i == null ? i : (i - 1 + items.length) % items.length,
    )

  return (
    <section id="photos" className="photos section">
      <div className="section-inner">
        <p className="section-label">Photos</p>
        <h2 className="photos-heading">A family album</h2>
        <p className="photos-intro prose">
          Photographs family members shared of Ba — in gardens, in kitchens, at
          gatherings, in quiet moments. Click any image to view full size. If
          you have your own photos of Ba, please add them.
        </p>

        <div className="photos-toolbar">
          <button
            type="button"
            className="photos-upload-btn"
            onClick={() => setShowUpload(true)}
          >
            + Add your photos
          </button>
          <span className="photos-count">
            {loading ? 'Loading…' : `${items.length} photos`}
          </span>
        </div>

        {error && (
          <div className="photos-error">
            Couldn't load the gallery: {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="photos-empty">
            No photos yet. Be the first to add one.
          </div>
        )}

        {items.length > 0 && (
          <div className="photos-grid">
            {items.map((item, i) => (
              <button
                type="button"
                key={item.id}
                className={`photo-tile ${item.type === 'video' ? 'is-video' : ''}`}
                onClick={() => openLightbox(i)}
                aria-label={
                  item.type === 'video'
                    ? `Open video ${item.originalName ?? item.filename}`
                    : `Open photo ${item.originalName ?? item.filename}`
                }
              >
                <img
                  src={item.thumbUrl}
                  alt=""
                  loading="lazy"
                  draggable="false"
                />
                {item.type === 'video' && (
                  <span className="video-badge" aria-hidden="true">
                    ▶
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex != null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextLightbox}
          onPrev={prevLightbox}
        />
      )}

      {showUpload && (
        <UploadDropzone
          existingItems={items}
          onClose={() => setShowUpload(false)}
          onUploadComplete={loadManifest}
        />
      )}
    </section>
  )
}
