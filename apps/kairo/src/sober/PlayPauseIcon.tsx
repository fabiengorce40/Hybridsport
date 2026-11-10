/** Pictogramme SVG lecture / pause centré géométriquement (aucun caractère typographique). */
export function PlayPauseIcon({ paused }: { paused: boolean }) {
  return <svg className="v31-playpause" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {paused
      ? <path d="M9 6.2L18.2 12L9 17.8Z"/>
      : <><rect x="7" y="6" width="3.6" height="12" rx="1"/><rect x="13.4" y="6" width="3.6" height="12" rx="1"/></>}
  </svg>;
}
