/**
 * External link handler for Tauri desktop app.
 * Intercepts clicks on external <a> tags and opens them in the system's
 * default browser. In web mode, links open normally.
 */

import { isTauri } from './tauri'

function isExternalUrl(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin)
    return url.origin !== window.location.origin
  } catch {
    return false
  }
}

async function openInSystemBrowser(url: string): Promise<void> {
  const { open } = await import('@tauri-apps/plugin-shell')
  await open(url)
}

/**
 * Set up a global click handler that intercepts external link clicks
 * and opens them in the system's default browser.
 * Returns a cleanup function, or undefined in web mode.
 */
export function setupExternalLinkHandler(): (() => void) | undefined {
  if (!isTauri()) return undefined

  const handler = (event: MouseEvent) => {
    const anchor = (event.target as Element)?.closest?.('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href) return

    if (!href.startsWith('http://') && !href.startsWith('https://')) return
    if (!isExternalUrl(href)) return

    event.preventDefault()
    event.stopPropagation()

    void openInSystemBrowser(href)
  }

  document.addEventListener('click', handler, true)

  return () => {
    document.removeEventListener('click', handler, true)
  }
}
