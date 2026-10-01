import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {getDownloadsDir, parseWindowsDownloadsPath} from './downloads-dir.js'

test('uses an explicitly redirected Windows Downloads path, including spaces', () => {
  const registryOutput = [
    'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',
    '    {374DE290-123F-4565-9164-39C4925E467B}    REG_SZ    D:\\Users\\Me\\My Downloads',
  ].join('\n')

  assert.equal(parseWindowsDownloadsPath(registryOutput, {}), 'D:\\Users\\Me\\My Downloads')
})

test('expands Windows environment variables without depending on their casing', () => {
  const registryOutput = '    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    %userprofile%\\Downloads'

  assert.equal(
    parseWindowsDownloadsPath(registryOutput, {USERPROFILE: 'D:\\Users\\Me'}),
    'D:\\Users\\Me\\Downloads',
  )
})

test('ignores malformed or unexpandable registry values', () => {
  assert.equal(parseWindowsDownloadsPath('some unrelated registry value', {}), undefined)
  assert.equal(
    parseWindowsDownloadsPath('    {374DE290-123F-4565-9164-39C4925E467B}    REG_EXPAND_SZ    %UNKNOWN%\\Downloads', {}),
    undefined,
  )
})

test('keeps the conventional Downloads path on non-Windows systems', () => {
  assert.equal(getDownloadsDir('linux', '/home/me'), path.join('/home/me', 'Downloads'))
})
