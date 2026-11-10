/** Original vector mark; no bitmap screenshots are used as UI. */
export function PlayfieldLogo() {
  return <span className="pf-logo" role="img" aria-label="REKKA">
    <svg className="pf-logo-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#1647C8" d="M7 5h23c8 0 13 4 13 12 0 7-4 12-11 13l8 13H27L16 25h12c3 0 5-2 5-5s-2-5-5-5H13z"/>
      <path fill="#FDCB32" d="M4 33 12 18h11L13 43H2z"/>
    </svg>
    <span className="pf-logo-wordmark">REKKA</span>
  </span>;
}
