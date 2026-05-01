# Lila Baa Memorial — Project Notes

A small memorial website for **Shrimati Lilavatiben Champaklal Kothari** (Shalin's
paternal grandmother — *Ba* to her children/grandchildren, *Liba* to her
great-grandchildren). She passed on **April 16, 2026** at 97 years 10 months.
The besnu was held **April 20, 2026 at Sindhu Bhawan Hall, Ahmedabad**.

The site exists to preserve and share three things with extended family:

1. The **25 audio recordings** from the besnu — bhajans, an opening Sanskrit
   mantra, family eulogies, and Shalin's sung tribute — with full lyrics in
   Gujarati / Devanagari + romanized English + a short English meaning.
2. A **family photo gallery** seeded with 152 photos & videos and open to
   bulk upload by family members via a token-gated dropzone.
3. A foundation for future sections (timeline, letters, guestbook) — the site
   is framed as "a Lila Baa website" with the besnu as the launch phase.

## Live site

- URL: <https://kotharishalin-max.github.io/lila-baa-memorial/>
- Visibility: **unlisted** — public URL, `noindex,nofollow`, no auth
- GitHub repo: <https://github.com/kotharishalin-max/lila-baa-memorial> (public; required for free-tier GitHub Pages)

## Status (last updated 2026-05-02)

| Phase | What | Status |
|---|---|---|
| **A** | Site scaffold; Hero with hero portrait; About paragraph + counts; Family tree (4 children + spouses + grandchildren named in eulogies); Besnu section with 25 tracks, native audio player + tabbed lyrics panel (ગુજરાતી / Romanized / Meaning / About); deploy to gh-pages | ✅ Done 2026-04-25 |
| **B** | PhotoGallery (manifest-driven grid + responsive), Lightbox (kbd nav, video support, download), UploadDropzone (token-gated, client-side resize, parallel upload, manifest update with retry); Lambda forked → `lila-baa-photo-proxy`; **152 starter photos + videos seeded from `~/Desktop/Lila Baa photos/`** | ✅ Done 2026-04-25 |
| **C** | Timeline, letters, guestbook | ⏳ Stubbed; not started |

## Stack

- **React 18** (Vite 5 scaffolded with `create-vite --template react`)
- **Vite** for dev server + production build (base path `/lila-baa-memorial/`)
- **gh-pages** package to push `dist/` to the `gh-pages` branch
- **gray-matter + remark + remark-html** for the build-time MD → JSON content pipeline
- No state library — `BesnuContext` (one `useContext`) coordinates "only one track playing at a time"

## Folder layout

```
lila-baa-memorial/
├── CLAUDE.md                      # this file
├── package.json                   # scripts: sync-md, prebuild, dev, build, deploy
├── vite.config.js                 # base via VITE_BASE env var
├── index.html                     # noindex meta + Google Fonts (Cormorant Garamond, Inter, Noto Sans Gujarati/Devanagari)
├── .env                           # gitignored — VITE_UPLOAD_API_URL only
├── .env.example                   # checked in
├── public/
│   └── hero/lila-baa.jpg          # 2400px portrait, lavender garden
├── content/
│   └── besnu/                     # mirror of vault MDs (25 tracks + Lila Baa Besnu.md)
├── scripts/
│   ├── sync-besnu-md.sh           # rsync vault → content/besnu/
│   ├── build-besnu-json.mjs       # MD → src/data/besnu-tracks.json (run at prebuild)
│   └── process-photos.mjs         # bulk photo processor (sips + ffmpeg) → /tmp/lila-photos-processed/ + manifest
└── src/
    ├── App.jsx                    # section composition + BesnuContext
    ├── main.jsx
    ├── data/
    │   ├── besnu-tracks.json      # generated; gitignored
    │   ├── bio.js                 # About-section constants
    │   └── family.js              # children, named-in-eulogies
    ├── components/                # one .jsx + .css per component
    │   ├── Hero.jsx
    │   ├── AboutBaa.jsx
    │   ├── FamilyTree.jsx
    │   ├── BesnuSection.jsx
    │   ├── TrackCard.jsx
    │   ├── AudioPlayer.jsx        # native <audio>, custom UI, ~120 lines
    │   ├── LyricsPanel.jsx        # tabbed; routes by track_type
    │   ├── PhotoGallery.jsx       # fetches manifest.json, manages grid+lightbox+upload state
    │   ├── Lightbox.jsx           # fullscreen, arrow keys, supports <video>
    │   ├── UploadDropzone.jsx     # token-gated, canvas resize, parallel upload, manifest append
    │   ├── PhotoGallery.css ... etc
    │   └── Footer.jsx
    └── styles/
        ├── tokens.css             # palette: ivory bg, walnut text, bronze accent
        └── global.css
```

