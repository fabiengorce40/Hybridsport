import type { ReactNode } from 'react';
/** Functional navigation symbols; fixed vector paths, no decorative type glyphs. */
export function ProfileIcon({kind}:{kind:string}) {
const paths:Record<string,ReactNode>={
 objectives:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 8-8m-1-2 1 2 2 1"/></>,
 availability:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4M7 14h2m6 0h2M7 18h2"/></>,
 equipment:<><path d="M2 10v4m3-8v12m3-14v16m0-8h8m0-8v16m3-14v12m3-8v4"/></>,
 sports:<><circle cx="15" cy="4" r="2"/><path d="m9 9 4-2 4 4 4 1M13 7l-3 7-5 2-3 5m8-7 5 2 1 5M9 9l-4 3-3-1"/></>,
 data:<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 10c0 4 16 4 16 0M4 15c0 4 16 4 16 0"/></>,
 settings:<><path d="m9 2 6 0 1 3 3 1 3 5-2 2 0 3-5 5-3-1-3 1-5-5 0-3-2-2 3-5 3-1Z"/><circle cx="12" cy="12" r="4"/></>
};return <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]??paths.settings}</svg>;
}
