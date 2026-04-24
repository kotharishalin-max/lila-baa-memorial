// Parses content/besnu/*.md into src/data/besnu-tracks.json
// - Extracts YAML frontmatter via gray-matter
// - Splits body into sections by H2 heading, rendering each to HTML via remark
// - Rewrites s3view:// audio URLs to public S3 URLs
// - Emits a single JSON consumed statically by the site at build time
//
// Runs at `npm run prebuild`.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import matter from 'gray-matter'
import fg from 'fast-glob'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT, 'content', 'besnu')
const OUT_FILE = path.join(ROOT, 'src', 'data', 'besnu-tracks.json')

const PUBLIC_AUDIO_PREFIX =
  'https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/audio/'

// Section heading → canonical key
const HEADING_MAP = [
  { re: /gujarati\s*(script)?|ગુજરાતી/i, key: 'gujarati' },
  { re: /devanagari|देवनागरी/i, key: 'gujarati' }, // Sanskrit/Hindi tracks file Devanagari into "gujarati" slot — the panel label handles it
  { re: /romanized/i, key: 'romanized' },
  { re: /^meaning$/i, key: 'meaning' },
  { re: /^about$/i, key: 'about' },
  { re: /summary\s*\(english\)/i, key: 'summary' },
]

function classifyHeading(text) {
  for (const { re, key } of HEADING_MAP) {
    if (re.test(text)) return key
  }
  return null
}

function rewriteAudioUrl(str) {
  // Rewrite s3view:// paths (old besnu prefix or new public/audio prefix) to public URL.
  return str
    .replace(
      /s3view:\/\/02-areas\/family\/lila-baa\/besnu\/([^)\s"']+)/g,
      (_, slug) => `${PUBLIC_AUDIO_PREFIX}${slug}`,
    )
    .replace(
      /s3view:\/\/public\/lila-baa\/audio\/([^)\s"']+)/g,
      (_, slug) => `${PUBLIC_AUDIO_PREFIX}${slug}`,
    )
}

async function renderBodyToSections(body) {
  // Split body at H2 headings; each section is the heading's content.
  // We parse the whole body as a single AST, then manually collect children
  // into section buckets based on h2 boundaries.
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkHtml, { sanitize: false })
  const tree = processor.parse(body)

  const sections = {}
  let currentKey = null
  let currentNodes = []

  const flush = () => {
    if (currentKey && currentNodes.length) {
      const subtree = { type: 'root', children: currentNodes }
      const html = processor.stringify(subtree)
      sections[currentKey] = html.trim()
    }
    currentNodes = []
  }

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      flush()
      const headingText = (node.children ?? [])
        .map((c) => c.value ?? '')
        .join('')
        .trim()
      currentKey = classifyHeading(headingText)
    } else if (currentKey) {
      currentNodes.push(node)
    }
  }
  flush()

  // Rewrite audio URLs in each section's HTML (for any embedded s3view:// links)
  for (const k of Object.keys(sections)) {
    sections[k] = rewriteAudioUrl(sections[k])
  }
  return sections
}

function deriveAudioSlug(trackNumber, titleRomanized) {
  // Matches the S3 object naming convention already used:
  // "NN-lower-hyphen-title.mp3"
  const slug = (titleRomanized ?? '')
    .toLowerCase()
    .replace(/[()\[\],'"!?:]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  const pad = String(trackNumber).padStart(2, '0')
  return `${pad}-${slug}.mp3`
}

async function main() {
  const files = await fg(
    [
      path.join(CONTENT_DIR, '[0-9][0-9] - *.md'),
    ],
    { onlyFiles: true },
  )
  if (!files.length) {
    console.error(`No track MDs found in ${CONTENT_DIR}. Run 'npm run sync-md' first.`)
    process.exit(1)
  }

  const entries = []
  const warnings = []

  for (const file of files.sort()) {
    const raw = await readFile(file, 'utf8')
    const { data: fm, content } = matter(raw)
    const number = Number(fm.track_number)
    const trackType = fm.track_type ?? 'bhajan'

    // Title fallback chain: frontmatter → filename-derived → first H1
    const filenameTitle = path
      .basename(file, '.md')
      .replace(/^\d+\s*-\s*/, '')
    const titleRomanized = fm.title_romanized ?? filenameTitle
    const titleGujarati = fm.title_gujarati ?? ''

    const sections = await renderBodyToSections(content)

    // Derive audio URL. Prefer a slug found in the body's s3view:// link if present;
    // otherwise reconstruct from title + track_number.
    let audioSlug = null
    const match =
      content.match(/s3view:\/\/public\/lila-baa\/audio\/([^)\s"']+\.mp3)/) ||
      content.match(/s3view:\/\/02-areas\/family\/lila-baa\/besnu\/([^)\s"']+\.mp3)/)
    if (match) audioSlug = match[1]
    if (!audioSlug) audioSlug = deriveAudioSlug(number, titleRomanized)
    const audioUrl = `${PUBLIC_AUDIO_PREFIX}${audioSlug}`

    // Sanity-check expected sections per track type
    if (trackType === 'speech') {
      if (!sections.summary) warnings.push(`${path.basename(file)}: missing "Summary (English)" section`)
      if (!sections.gujarati) warnings.push(`${path.basename(file)}: missing Gujarati transcript`)
      if (!sections.romanized) warnings.push(`${path.basename(file)}: missing Romanized transcript`)
    } else {
      if (!sections.gujarati) warnings.push(`${path.basename(file)}: missing Gujarati/Devanagari section`)
      if (!sections.romanized) warnings.push(`${path.basename(file)}: missing Romanized section`)
      if (!sections.meaning) warnings.push(`${path.basename(file)}: missing Meaning section`)
    }

    entries.push({
      number,
      titleRomanized,
      titleGujarati,
      trackType,
      language: fm.language ?? '',
      composer: fm.composer ?? '',
      audioUrl,
      audioFilename: audioSlug,
      sections,
      // Speech-specific metadata for rendering
      speakers: fm.speakers ?? null,
      relationshipToDeceased: fm.relationship_to_deceased ?? null,
      // Misc
      sourceFilm: fm.source_film ?? null,
      deity: fm.deity ?? null,
      confidence: fm.confidence ?? null,
      lyricsCoverage: fm.lyrics_coverage ?? null,
    })
  }

  entries.sort((a, b) => a.number - b.number)

  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(entries, null, 2), 'utf8')

  console.log(`Wrote ${entries.length} entries to ${path.relative(ROOT, OUT_FILE)}`)
  if (warnings.length) {
    console.warn('\nWarnings:')
    for (const w of warnings) console.warn(`  ${w}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
