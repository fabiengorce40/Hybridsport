/** REKKA Playfield Pro — original stylized anatomical study.
 * Illustration indicative only; it does not provide clinical anatomy guidance.
 * Pectorals are visually highlighted for chest-dominant exercises.
 */
export function PlayfieldAnatomy({ target = 'chest' }: { target?: 'chest' | 'shoulders' | 'arms' | 'back' }) {
 const pec = target === 'chest' ? '#FA6A58' : '#B9C7D9';
 const shoulder = target === 'shoulders' ? '#FA6A58' : '#B9C7D9';
 const arm = target === 'arms' ? '#FA6A58' : '#CDD7E3';
 return <svg className="pf-anatomy" viewBox="0 0 280 220" role="img"
   aria-label="Illustration indicative du haut du corps et des muscles sollicités">
  <defs>
   <linearGradient id="pf-muscle-body" x1="0" x2="1"><stop stopColor="#E2E8ED"/><stop offset=".5" stopColor="#FFFFFF"/><stop offset="1" stopColor="#9BABBE"/></linearGradient>
   <linearGradient id="pf-muscle-highlight" x1="0" x2="1"><stop stopColor="#E34F41"/><stop offset=".5" stopColor="#FA6A58"/><stop offset="1" stopColor="#C13C35"/></linearGradient>
   <linearGradient id="pf-muscle-bg" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F8FAFC"/><stop offset="1" stopColor="#EDF1F7"/></linearGradient>
  </defs>
  <rect width="280" height="220" rx="17" fill="url(#pf-muscle-bg)"/>
  <path d="M118 30Q120 49 112 60L93 67Q74 78 66 102L42 184L30 214M162 30Q159 49 168 60L187 67Q206 78 214 102L238 184L250 214"
    fill="none" stroke="#77899E" strokeWidth="2"/>
  <path d="M122 21Q140 9 158 21L159 44Q157 55 149 61L131 61Q123 54 121 44Z" fill="url(#pf-muscle-body)" stroke="#6B7D90" strokeWidth="1.5"/>
  <path d="M112 59Q138 68 168 59L192 74Q210 85 211 108L203 192Q169 204 140 203Q111 204 77 192L69 108Q70 85 88 74Z"
   fill="url(#pf-muscle-body)" stroke="#536B88" strokeWidth="2"/>
  <path d="M91 76Q76 78 71 94Q62 105 61 124L43 194L33 206L44 214L64 197L85 131Z"
   fill={shoulder} stroke="#647B96" strokeWidth="1.4"/>
  <path d="M189 76Q204 78 209 94Q218 105 219 124L237 194L247 206L236 214L216 197L195 131Z"
   fill={shoulder} stroke="#647B96" strokeWidth="1.4"/>
  <path d="M82 104Q78 133 62 169L55 196" fill="none" stroke={arm} strokeWidth="15" opacity=".8"/>
  <path d="M198 104Q202 133 218 169L225 196" fill="none" stroke={arm} strokeWidth="15" opacity=".8"/>
  <path d="M139 83Q117 69 95 76Q87 84 88 110Q100 134 138 128Z" fill={pec} stroke="#8B5360" strokeWidth="1.8"/>
  <path d="M141 83Q163 69 185 76Q193 84 192 110Q180 134 142 128Z" fill={pec} stroke="#8B5360" strokeWidth="1.8"/>
  <path d="M139 87L139 127M104 92L130 113M176 92L150 113" stroke="#982E2D" strokeWidth=".9" opacity=".54"/>
  <path d="M90 120Q106 136 137 138M190 120Q174 136 143 138M141 135L141 196" stroke="#8295A7" strokeWidth="1.2" fill="none"/>
  {[0,1,2].map(i=><g key={i}>
    <path d={`M103 ${145+i*18}Q115 ${141+i*18} 137 ${144+i*18}L137 ${159+i*18}Q116 ${163+i*18} 103 ${158+i*18}Z`}
      fill="#D6DFE8" stroke="#8493A7" strokeWidth="1.3"/>
    <path d={`M177 ${145+i*18}Q165 ${141+i*18} 143 ${144+i*18}L143 ${159+i*18}Q164 ${163+i*18} 177 ${158+i*18}Z`}
      fill="#D6DFE8" stroke="#8493A7" strokeWidth="1.3"/>
   </g>)}
  <path d="M112 60Q140 70 168 60" fill="none" stroke="#8495A8" strokeWidth="2"/>
  <path d="M79 192Q140 205 201 192" fill="none" stroke="#667B94" strokeWidth="1.6"/>
 </svg>;
}
