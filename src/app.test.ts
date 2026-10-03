import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToString} from 'ink'
import {App} from './app.js'

test('App displays default save location as current folder (./)', () => {
  const out = renderToString(
    React.createElement(App, {
      onOutcome: () => {},
    }),
  )

  assert.match(out, /saving to:/)
  assert.match(out, /\.\/ \(current folder\)/)
  assert.match(out, /\^d to switch/)
})

test('App displays custom output directory when outputDir prop is provided', () => {
  const out = renderToString(
    React.createElement(App, {
      outputDir: '/custom/save/dir',
      onOutcome: () => {},
    }),
  )

  assert.match(out, /saving to:/)
  assert.match(out, /\/custom\/save\/dir/)
  // When explicit outputDir is provided, ^d switch hint is omitted
  assert.doesNotMatch(out, /\^d to switch/)
})
