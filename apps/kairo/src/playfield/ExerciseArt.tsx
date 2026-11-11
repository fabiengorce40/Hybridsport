/** Original shaded workout illustration for the Playfield Pro exercise card.
 * Anatomical perspective is indicative. The independent-dumbbell version never
 * depicts a continuous bar, and every plate hub remains coaxial with its handle.
 */
export function PlayfieldBenchArt({ dumbbells }: { dumbbells:boolean }) {
  const midY=66;
  return <svg className="pf-bench-art" viewBox="0 0 620 255" role="img" data-equipment={dumbbells ? "dumbbells" : "barbell"}
    aria-label={dumbbells?'Développé couché : deux haltères indépendants, bras tendus':'Développé couché : barre olympique et disques alignés'}>
    <defs>
      <linearGradient id="pf-sky" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#EDF3FD"/><stop offset=".64" stopColor="#F5F6FB"/><stop offset="1" stopColor="#FFD3C0"/>
      </linearGradient>
      <linearGradient id="pf-navy-shirt" x1=".1" y1="0" x2=".9" y2="1">
        <stop stopColor="#1D5FE3"/><stop offset=".32" stopColor="#1647C8"/><stop offset=".72" stopColor="#102E80"/><stop offset="1" stopColor="#061F56"/>
      </linearGradient>
      <linearGradient id="pf-metal" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#F1F4FF"/><stop offset=".2" stopColor="#BFC9DD"/><stop offset=".43" stopColor="#4C6286"/><stop offset=".65" stopColor="#14294E"/><stop offset=".85" stopColor="#96A7BD"/><stop offset="1" stopColor="#152E54"/>
      </linearGradient>
      <linearGradient id="pf-plate" x1=".1" y1="0" x2=".9" y2="1">
        <stop stopColor="#2E5695"/><stop offset=".25" stopColor="#1A3C77"/><stop offset=".55" stopColor="#081F4D"/><stop offset=".9" stopColor="#081632"/><stop offset="1" stopColor="#37598D"/>
      </linearGradient>
      <linearGradient id="pf-skin" x1=".18" y1="0" x2=".85" y2="1">
        <stop stopColor="#FFDCB5"/><stop offset=".35" stopColor="#EFB18C"/><stop offset=".65" stopColor="#C88766"/><stop offset="1" stopColor="#9D5F49"/>
      </linearGradient>
      <linearGradient id="pf-red" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#FF926E"/><stop offset=".7" stopColor="#FA6A58"/><stop offset="1" stopColor="#D74A3F"/>
      </linearGradient>
      <filter id="pf-soft-shadow" x="-25%" y="-45%" width="150%" height="190%">
        <feGaussianBlur stdDeviation="10"/>
      </filter>
      <filter id="pf-small-shadow" x="-20%" y="-30%" width="140%" height="160%">
        <feGaussianBlur stdDeviation="3"/>
      </filter>
    </defs>
    <rect width="620" height="255" rx="16" fill="url(#pf-sky)"/>
    <path d="M442 255L620 104V255Z" fill="#FA6A58" opacity=".92"/>
    <path d="M0 216Q270 181 620 226V255H0Z" fill="#DDE5F2"/>
    <ellipse cx="347" cy="223" rx="228" ry="18" fill="#091937" opacity=".18" filter="url(#pf-soft-shadow)"/>
    {/* Realistic three-quarter bench is beneath torso and hips. */}
    <path d="M126 190L457 193L475 211L139 206Z" fill="#0B2349"/>
    <path d="M130 187Q134 179 149 179H431Q456 179 462 193L145 202Z" fill="#142E56"/>
    <path d="M165 207L163 250M445 208L448 250" fill="none" stroke="url(#pf-metal)" strokeWidth="12" strokeLinecap="round"/>
    <path d="M152 250H180M433 250H460" stroke="#526783" strokeWidth="6" strokeLinecap="round"/>
    {/* Athlete: shoulders and chest supported, two bent legs and planted shoes. */}
    <path d="M405 178Q445 161 478 180Q503 194 517 218" fill="none" stroke="#192B50" strokeWidth="39" strokeLinecap="round"/>
    <path d="M489 209Q506 215 530 229" fill="none" stroke="#263C66" strokeWidth="27" strokeLinecap="round"/>
    <path d="M513 227l30 4" stroke="url(#pf-red)" strokeWidth="20" strokeLinecap="round"/>
    <path d="M266 167Q305 151 371 158Q399 158 427 172Q434 180 412 195L293 196Q267 190 248 187Z" fill="url(#pf-navy-shirt)"/>
    <path d="M276 176Q313 158 356 172M300 188Q361 175 398 184" fill="none" stroke="#8CA9EE" strokeWidth="3" opacity=".6"/>
    <path d="M345 160Q360 171 372 185" stroke="#071E53" strokeWidth="7" opacity=".55"/>
    {/* Hair and angled, shaded face. */}
    <path d="M212 172Q210 158 230 152Q248 149 261 161L264 184Q247 196 224 190Z" fill="url(#pf-skin)"/>
    <path d="M213 173Q208 159 224 150Q244 141 257 152L263 163Q251 163 241 157Q227 164 225 174Z" fill="#0A1E34"/>
    <path d="M248 187Q251 193 263 184" fill="none" stroke="#7F4634" strokeWidth="3" strokeLinecap="round"/>
    <path d="M259 180Q269 176 275 185" stroke="#F5BC99" strokeWidth="11" strokeLinecap="round"/>
    {/* Real bent elbows remain under each individual hand grip. */}
    <path d="M300 169Q282 153 294 131L306 86" stroke="#A7654E" strokeWidth="23" fill="none" opacity=".40" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M302 166Q294 143 303 128L309 86" stroke="url(#pf-skin)" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M402 173Q423 151 416 131L406 86" stroke="#A7654E" strokeWidth="23" fill="none" opacity=".40" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M400 169Q410 143 407 125L403 86" stroke="url(#pf-skin)" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M306 85l14 0M396 84l14 0" stroke="#E9A780" strokeWidth="13" strokeLinecap="round"/>
    {dumbbells ? <g>
      {[307,402].map(x=><g key={x} transform={`translate(${x} ${midY})`}>
        <rect x="-49" y="-6" width="98" height="12" rx="5" fill="url(#pf-metal)"/>
        <rect x="-33" y="-24" width="13" height="48" rx="4" fill="#102D67" stroke="#4D7AB9" strokeWidth="2"/>
        <rect x="-46" y="-29" width="10" height="58" rx="3" fill="url(#pf-plate)"/>
        <rect x="20" y="-24" width="13" height="48" rx="4" fill="#102D67" stroke="#4D7AB9" strokeWidth="2"/>
        <rect x="36" y="-29" width="10" height="58" rx="3" fill="url(#pf-plate)"/>
        <path d="M-20 -20V20M26 -20V20" stroke="#FDCB32" strokeWidth="3" opacity=".65"/>
      </g>)}
    </g> : <g>
      <rect x="58" y={midY-6} width="499" height="13" rx="5" fill="url(#pf-metal)"/>
      {[110,520].map(x=><g key={x} transform={`translate(${x} ${midY})`}>
        <ellipse cx="23" cy="0" rx="26" ry="70" fill="#0B1D3E" opacity=".60"/>
        <rect x="-5" y="-69" width="25" height="138" rx="8" fill="#143870"/>
        <ellipse cx="-7" cy="0" rx="26" ry="69" fill="url(#pf-plate)" stroke="#5376AB" strokeWidth="4"/>
        <ellipse cx="-7" cy="0" rx="18" ry="60" fill="none" stroke="#1A396B" strokeWidth="4"/>
        <ellipse cx="-7" cy="0" rx="7" ry="11" fill="#D7E2F2" stroke="#45668D" strokeWidth="4"/>
        <text x="-7" y="-18" textAnchor="middle" fontSize="17" fontWeight="900" fill="#F2F6FF">20</text>
        <text x="-7" y="-5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#F2F6FF">KG</text>
      </g>)}
    </g>}
    <path d="M165 211L458 211" stroke="#FFF" strokeWidth="2" opacity=".2"/>
  </svg>;
}
