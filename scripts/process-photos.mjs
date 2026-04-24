#!/usr/bin/env node
// Bulk photo processor for the Lila Baa gallery.
//
// For each JPEG in the source folder:
//   - Generates a 2400px "full" version (JPEG q=85) at <out>/full/
//   - Generates a 400px "thumb" version (JPEG q=75) at <out>/thumb/
// For each video (MOV/MP4):
//   - Copies the original to <out>/full/
//   - Extracts a 400px thumbnail frame (at ~1s) to <out>/thumb/
// Writes manifest.json at <out>/manifest.json.
//
// Usage: node scripts/process-photos.mjs <source-folder> [uploader-name]

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'

const SRC = process.argv[2]
const UPLOADER = process.argv[3] ?? 'Shalin'

if (!SRC) {
  console.error('Usage: node process-photos.mjs <source-folder> [uploader]')
  process.exit(1)
}

const OUT = '/tmp/lila-photos-processed'
const FULL_DIR = path.join(OUT, 'full')
const THUMB_DIR = path.join(OUT, 'thumb')

const FULL_MAX = 2400
const THUMB_MAX = 400
const FULL_QUALITY = 85
const THUMB_QUALITY = 75

const PUBLIC_URL_PREFIX =
  'https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos'

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => {
      if (code === 0) resolve({ out, err })
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}: ${err}`))
    })
  })
}

function sanitize(name) {
  // Lowercase, replace spaces/uppercase/special with hyphens, strip consecutive hyphens.
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getImageSize(filePath) {
  try {
    const { out } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath])
    const w = /pixelWidth:\s*(\d+)/.exec(out)?.[1]
    const h = /pixelHeight:\s*(\d+)/.exec(out)?.[1]
    return w && h ? { width: Number(w), height: Number(h) } : null
  } catch {
    return null
  }
}

async function processImage(srcPath, baseName) {
  const ext = 'jpg'
  const safeName = sanitize(baseName.replace(/\.(jpeg|jpg|png)$/i, '')) + '.' + ext
  const fullOut = path.join(FULL_DIR, safeName)
  const thumbOut = path.join(THUMB_DIR, safeName)

  await run('sips', [
    '-Z', String(FULL_MAX),
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(FULL_QUALITY),
    srcPath, '--out', fullOut,
  ])

  await run('sips', [
    '-Z', String(THUMB_MAX),
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(THUMB_QUALITY),
    srcPath, '--out', thumbOut,
  ])

  // Strip metadata from thumb (privacy + size)
  // sips doesn't strip EXIF reliably; acceptable for thumbnails.

  const size = await getImageSize(fullOut)
  return { safeName, size }
}

async function processVideo(srcPath, baseName) {
  const origExt = path.extname(baseName).slice(1).toLowerCase() || 'mp4'
  const safeBase = sanitize(baseName.replace(/\.[^.]+$/, ''))
  const fullName = `${safeBase}.${origExt}`
  const thumbName = `${safeBase}.jpg`
  const fullOut = path.join(FULL_DIR, fullName)
  const thumbOut = path.join(THUMB_DIR, thumbName)

  // Copy original as-is
  await fs.copyFile(srcPath, fullOut)

  // Extract thumbnail frame at 1 second, scaled to 400px wide
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', '00:00:01.0',
    '-i', srcPath,
    '-frames:v', '1',
    '-vf', `scale='min(${THUMB_MAX},iw)':-2`,
    '-q:v', '5',
    thumbOut,
  ])

  // Probe video resolution for manifest
  let size = null
  try {
    const { out } = await run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x',
      srcPath,
    ])
    const m = /(\d+)x(\d+)/.exec(out.trim())
    if (m) size = { width: Number(m[1]), height: Number(m[2]) }
  } catch {}

  return { fullName, thumbName, size }
}

async function main() {
  await fs.mkdir(FULL_DIR, { recursive: true })
  await fs.mkdir(THUMB_DIR, { recursive: true })

  const entries = await fs.readdir(SRC, { withFileTypes: true })
  const files = entries.filter((e) => e.isFile()).map((e) => e.name).sort()

  const manifest = []
  const errors = []
  let processed = 0

  for (const name of files) {
    const ext = path.extname(name).slice(1).toLowerCase()
    const srcPath = path.join(SRC, name)
    const stat = await fs.stat(srcPath)
    const timestamp = stat.mtime.toISOString()

    try {
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
        const { safeName, size } = await processImage(srcPath, name)
        const id = crypto
          .createHash('md5')
          .update(safeName)
          .digest('hex')
          .slice(0, 12)
        manifest.push({
          id,
          type: 'photo',
          filename: safeName,
          originalName: name,
          url: `${PUBLIC_URL_PREFIX}/full/${safeName}`,
          thumbUrl: `${PUBLIC_URL_PREFIX}/thumb/${safeName}`,
          uploader: UPLOADER,
          caption: '',
          timestamp,
          width: size?.width ?? null,
          height: size?.height ?? null,
        })
      } else if (ext === 'mov' || ext === 'mp4' || ext === 'm4v') {
        const { fullName, thumbName, size } = await processVideo(srcPath, name)
        const id = crypto
          .createHash('md5')
          .update(fullName)
          .digest('hex')
          .slice(0, 12)
        manifest.push({
          id,
          type: 'video',
          filename: fullName,
          originalName: name,
          url: `${PUBLIC_URL_PREFIX}/full/${fullName}`,
          thumbUrl: `${PUBLIC_URL_PREFIX}/thumb/${thumbName}`,
          uploader: UPLOADER,
          caption: '',
          timestamp,
          width: size?.width ?? null,
          height: size?.height ?? null,
        })
      } else {
        continue
      }
      processed++
      if (processed % 20 === 0) console.log(`  processed ${processed}/${files.length}`)
    } catch (err) {
      errors.push({ name, error: err.message })
      console.warn(`  WARN: ${name}: ${err.message}`)
    }
  }

  // Sort manifest: newest first by timestamp
  manifest.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const manifestPath = path.join(OUT, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`\nProcessed ${processed} files.`)
  if (errors.length) console.log(`${errors.length} errors.`)
  console.log(`Output:`)
  console.log(`  ${FULL_DIR}  (${manifest.length} full-size)`)
  console.log(`  ${THUMB_DIR} (${manifest.length} thumbnails)`)
  console.log(`  ${manifestPath} (${manifest.length} entries)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
