import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {buildChoices, download, type VideoInfo} from './ytdlp.js'

type Format = NonNullable<VideoInfo['formats']>[number]

const video = (overrides: Partial<Format> = {}): Format => ({
  format_id: 'video', ext: 'mp4', vcodec: 'avc1.640028', acodec: 'none', height: 1080, ...overrides,
})
const audio = (overrides: Partial<Format> = {}): Format => ({
  format_id: 'audio', ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', ...overrides,
})
const quickTimeChoice = (formats: Format[]) =>
  buildChoices({title: 'sample', formats}).find(choice => choice.compatibility === 'quicktime')

test('offers a separate QuickTime choice when H.264/AAC and AV1/Opus are both available', () => {
  const choices = buildChoices({
    title: 'sample',
    formats: [
      video(), audio(),
      video({format_id: 'av1', vcodec: 'av01.0.08M.08', height: 2160}),
      audio({format_id: 'opus', acodec: 'opus', ext: 'webm', abr: 160}),
    ],
  })
  assert.equal(choices[0].label, '2160p · mp4')
  assert.deepEqual(choices[0].args, [
    '-f', 'bv*[height=2160]+ba/b[height=2160]/bv*[height<=2160]+ba/b', '--merge-output-format', 'mp4',
  ])
  const compatible = choices.find(choice => choice.compatibility === 'quicktime')
  assert.equal(compatible?.label, 'QuickTime · H.264/AAC')
  assert.equal(compatible?.kind, 'video')
  assert.deepEqual(choices.at(-1)?.args, ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0'])
})

test('recognizes common H.264 and AAC codec names', () => {
  for (const vcodec of ['avc1.640028', 'avc3.4d401f', 'h264']) {
    for (const acodec of ['mp4a.40.2', 'mp4a.40.5', 'mp4a.40.29', 'aac']) {
      assert.ok(quickTimeChoice([video({vcodec}), audio({acodec})]), `${vcodec} + ${acodec}`)
    }
  }
})

test('offers a compatible combined file without a separate audio stream, even without height metadata', () => {
  assert.ok(quickTimeChoice([video({acodec: 'aac', ext: 'mov', height: undefined})]))
})

const incompatibleCases: Array<[string, Format[]]> = [
  ['AV1/Opus only', [video({vcodec: 'av01.0.08M.08'}), audio({acodec: 'opus'})]],
  ['AV1 with AAC', [video({vcodec: 'av01.0.08M.08'}), audio()]],
  ['H.264 without audio', [video()]],
  ['H.264 with only Opus audio', [video(), audio({acodec: 'opus'})]],
  ['H.264 combined with Opus, even when separate AAC exists', [video({acodec: 'opus'}), audio()]],
  ['MP4A that is not AAC', [video(), audio({acodec: 'mp4a.69'})]],
  ['unknown audio codec', [video({acodec: undefined}), audio()]],
  ['unknown video codec', [video({vcodec: undefined}), audio()]],
  ['unknown audio-only status', [video(), audio({vcodec: undefined})]],
  ['audio only', [audio()]],
  ['no formats', []],
]
for (const [name, formats] of incompatibleCases) {
  test(`does not advertise QuickTime for ${name}`, () => {
    assert.equal(quickTimeChoice(formats), undefined)
  })
}

test('constrains both codecs on every fallback and remuxes single-file sources into MP4', () => {
  const choice = quickTimeChoice([video(), audio()])!
  assert.deepEqual(choice.args, [
    '-f',
    "bv[vcodec~='^(avc[13]|h264)(\\.|$)']+ba[acodec~='^(mp4a\\.40\\.|aac$)']/b[vcodec~='^(avc[13]|h264)(\\.|$)'][acodec~='^(mp4a\\.40\\.|aac$)']",
    '--merge-output-format', 'mp4', '--remux-video', 'mp4',
  ])
})

test('retains the existing video and MP3 fallbacks when no format metadata is available', () => {
  assert.deepEqual(buildChoices({title: 'sample'}), [
    {kind: 'video', label: 'best available · mp4', args: ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4']},
    {kind: 'audio', label: 'audio only · mp3', args: ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0']},
  ])
})

test('uses a separate QuickTime filename and reports single-file remuxing as processing', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yoinks-quicktime-'))
  try {
    const script = path.join(dir, 'fake-ytdlp.mjs')
    await fs.writeFile(script, `
      import fs from 'node:fs/promises'
      import path from 'node:path'
      const args = process.argv.slice(2)
      const template = args[args.indexOf('-o') + 1]
      const filepath = template.replace('%(title).60s', 'sample').replace('%(ext)s', 'mp4')
      await fs.writeFile(path.join(path.dirname(filepath), 'args.json'), JSON.stringify(args))
      await fs.writeFile(filepath, 'compatible media')
      console.log('[VideoRemuxer] Remuxing video from mov to mp4; Destination: ' + filepath)
      console.log(filepath)
    `)
    const originalPath = path.join(dir, 'sample.mp4')
    await fs.writeFile(originalPath, 'previous regular download')
    let processing = 0
    const choice = quickTimeChoice([video({acodec: 'aac', ext: 'mov'})])!
    const filepath = await download(
      {ytdlp: process.execPath, url: script, choice, outDir: dir},
      {onProgress: () => {}, onProcessing: () => processing++},
    )
    assert.equal(filepath, path.join(dir, 'sample.quicktime.mp4'))
    assert.equal(processing, 1)
    assert.equal(await fs.readFile(originalPath, 'utf8'), 'previous regular download')
    const args: string[] = JSON.parse(await fs.readFile(path.join(dir, 'args.json'), 'utf8'))
    assert.deepEqual(args.slice(0, choice.args.length), choice.args)

    const regularChoice = buildChoices({title: 'sample', formats: [video(), audio()]})[0]
    const regularPath = await download(
      {ytdlp: process.execPath, url: script, choice: regularChoice, outDir: dir},
      {onProgress: () => {}, onProcessing: () => {}},
    )
    assert.equal(regularPath, originalPath)
  } finally {
    await fs.rm(dir, {recursive: true, force: true})
  }
})
