/**
 * Runs `html` synchronously during HTML parsing (before first paint) on full page loads.
 * The type swap keeps React from warning about client-rendered <script> tags.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
