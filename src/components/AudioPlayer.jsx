import { useContext, useEffect, useRef, useState } from 'react'
import { BesnuContext } from '../App.jsx'
import './AudioPlayer.css'

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AudioPlayer({ trackNumber, audioUrl, audioFilename, title }) {
  const { currentTrackNumber, setCurrentTrackNumber } = useContext(BesnuContext)
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  // Pause when another track becomes the active one
  useEffect(() => {
    if (currentTrackNumber !== trackNumber && audioRef.current) {
      audioRef.current.pause()
    }
  }, [currentTrackNumber, trackNumber])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setCurrentTrackNumber(trackNumber)
      try {
        await audio.play()
      } catch (err) {
        console.error('Play failed:', err)
      }
    } else {
      audio.pause()
    }
  }

  const onTimeUpdate = () => {
    if (!isSeeking) setCurrentTime(audioRef.current?.currentTime ?? 0)
  }

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration ?? 0)
  }

  const onSeek = (e) => {
    const val = Number(e.target.value)
    setCurrentTime(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  return (
    <div className="audio-player">
      <button
        type="button"
        className="audio-play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M7 5v14l12-7L7 5z" />
          </svg>
        )}
      </button>

      <div className="audio-progress">
        <input
          type="range"
          className="audio-slider"
          min={0}
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={onSeek}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onTouchStart={() => setIsSeeking(true)}
          onTouchEnd={() => setIsSeeking(false)}
          aria-label="Seek"
        />
        <div className="audio-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <a
        className="audio-download-btn"
        href={audioUrl}
        download={audioFilename}
        aria-label={`Download ${title}`}
        title="Download MP3"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 3v10.17l-3.59-3.58L7 11l5 5 5-5-1.41-1.41L12 13.17V3h0z" />
          <path d="M5 18v2h14v-2H5z" />
        </svg>
      </a>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />
    </div>
  )
}
