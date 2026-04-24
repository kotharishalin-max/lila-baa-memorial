import { useState } from 'react'
import './TrackCard.css'
import AudioPlayer from './AudioPlayer.jsx'
import LyricsPanel from './LyricsPanel.jsx'

const TYPE_LABELS = {
  bhajan: 'Bhajan',
  mantra: 'Mantra',
  speech: 'Speech',
}

export default function TrackCard({ track }) {
  const [open, setOpen] = useState(false)

  const isSpeech = track.trackType === 'speech'
  const displayTitle = track.titleRomanized || `Track ${track.number}`

  return (
    <li className={`track-card ${open ? 'is-open' : ''} track-${track.trackType}`}>
      <button
        type="button"
        className="track-card-header"
        aria-expanded={open}
        aria-controls={`track-${track.number}-content`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="track-number">
          {String(track.number).padStart(2, '0')}
        </span>
        <span className="track-title-block">
          <span className="track-title-romanized">{displayTitle}</span>
          {track.titleGujarati && (
            <span className="track-title-gujarati" lang="gu">
              {track.titleGujarati}
            </span>
          )}
        </span>
        <span className="track-meta">
          <span className={`track-type-badge type-${track.trackType}`}>
            {TYPE_LABELS[track.trackType] ?? track.trackType}
          </span>
          {track.composer && !isSpeech && (
            <span className="track-composer">{track.composer}</span>
          )}
          {isSpeech && track.relationshipToDeceased && (
            <span className="track-composer">
              {track.relationshipToDeceased}
            </span>
          )}
        </span>
        <span className="track-chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div id={`track-${track.number}-content`} className="track-card-body">
          <AudioPlayer
            trackNumber={track.number}
            audioUrl={track.audioUrl}
            audioFilename={track.audioFilename}
            title={displayTitle}
          />
          <LyricsPanel track={track} />
        </div>
      )}
    </li>
  )
}