## Content sources

### Besnu MDs (single source of truth = vault)

Vault at `/Users/zwangy/Vaults/Zwangisidian/02_Areas/Family/Lila Baa/Besnu/`:
- `Lila Baa Besnu.md` (index — frontmatter, family tree, track table)
- `01 - Shantakaram Bhujagashayanam.md` … `25 - He Nath Jodi Hath.md`

Sync via `npm run sync-md` (one-way rsync). Extractor parses YAML frontmatter,
splits body by `## ` headings into named sections (Gujarati / Devanagari / Romanized /
Meaning / About / Summary), renders each to HTML, rewrites `s3view://` audio
links to public S3 URLs, and emits `src/data/besnu-tracks.json`.

### Photo manifest

`https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/manifest.json`
(public-read, content-type `application/json`, `Cache-Control: max-age=60, must-revalidate`).

Schema (array of):

```json
{
  "id": "885924feebc3",
  "type": "photo" | "video",
  "filename": "img_1937.jpg",
  "originalName": "IMG_1937.JPG",
  "url": "https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/full/img_1937.jpg",
  "thumbUrl": "https://shalin-kothari-files.s3.amazonaws.com/public/lila-baa/photos/thumb/img_1937.jpg",
  "uploader": "Shalin",
  "caption": "",
  "timestamp": "2026-04-24T20:18:44.592Z",
  "width": 2400,
  "height": 1800
}
```

Sorted newest-first by timestamp. Gallery fetches with cache-bust on each load.

## Infrastructure (AWS, us-east-2)

### S3 — `shalin-kothari-files`

- Object Ownership: **BucketOwnerEnforced** (ACLs disabled — bucket policy gates access)
- Bucket policy: public-read on `/public/*` prefix only
- CORS: all origins, `GET/PUT/POST`, all headers
- **Audio** (Phase A): `public/lila-baa/audio/01-shantakaram-bhujagashayanam.mp3` … `25-he-nath-jodi-hath.mp3` — 25 files, ≈258 MB
- **Photos** (Phase B): `public/lila-baa/photos/{full,thumb}/<filename>` — 152 of each (140 photo pairs + 12 video originals + 12 video frame thumbs), ≈558 MB
- **Manifest**: `public/lila-baa/photos/manifest.json` — 71 KB

### Lambda — `lila-baa-photo-proxy`

- Region: us-east-2
- Runtime: Python 3.12
- IAM role: `lila-baa-photo-proxy-role`
  - `s3:GetObject` on whole bucket (legacy from forked s3-proxy)
  - `s3:PutObject`, `s3:PutObjectAcl`, `s3:AbortMultipartUpload` scoped to `public/lila-baa/photos/*` and `public/lila-baa/photos/manifest.json`
- Env var: `ACCESS_SECRET` (32-char hex; the family token)
- Behavior:
  - `GET /{secret}/{key}` → 302 to a 7-day presigned download
  - `POST /{secret}/{key}` → JSON `{ upload_url, key, public_url }` for a 1-hour presigned PUT (restricted to the photos prefix + manifest)
  - `OPTIONS /{secret}/{key}` → CORS preflight
- API Gateway: REST API `lila-baa-photo-proxy`, ID `8vvpl3rty8`, stage `prod`
  - **Public URL: `https://8vvpl3rty8.execute-api.us-east-2.amazonaws.com/prod`**
  - Resource: `/{secret}/{proxy+}` with GET/POST/OPTIONS all wired to the Lambda
- Source: `.scripts/lila-baa-proxy/lambda_function.py` + `deploy.sh`
- Forked from `.scripts/s3-proxy/` — that one (`s3-presign-proxy`) is for trip photos, untouched.

### Family token

Lives in three places: the Lambda env var, the WhatsApp family group, and the
`localStorage` of any device that has uploaded. **Not stored anywhere in this
repo** — the repo is public.

- Retrieve current value:
  ```
  aws lambda get-function-configuration \
    --function-name lila-baa-photo-proxy \
    --query 'Environment.Variables.ACCESS_SECRET' \
    --output text --region us-east-2
  ```
- Rotate: `bash .scripts/lila-baa-proxy/deploy.sh` (generates a fresh hex secret,
  redeploys the Lambda, prints the new value at the end). All previously
  shared tokens immediately stop working — share the new one in WhatsApp.

## Build & deploy

