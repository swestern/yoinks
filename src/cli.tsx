import React from 'react'
import {createRequire} from 'node:module'
import {render} from 'ink'
import {App, type Outcome} from './app.js'
import {captureFrames} from './lib/click-map.js'
import {parseArgs} from './lib/args.js'
import {readClipboard} from './lib/clipboard.js'
import {isProbablyUrl} from './lib/platforms.js'

// read at runtime from the shipped package.json so npm version bumps
// can't drift from a hardcoded constant
const VERSION: string = createRequire(import.meta.url)('../package.json').version

const HELP = `
  yoinks — yoink any video. paste. yoink. done.

  Usage
    $ yoinks [url]

  Examples
    $ yoinks https://youtu.be/dQw4w9WgXcQ
    $ yoinks https://x.com/user/status/123456
    $ yoinks                 (prompts for a url)

  Options
    --theme <mode>          use auto, light, or dark
    --plain, --accessible   plain accessible text mode (no alt-screen)
    --no-mouse              disable mouse tracking to allow native text selection
    --no-motion             disable animated shimmer/sweeps
    -o, --output <dir>      save downloads to custom directory (default: current directory ./)
    -h, --help              show this help
    -v, --version           show version

  Downloads are saved to current directory ./ by default (press ^d in app for ~/Downloads).
  Powered by yt-dlp — YouTube, X, Instagram, Threads, TikTok & 1800+ sites.
`

const args = parseArgs(process.argv.slice(2))

if (args.error) {
  console.error(`yoinks: ${args.error}\nTry “yoinks --help” for usage.`)
  process.exit(1)
}

if (args.help) {
  console.log(HELP)
  process.exit(0)
}

if (args.version) {
  console.log(VERSION)
  process.exit(0)
}

const initialUrl = args.initialUrl
const initialThemeMode = args.themeMode ?? 'auto'

const isTTY = Boolean(process.stdout.isTTY)
const useAltScreen = isTTY && !args.plain && process.env.TERM !== 'dumb'

// no url given — offer the clipboard url (⇥ to paste) when it already holds one
let clipboardUrl: string | undefined
if (!initialUrl && isTTY) {
  const clipped = readClipboard().trim()
  // reject multi-line clipboard content — new URL() silently strips newlines
  if (clipped && !/\s/.test(clipped) && isProbablyUrl(clipped)) clipboardUrl = clipped
}
const enterAltScreen = () => process.stdout.write('\x1b[?1049h\x1b[H')
// also switch mouse tracking off — a crash can skip React effect cleanup
const leaveAltScreen = () => process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?1049l')

if (useAltScreen) {
  enterAltScreen()
  process.on('exit', leaveAltScreen)
  // restore the terminal BEFORE a crash prints, or the stack trace is
  // wiped along with the alternate screen and the app looks like it
  // silently quit
  for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error: unknown) => {
      leaveAltScreen()
      console.error(error)
      process.exit(1)
    })
  }

  process.on('SIGINT', () => {
    leaveAltScreen()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    leaveAltScreen()
    process.exit(143)
  })
}

let outcome: Outcome = {}
const {waitUntilExit} = render(
  <App
    initialUrl={initialUrl}
    clipboardUrl={clipboardUrl}
    initialThemeMode={initialThemeMode}
    plain={args.plain}
    noMouse={args.noMouse}
    noMotion={args.noMotion}
    outputDir={args.outputDir}
    onOutcome={result => (outcome = result)}
  />,
  // keep a copy of every frame so clicks can be hit-tested against it
  {stdout: captureFrames(process.stdout)},
)

await waitUntilExit()

if (useAltScreen) leaveAltScreen()
if (outcome.filepath) {
  console.log(`✓ yoinked → ${outcome.filepath}`)
} else if (outcome.error) {
  process.exit(1)
}
