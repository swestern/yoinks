import {spawnSync} from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const DOWNLOADS_FOLDER_ID = '{374DE290-123F-4565-9164-39C4925E467B}'
const USER_SHELL_FOLDERS = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders'

/** Parse the Windows Downloads known-folder value returned by `reg query`. */
export function parseWindowsDownloadsPath(
  output: string,
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const escapedId = DOWNLOADS_FOLDER_ID.replace(/[{}]/g, '\\$&')
  const match = new RegExp(`^\\s*${escapedId}\\s+(REG_EXPAND_SZ|REG_SZ)\\s+(.+?)\\s*$`, 'im').exec(output)
  if (!match) return undefined

  const [, valueType, registryPath] = match
  let resolvedPath = registryPath!
  if (valueType === 'REG_EXPAND_SZ') {
    const environmentByName = new Map(
      Object.entries(environment)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
        .map(([name, value]) => [name.toLowerCase(), value]),
    )
    resolvedPath = resolvedPath.replace(
      /%([^%]+)%/g,
      (variable, name: string) => environmentByName.get(name.toLowerCase()) ?? variable,
    )
    if (/%[^%]+%/.test(resolvedPath)) return undefined
  }

  return path.win32.normalize(resolvedPath)
}

/** Resolve the user's Downloads folder, honoring Windows folder redirection. */
export function getDownloadsDir(platform = process.platform, home = os.homedir()): string {
  if (platform === 'win32') {
    try {
      const result = spawnSync(
        'reg.exe',
        ['query', USER_SHELL_FOLDERS, '/v', DOWNLOADS_FOLDER_ID],
        {encoding: 'utf8', timeout: 1_000, windowsHide: true},
      )
      if (result.status === 0) {
        const downloadsPath = parseWindowsDownloadsPath(result.stdout)
        if (downloadsPath) return downloadsPath
      }
    } catch {
      // A missing or unreadable registry value falls back to the usual path.
    }
  }

  return path.join(home, 'Downloads')
}
