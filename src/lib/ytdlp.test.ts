import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {download, type DownloadProgress} from './ytdlp.js'

const ID = 'DQw4w9WgXcQ'

// matches ytdlp.ts's PROGRESS_TEMPLATE: downloaded|total|estimate|speed|eta
const progress = (downloaded: number, total: number) =>
  `YOINK|${downloaded.toFixed(1)}|${total.toFixed(1)}|NA|2048.0|1.0`

// Stands in for the yt-dlp binary so download() can run offline. Replays the
// lines yt-dlp writes for a single-file download and for a video+audio merge,
// copied from yt_dlp/YoutubeDL.py:3106-3109 — to_screen joins the format ids
// with ", " after the count, e.g. "Downloading 2 format(s): 137, 251".
const FAKE_YTDLP = `import path from 'node:path'

const id = ${JSON.stringify(ID)}
const out = path.resolve(${JSON.stringify(os.tmpdir())}, 'yoinks-fake-out')
const video = path.join(out, 'Video.mp4')
const single = process.env.FAKE_YTDLP_MODE === 'single'

const lines = single
  ? [
      \`[info] \${id}: Downloading video \${id} of https://youtube.com/watch?v=\${id}\`,
      \`[info] \${id}: Downloading 1 format(s): 251\`,
      \`[download] Destination: \${path.join(out, 'Video.webm')}\`,
      ${JSON.stringify(progress(2048, 4096))},
      ${JSON.stringify(progress(4096, 4096))},
      video,
    ]
  : [
      \`[info] \${id}: Downloading video \${id} of https://youtube.com/watch?v=\${id}\`,
      \`[info] \${id}: Downloading 2 format(s): 137, 251\`,
      \`[download] Destination: \${path.join(out, 'Video.f137.mp4')}\`,
      ${JSON.stringify(progress(5000, 5000))},
      \`[download] Destination: \${path.join(out, 'Video.f251.webm')}\`,
      ${JSON.stringify(progress(512, 3000))},
      ${JSON.stringify(progress(3000, 3000))},
      \`[Merger] Merging formats into "\${video}"\`,
      video,
    ]

process.stdout.write(lines.join('\\n') + '\\n')
`

// download() spawns `ytdlp` with the url as its first argument, so passing
// process.execPath plus the script path runs the fake under node — no network.
let fake: string | undefined

async function runFake(mode: 'single' | 'merge'): Promise<DownloadProgress[]> {
  fake ??= path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'yoinks-fake-')), 'fake-ytdlp.mjs')
  await fs.writeFile(fake, FAKE_YTDLP)

  const events: DownloadProgress[] = []
  process.env.FAKE_YTDLP_MODE = mode
  try {
    await download(
      {
        ytdlp: process.execPath,
        url: fake,
        choice: {
          kind: 'video',
          label: '1080p · mp4',
          args: ['-f', 'bv*[height=1080]+ba/b[height=1080]/bv*[height<=1080]+ba/b'],
        },
        outDir: path.resolve(os.tmpdir(), 'yoinks-fake-out'),
      },
      {onProgress: progress => events.push(progress), onProcessing: () => {}},
    )
  } finally {
    delete process.env.FAKE_YTDLP_MODE
  }
  return events
}

test('a single-format download reports one part', async () => {
  const events = await runFake('single')
  assert.equal(events.at(-1)?.part, 0)
  assert.equal(events.at(-1)?.totalParts, 1)
})

test('a merged video+audio download reports the format count yt-dlp printed', async () => {
  const events = await runFake('merge')
  // part does increment — downloaded_bytes restarts when the audio file starts
  assert.equal(events.at(-1)?.part, 1, 'expected the audio file to bump `part`')
  assert.equal(events.at(-1)?.totalParts, 2, 'yt-dlp said "Downloading 2 format(s): 137, 251"')
})