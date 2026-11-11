/** Playfield Pro anatomical art — new vector study, deliberately more detailed than
 * the original geometric torso. The displayed muscle group follows the exercise;
 * this remains an illustrative guide and not a clinical muscle diagram.
 */
export function PlayfieldAnatomy({ target = 'chest' }: { target?: 'chest' | 'shoulders' | 'arms' | 'back' }) {
  const primary = '#FA6A58';
  const neutral = '#BAC5D2';
  const pec = target==='chest' ? primary : neutral;
  const deltoid = target==='shoulders' ? primary : '#B2C0CF';
  const biceps = target==='arms' ? primary : '#B5C5D5';
  const muscleFibers = target==='chest' ? '#B84039' : '#8292A5';
  return <svg className="pf-anatomy" viewBox="0 0 300 232" role="img" aria-label="Schéma anatomique illustratif du haut du corps avec groupes musculaires mis en évidence">
    <defs>
      <linearGradient id="pa-bg" x1="0" y1="0" x2=".92" y2="1">
        <stop stopColor="#FBFCFE"/><stop offset=".6" stopColor="#F0F4F8"/><stop offset="1" stopColor="#E6ECF3"/>
      </linearGradient>
      <linearGradient id="pa-body" x1="0" y1="0" x2="1" y2=".35">
        <stop stopColor="#92A4B9"/><stop offset=".18" stopColor="#D6DFE8"/><stop offset=".48" stopColor="#FAFBFD"/><stop offset=".72" stopColor="#DDE5EC"/><stop offset="1" stopColor="#889BAF"/>
      </linearGradient>
      <linearGradient id="pa-musc" x1="0" y1="0" x2=".9" y2="1">
        <stop stopColor="#FF9D87"/><stop offset=".31" stopColor="#FA6A58"/><stop offset=".76" stopColor="#DB5147"/><stop offset="1" stopColor="#A93839"/>
      </linearGradient>
      <linearGradient id="pa-side" x1="0" y1="0" x2=".9" y2="0">
        <stop stopColor="#8EA4B7"/><stop offset=".47" stopColor="#E2E9F0"/><stop offset="1" stopColor="#B5C4D4"/>
      </linearGradient>
      <filter id="pa-shade" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2.7"/></filter>
    </defs>
    <rect width="300" height="232" rx="16" fill="url(#pa-bg)"/>
    <path d="M0 219Q153 199 300 222V232H0Z" fill="#E9EFF5"/>
    {/* Head and neck are cropped intentionally, like the official anatomical plate. */}
    <path d="M133 -15Q121 11 133 30L137 52H162L168 31Q179 7 164 -15Z" fill="url(#pa-body)" stroke="#7C90A4" strokeWidth="1.5"/>
    <path d="M119 31Q120 45 112 53L80 63Q58 68 48 92L26 170L12 212L31 225L48 209L76 149L81 205Q116 222 150 223Q184 221 219 205L223 149L252 208L272 225L289 212L275 170L250 92Q242 70 220 63L187 53Q179 45 181 31" fill="url(#pa-body)" stroke="#62778D" strokeWidth="1.7"/>
    {/* Trapezius/clavicle layers, no disconnected shoulder outlines. */}
    <path d="M123 43Q133 52 150 54Q166 52 179 43L202 63L187 80Q172 74 150 80Q130 74 112 80L98 63Z" fill="#DCE4EB" stroke="#8397AA" strokeWidth="1.2"/>
    <path d="M147 58L120 65L99 76M153 58L180 65L201 76" fill="none" stroke="#869AAC" strokeWidth="2.8" strokeLinecap="round"/>
    <path d="M145 60L150 78L155 60" fill="none" stroke="#8598AB" strokeWidth="1.7"/>
    {/* Deltoids follow rounded shoulder caps and insert into upper-arm. */}
    <path d="M97 66Q76 60 62 78Q53 89 61 114Q70 132 85 129Q96 105 108 87Q110 73 97 66Z" fill={deltoid} stroke="#647D94" strokeWidth="1.5"/>
    <path d="M203 66Q224 60 238 78Q247 89 239 114Q230 132 215 129Q204 105 192 87Q190 73 203 66Z" fill={deltoid} stroke="#647D94" strokeWidth="1.5"/>
    <path d="M69 80Q78 89 82 108M232 80Q223 89 218 108" fill="none" stroke="#ECF1F5" strokeWidth="3.8" opacity=".7"/>
    {/* Biceps, triceps and forearms rendered as nested tapered bundles. */}
    <path d="M66 115Q56 138 49 166L27 213" fill="none" stroke="#98ACC0" strokeWidth="25" strokeLinecap="round"/>
    <path d="M234 115Q244 138 251 166L273 213" fill="none" stroke="#98ACC0" strokeWidth="25" strokeLinecap="round"/>
    <path d="M62 115Q60 136 53 153L43 172M238 115Q240 136 247 153L257 172" fill="none" stroke={biceps} strokeWidth="18" strokeLinecap="round"/>
    <path d="M41 174L26 211M259 174L274 211" stroke="url(#pa-side)" strokeWidth="19" strokeLinecap="round"/>
    <path d="M55 145L43 170M245 145L257 170" fill="none" stroke="#E8EEF3" strokeWidth="2.5" opacity=".75"/>
    {/* Serratus and obliques at the lateral rib cage. */}
    <path d="M88 113L97 128L89 144L99 154L88 170L102 182L98 199" fill="none" stroke="#7A8FA5" strokeWidth="1.5"/>
    <path d="M212 113L203 128L211 144L201 154L212 170L198 182L202 199" fill="none" stroke="#7A8FA5" strokeWidth="1.5"/>
    <path d="M86 126L101 139M88 145L103 157M91 166L105 178M214 126L199 139M212 145L197 157M209 166L195 178" fill="none" stroke="#F4F7F9" strokeWidth="2" opacity=".68"/>
    {/* Pectoralis major: convex, asymmetric anatomical muscle contours, not block shapes. */}
    <path d="M145 86Q129 76 111 77Q98 78 95 98L94 116Q109 140 144 136L148 101Z" fill={target==='chest'?'url(#pa-musc)':pec} stroke="#9B5F60" strokeWidth="1.8"/>
    <path d="M155 86Q171 76 189 77Q202 78 205 98L206 116Q191 140 156 136L152 101Z" fill={target==='chest'?'url(#pa-musc)':pec} stroke="#9B5F60" strokeWidth="1.8"/>
    <path d="M102 91Q123 81 141 92M198 91Q177 81 159 92" fill="none" stroke="#FFF0E8" strokeWidth="2.5" opacity=".7"/>
    <path d="M95 119Q115 141 145 137M205 119Q185 141 155 137" fill="none" stroke="#8E4F52" strokeWidth="2.1" opacity=".8"/>
    {/* Striation cues radiate from the humeral insertions, matching scientific drawings. */}
    {[0,1,2,3,4,5].map(i=><g key={i} opacity=".45" fill="none" stroke={muscleFibers} strokeWidth=".8">
      <path d={`M${99+i*3} ${90+i*3}Q${117+i*2} ${98+i*2} ${143-i} ${112+i*3}`}/>
      <path d={`M${201-i*3} ${90+i*3}Q${183-i*2} ${98+i*2} ${157+i} ${112+i*3}`}/>
    </g>)}
    {/* Sternum / rectus abdominis, curved compartments and shaded tendinous intersections. */}
    <path d="M150 101L150 217" fill="none" stroke="#667E97" strokeWidth="2.6"/>
    <path d="M105 145Q123 140 146 144V164Q119 169 105 162Z" fill="#D9E3EC" stroke="#8598AA" strokeWidth="1.3"/>
    <path d="M195 145Q177 140 154 144V164Q181 169 195 162Z" fill="#D9E3EC" stroke="#8598AA" strokeWidth="1.3"/>
    <path d="M106 169Q126 166 146 171V188Q126 194 108 186Z" fill="#DAE4EC" stroke="#8296AB" strokeWidth="1.3"/>
    <path d="M194 169Q174 166 154 171V188Q174 194 192 186Z" fill="#DAE4EC" stroke="#8296AB" strokeWidth="1.3"/>
    <path d="M110 192Q128 189 146 193V208Q124 214 111 207Z" fill="#D9E2EB" stroke="#8296AB" strokeWidth="1.2"/>
    <path d="M190 192Q172 189 154 193V208Q176 214 189 207Z" fill="#D9E2EB" stroke="#8296AB" strokeWidth="1.2"/>
    <path d="M104 160L146 162M154 162L196 160M108 186L146 188M154 188L192 186" stroke="#F6F8FC" strokeWidth="2" opacity=".7"/>
    <path d="M88 206Q150 228 212 206" fill="none" stroke="#647B94" strokeWidth="1.6"/>
  </svg>;
}
