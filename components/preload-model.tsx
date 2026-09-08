'use client'

import ReactDOM from 'react-dom'

/**
 * The GLB is the largest thing on the home route's critical path and is
 * fetched by a lazily-imported client chunk, so the browser would not learn
 * about it until late.
 *
 * This lives on the route rather than in the root layout: a `<link rel=
 * "preload">` in the layout fires on every route under it, and routes that
 * never mount the canvas (app/menu) would download 1.4 MB they have no use
 * for, then log "preloaded but not used within a few seconds".
 *
 * `ReactDOM.preload` is what the App Router supports for this — the
 * Metadata API has no equivalent field.
 */
export function PreloadModel({ href }: { href: string }) {
  ReactDOM.preload(href, { as: 'fetch', crossOrigin: 'anonymous' })
  return null
}
