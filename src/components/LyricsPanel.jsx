import { useState, useMemo } from 'react'
import './LyricsPanel.css'

// Decide which tabs to show for this track
function buildTabs(track) {
  const tabs = []
  const s = track.sections ?? {}
  const isSpeech = track.trackType === 'speech'

  if (isSpeech) {
    if (s.summary) tabs.push({ id: 'summary', label: 'Summary', lang: 'en' })
    if (s.gujarati)
      tabs.push({
        id: 'gujarati',
        label: 'ગુજરાતી',
        lang: 'gu',
        scriptLabel: 'Gujarati script',
      })
    if (s.romanized)
      tabs.push({ id: 'romanized', label: 'Romanized', lang: 'en' })
  } else {
    // Bhajan / mantra
    const isDevanagari =
      track.language === 'hindi' || track.language === 'sanskrit'
    if (s.gujarati)
      tabs.push({
        id: 'gujarati',
        label: isDevanagari ? 'देवनागरी' : 'ગુજરાતી',
        lang: isDevanagari ? 'hi' : 'gu',
        scriptLabel: isDevanagari ? 'Devanagari' : 'Gujarati script',
      })
    if (s.romanized)
      tabs.push({ id: 'romanized', label: 'Romanized', lang: 'en' })
    if (s.meaning) tabs.push({ id: 'meaning', label: 'Meaning', lang: 'en' })
    if (s.about) tabs.push({ id: 'about', label: 'About', lang: 'en' })
  }
  return tabs
}

export default function LyricsPanel({ track }) {
  const tabs = useMemo(() => buildTabs(track), [track])
  const [activeId, setActiveId] = useState(tabs[0]?.id)

  if (!tabs.length) {
    return (
      <div className="lyrics-empty">
        <p>No lyrics captured for this track yet.</p>
      </div>
    )
  }

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  const html = track.sections?.[active.id] ?? ''

  return (
    <div className="lyrics-panel">
      <div
        className="lyrics-tabs"
        role="tablist"
        aria-label="Lyrics script"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active.id}
            className={`lyrics-tab ${t.id === active.id ? 'is-active' : ''}`}
            onClick={() => setActiveId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`lyrics-body lyrics-body-${active.id}`}
        role="tabpanel"
        lang={active.lang}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
