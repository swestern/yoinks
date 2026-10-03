import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import {renderToString} from 'ink'
import {ProgressBar} from './progress-bar.js'
import {ThemeProvider} from '../theme.js'

test('ProgressBar renders normal percent without crashing', () => {
  const out = renderToString(
    React.createElement(ThemeProvider, {mode: 'dark'}, React.createElement(ProgressBar, {percent: 0.5, width: 10}))
  )
  assert.match(out, /50%/)
})

test('ProgressBar safely handles NaN without throwing RangeError', () => {
  const out = renderToString(
    React.createElement(ThemeProvider, {mode: 'dark'}, React.createElement(ProgressBar, {percent: NaN, width: 10}))
  )
  assert.match(out, /0%/)
})

test('ProgressBar clamps negative and >1 percent values', () => {
  const under = renderToString(
    React.createElement(ThemeProvider, {mode: 'dark'}, React.createElement(ProgressBar, {percent: -0.5, width: 10}))
  )
  assert.match(under, /0%/)

  const over = renderToString(
    React.createElement(ThemeProvider, {mode: 'dark'}, React.createElement(ProgressBar, {percent: 1.5, width: 10}))
  )
  assert.match(over, /100%/)
})