```bash
npm run sync-md       # Pull fresh MDs from vault → content/besnu/
npm run prebuild      # MD → JSON; runs automatically before dev/build
npm run dev           # Vite dev server at http://localhost:5173 (base /)
npm run build         # Production build with base /lila-baa-memorial/ → dist/
npm run preview       # Serve dist/ locally to spot-check
npm run deploy        # Build + push dist/ to gh-pages branch (gh-pages package)
```

After `npm run deploy`, GitHub Pages takes ~30–90s to publish. Watch with
`gh api repos/kotharishalin-max/lila-baa-memorial/pages/builds/latest`.

## Visual design

- Palette: warm ivory (`#faf6f0`), deep walnut text (`#2b2018`), muted bronze accent (`#8b6f47`), soft sand secondary (`#a89580`), divider (`#e8dfd3`)
- Type: Cormorant Garamond italic for display; Inter for body; Noto Sans Gujarati/Devanagari for native scripts
- Mobile-first; max prose width 720px, max shell 1100px
- Hero: full-bleed photo with bottom-anchored content + scrim gradient

## Decisions made (and why)

- **React + Vite + gh-pages**: matches the prior Hilde 5th Birthday webapp pattern in this household; proven; free hosting.
- **Public S3 audio (not presigned)**: site lives years. Presigned URLs expire weekly and would force a redeploy each rotation; bandwidth cost is pennies.
- **Repo public** (not private): GitHub Pages on private repos requires a paid plan. Site is unlisted anyway, and family content in the repo is no more sensitive than the rendered site.
- **Forked the Lambda** (not multiplexed `s3-presign-proxy`): keeps token rotation independent, isolates blast radius. ~100 LOC duplicated.
- **Manifest.json in S3** (not a Lambda+DB read API): zero infra, zero cost, family-scale concurrency is fine. Eventual-consistency risk on simultaneous uploads is mitigated with retry; can upgrade to S3 event → Lambda regenerate if needed.
- **Client-side image resize via canvas** (not server-side Sharp): no Lambda dependencies to manage, smaller upload payloads, works on iOS Safari.
- **Token in localStorage** (not OAuth/email auth): it's a family memorial. Trust-based. Anyone on the WhatsApp group can upload.
- **No karaoke-line-timing for lyrics**: confirmed simple-scrolling tabs is what the user wanted; line-by-line timestamps would have been hours of manual work for diminishing returns.
- **Vault MDs as the canonical content source**: the user already maintains the vault meticulously; the build pipeline pulls from there so there's exactly one place to edit lyrics/transcripts.

## Caveats

- **HEIC from iPhone uploads**: file picker filters to JPEG/PNG/WebP/MP4/MOV. iOS users with HEIC default need to either change to "Most Compatible" in iOS Camera settings or export as JPEG before uploading. No HEIC polyfill shipped in v1; consider `heic2any` (~80 KB) if family reports issues.
- **Web-uploaded videos lack a static thumbnail**: extracting a frame client-side from MOV is unreliable across iOS Safari. Currently the tile shows the ▶ badge over a dark background. The 12 starter videos all have proper ffmpeg-extracted thumbs.
- **Manifest race condition**: two simultaneous uploaders can each PUT a manifest that misses the other's entry. Mitigated with a 3-attempt retry on 412/etag-mismatch. For family scale this is acceptable. Can upgrade to S3 event → Lambda regenerate if it ever bites.

## How to extend (Phase C ideas)

- **Timeline section**: years/decades of life events. Add `<TimelineSection>` reading from `src/data/timeline.js`.
- **Letters section**: scanned cards/letters with transcripts. Reuse `<LyricsPanel>`-style tabs for original vs. transcript vs. translation.
- **Guestbook**: family members leave short messages. Same Lambda pattern (POST to a `guestbook.json` manifest) — token-gated like the photo upload.
- **Custom domain**: e.g. `lilabaa.kothari.family` — add `public/CNAME` with hostname, flip `vite.config.js` `base: '/'`, configure DNS CNAME to `<user>.github.io`.
- **HEIC support**: add `heic2any` polyfill in `UploadDropzone` for non-iOS browsers.
- **Search/filter**: gallery filters by year, uploader, type; lyrics text search across tracks.

## Vault references

- All 25 besnu MDs at `/Users/zwangy/Vaults/Zwangisidian/02_Areas/Family/Lila Baa/Besnu/`
- Original audio recordings (now S3-only, deleted from local Downloads)
- Hero photo source: `/Users/zwangy/Desktop/IMG_9725.JPG` (kept on disk)
- Starter photo folder: `/Users/zwangy/Desktop/Lila Baa photos/` (kept on disk; can be deleted, all in S3)
