/** Original, mechanically aligned exercise artwork.
 * This is decoration, not a substitute for a clinical exercise demonstration.
 * Barbell plate hubs and shaft use y=78; dumbbells have separate short shafts,
 * never a bar visually passing through both hands.
 */
export function PlayfieldBenchArt({ dumbbells }: { dumbbells: boolean }) {
  return <svg className="pf-bench-art" viewBox="0 0 620 255" role="img"
    aria-label={dumbbells ? 'Illustration : développé couché avec deux haltères indépendants' : 'Illustration : développé couché avec une barre droite et ses disques alignés'}>
    <defs>
      <linearGradient id="pf-art-floor" x1="0" x2="1"><stop stopColor="#F3F7FF"/><stop offset="1" stopColor="#EDF2FC"/></linearGradient>
      <linearGradient id="pf-art-blue" x1="0" x2="1"><stop stopColor="#1647C8"/><stop offset="1" stopColor="#092C83"/></linearGradient>
    </defs>
    <rect x="0" y="0" width="620" height="255" rx="24" fill="url(#pf-art-floor)"/>
    <path d="M0 214Q245 174 620 222V255H0Z" fill="#E2E9F8"/>
    <ellipse cx="317" cy="232" rx="205" ry="12" fill="#0E1B35" opacity=".12"/>
    {/* A bench on two vertical legs, under the lifter, not through the barbell. */}
    <rect x="122" y="188" width="355" height="22" rx="9" fill="#0E1B35"/>
    <path d="M163 210V243M438 210V243" stroke="#63738F" strokeWidth="10" strokeLinecap="round"/>
    {/* Legs on bench; shoes descend to floor. */}
    <path d="M389 177Q428 166 452 196L486 223" fill="none" stroke="#263B66" strokeWidth="28" strokeLinecap="round"/>
    <path d="M485 221l29 0" stroke="#FA6A58" strokeWidth="15" strokeLinecap="round"/>
    {/* Torso lies flat on the bench, head is supported. */}
    <path d="M214 175Q271 153 348 159Q384 164 395 183L379 192L224 191Z" fill="url(#pf-art-blue)"/>
    <ellipse cx="186" cy="176" rx="29" ry="21" fill="#F1AE84"/>
    <path d="M163 169Q166 150 194 151Q209 158 207 172" stroke="#0E1B35" strokeWidth="13" fill="none" strokeLinecap="round"/>
    <path d="M211 183l20 4" stroke="#EFAD87" strokeWidth="14" strokeLinecap="round"/>
    {/* Both upper arms and forearms are aligned under independent hand grips. */}
    <path d="M265 169L267 134L265 90M355 168L356 135L355 90" stroke="#F0AD83" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M263 90L271 90M352 90L360 90" stroke="#F1AE84" strokeWidth="13" strokeLinecap="round"/>
    {dumbbells ? <>
      {/* Two independently loaded dumbbells, not a long connecting bar. */}
      {[267,356].map(x=><g key={x}>
        <rect x={x-33} y="83" width="66" height="10" rx="5" fill="#536C9A"/>
        <rect x={x-28} y="69" width="11" height="38" rx="4" fill="#163A87"/>
        <rect x={x+17} y="69" width="11" height="38" rx="4" fill="#163A87"/>
        <rect x={x-36} y="77" width="8" height="22" rx="3" fill="#FDCB32"/>
        <rect x={x+28} y="77" width="8" height="22" rx="3" fill="#FDCB32"/>
      </g>)}
    </> : <>
      {/* A single straight shaft joins two coaxial weight stacks. */}
      <rect x="112" y="78" width="380" height="10" rx="5" fill="#8192B4"/>
      {[139,459].map(x=><g key={x}>
        <rect x={x-15} y="48" width="30" height="70" rx="9" fill="#0E1B35"/>
        <rect x={x-19} y="51" width="9" height="64" rx="4" fill="#FDCB32"/>
        <rect x={x+10} y="51" width="9" height="64" rx="4" fill="#FDCB32"/>
        <circle cx={x} cy="83" r="9" fill="#7F96C0"/>
      </g>)}
    </>}
    <text x="496" y="39" fill="#1647C8" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="13">REKKA</text>
  </svg>;
}
