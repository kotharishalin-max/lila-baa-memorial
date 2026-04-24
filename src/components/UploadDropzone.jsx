import { useCallback, useEffect, useRef, useState } from 'react'
import './UploadDropzone.css'

const API_URL = import.meta.env.VITE_UPLOAD_API_URL
const FULL_MAX = 2400
const THUMB_MAX = 400
const FULL_QUALITY = 0.85
const THUMB_QUALITY = 0.75
const MANIFEST_URL =
  'https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/manifest.json'
const MAX_FILE_BYTES = 60 * 1024 * 1024 // 60 MB (mostly matters for videos)

// ---- helpers ----
function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function shortHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}

async function resizeImage(file, maxEdge, quality) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  bitmap.close?.()
  return { blob, width: w, height: h }
}

async function presignPut(token, key) {
  const res = await fetch(`${API_URL}/${encodeURIComponent(token)}/${key}`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Upload URL request failed (${res.status}): ${body || 'no body'}`)
  }
  return res.json()
}

async function s3Put(url, blob, contentType) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`S3 PUT failed (${res.status}): ${body.slice(0, 200)}`)
  }
}

async function fetchCurrentManifest() {
  const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`)
  return await res.json()
}

// ---- component ----
export default function UploadDropzone({ existingItems, onClose, onUploadComplete }) {
  const [token, setToken] = useState(() => localStorage.getItem('lilaBaaToken') ?? '')
  const [uploader, setUploader] = useState(() => localStorage.getItem('lilaBaaUploader') ?? '')
  const [files, setFiles] = useState([]) // File[]
  const [status, setStatus] = useState('idle') // idle | uploading | done | error
  const [log, setLog] = useState([]) // {name, state, message}
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && status !== 'uploading') onClose()
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, status])

  const selectFiles = (fileList) => {
    const arr = Array.from(fileList)
    const filtered = arr.filter((f) => {
      const isImage = f.type.startsWith('image/')
      const isVideo = f.type.startsWith('video/')
      if (!isImage && !isVideo) return false
      if (f.size > MAX_FILE_BYTES) return false
      return true
    })
    setFiles(filtered)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) selectFiles(e.dataTransfer.files)
  }, [])

  const processFile = async (file, index) => {
    const updateLog = (state, message) => {
      setLog((prev) => {
        const next = [...prev]
        next[index] = { name: file.name, state, message }
        return next
      })
    }

    const isVideo = file.type.startsWith('video/')
    const ext = isVideo
      ? file.name.split('.').pop().toLowerCase() || 'mp4'
      : 'jpg'
    const stem = sanitize(file.name) || `upload-${Date.now()}`
    // Collision-resist with a short content-based hash
    const baseId = `${stem}-${shortHash(stem + file.size)}`
    const fullFilename = `${baseId}.${ext}`
    const thumbFilename = `${baseId}.jpg` // thumbs always jpg

    const manifestEntry = {
      id: shortHash(baseId + Date.now()),
      type: isVideo ? 'video' : 'photo',
      filename: fullFilename,
      originalName: file.name,
      url: `https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/full/${fullFilename}`,
      thumbUrl: `https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/thumb/${thumbFilename}`,
      uploader: uploader.trim() || 'Anonymous',
      caption: '',
      timestamp: new Date().toISOString(),
      width: null,
      height: null,
    }

    try {
      if (isVideo) {
        updateLog('working', 'Uploading video…')
        const fullKey = `public/lila-baa/photos/full/${fullFilename}`
        const { upload_url: fullUrl } = await presignPut(token, fullKey)
        await s3Put(fullUrl, file, file.type)
        // No thumbnail for video uploads in this MVP (client can't reliably
        // extract a frame from MOV in Safari). We set thumbUrl to the video
        // URL itself; the gallery's <video poster> will fall back to the first
        // frame, and the tile shows a ▶ badge regardless.
        manifestEntry.thumbUrl = manifestEntry.url
      } else {
        updateLog('working', 'Resizing…')
        const [fullResult, thumbResult] = await Promise.all([
          resizeImage(file, FULL_MAX, FULL_QUALITY),
          resizeImage(file, THUMB_MAX, THUMB_QUALITY),
        ])
        manifestEntry.width = fullResult.width
        manifestEntry.height = fullResult.height

        updateLog('working', 'Uploading full…')
        const fullKey = `public/lila-baa/photos/full/${fullFilename}`
        const { upload_url: fullUrl } = await presignPut(token, fullKey)
        await s3Put(fullUrl, fullResult.blob, 'image/jpeg')

        updateLog('working', 'Uploading thumb…')
        const thumbKey = `public/lila-baa/photos/thumb/${thumbFilename}`
        const { upload_url: thumbUrl } = await presignPut(token, thumbKey)
        await s3Put(thumbUrl, thumbResult.blob, 'image/jpeg')
      }

      updateLog('done', 'Done')
      return manifestEntry
    } catch (err) {
      updateLog('error', err.message)
      return null
    }
  }

  const handleUpload = async () => {
    if (!token.trim()) {
      alert('Please enter the family access token.')
      return
    }
    if (!uploader.trim()) {
      alert('Please enter your name so the family knows who uploaded the photos.')
      return
    }
    if (!files.length) return

    localStorage.setItem('lilaBaaToken', token.trim())
    localStorage.setItem('lilaBaaUploader', uploader.trim())

    setStatus('uploading')
    setLog(files.map((f) => ({ name: f.name, state: 'pending', message: '' })))

    // Upload in parallel (but throttle to 3 concurrent to not crush mobile networks)
    const CONCURRENCY = 3
    const results = new Array(files.length)
    let cursor = 0
    async function worker() {
      while (cursor < files.length) {
        const i = cursor++
        results[i] = await processFile(files[i], i)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    const newEntries = results.filter(Boolean)

    if (!newEntries.length) {
      setStatus('error')
      return
    }

    // Append to manifest with a simple retry on conflict
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const current = await fetchCurrentManifest()
        const merged = [...newEntries, ...current]
        const body = JSON.stringify(merged, null, 2)

        const key = 'public/lila-baa/photos/manifest.json'
        const { upload_url } = await presignPut(token, key)
        const put = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        if (put.ok) break
        if (attempt === 2) throw new Error(`Manifest PUT failed (${put.status})`)
      }
      setStatus('done')
      onUploadComplete?.()
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (!API_URL) {
    return (
      <div className="upload-modal-backdrop" onClick={onClose}>
        <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
          <h3>Upload not configured</h3>
          <p>
            The upload feature needs the Lambda API URL. Please set{' '}
            <code>VITE_UPLOAD_API_URL</code> and rebuild.
          </p>
          <button className="upload-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="upload-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== 'uploading') onClose()
      }}
    >
      <div className="upload-modal" role="dialog" aria-modal="true">
        <div className="upload-header">
          <h3>Add photos of Ba</h3>
          <button
            type="button"
            className="upload-close"
            onClick={onClose}
            disabled={status === 'uploading'}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="upload-fields">
          <label className="upload-field">
            <span>Your name</span>
            <input
              type="text"
              placeholder="e.g. Janki"
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              disabled={status === 'uploading'}
              autoComplete="given-name"
            />
          </label>
          <label className="upload-field">
            <span>Family access token</span>
            <input
              type="password"
              placeholder="Shared via WhatsApp"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={status === 'uploading'}
              autoComplete="off"
            />
            <span className="upload-field-hint">
              Saved on this device after the first time.
            </span>
          </label>
        </div>

        <div
          className={`upload-dropzone ${dragOver ? 'is-drag' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => status !== 'uploading' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            multiple
            hidden
            onChange={(e) => selectFiles(e.target.files)}
            disabled={status === 'uploading'}
          />
          <p className="upload-dz-heading">
            {files.length === 0
              ? 'Drop photos here or click to choose'
              : `${files.length} ready to upload`}
          </p>
          <p className="upload-dz-hint">
            Photos (JPEG/PNG/WebP) up to 60 MB · Videos (MP4/MOV) up to 60 MB
          </p>
        </div>

        {files.length > 0 && status === 'idle' && (
          <div className="upload-files-summary">
            {files.slice(0, 4).map((f) => (
              <span className="upload-file-chip" key={f.name}>
                {f.name}
              </span>
            ))}
            {files.length > 4 && (
              <span className="upload-file-chip more">
                +{files.length - 4} more
              </span>
            )}
          </div>
        )}

        {status !== 'idle' && log.length > 0 && (
          <ul className="upload-log">
            {log.map((l, i) => (
              <li key={i} className={`upload-log-item state-${l.state}`}>
                <span className="upload-log-name">{l.name}</span>
                <span className="upload-log-state">{l.message || l.state}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="upload-actions">
          <button
            type="button"
            className="upload-cancel-btn"
            onClick={onClose}
            disabled={status === 'uploading'}
          >
            {status === 'done' ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            className="upload-submit-btn"
            onClick={handleUpload}
            disabled={
              status === 'uploading' ||
              status === 'done' ||
              !files.length ||
              !token.trim()
            }
          >
            {status === 'uploading'
              ? 'Uploading…'
              : status === 'done'
                ? `Uploaded ${log.filter((l) => l.state === 'done').length}`
                : `Upload ${files.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
