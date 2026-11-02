import { StrengthReplanControl } from './StrengthReplan.js';
import { useState } from 'react';
import { updateStrengthPersonalization, strengthPersonalizationSummary } from '@hybridsport/app-core';
import type { ProfileInput } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';
import { StrengthCustomization } from './StrengthCustomization.js';
export function StrengthProfileScreen({onBack}:{onBack:()=>void}) {
 const store=useStore();const [draft,setDraft]=useState<ProfileInput|null>(store.state.profile);const [saved,setSaved]=useState(false);
 if(!draft)return null;
 const editable=(p:ProfileInput|null)=>p?[p.strength,p.availability,p.equipment.presetId,p.equipment.items]:null;
 const dirty=JSON.stringify(editable(draft))!==JSON.stringify(editable(store.state.profile));
 const summary=strengthPersonalizationSummary(draft);
 return <div className="screen"><button className="btn ghost" onClick={onBack}>Retour au profil</button><h1 className="screen-title">Ma musculation</h1>
  <StrengthCustomization p={draft} set={f=>{setDraft(x=>x?f(x):x);setSaved(false);}}/>
  <Notice>Option « Prochaines semaines » : les séances déjà planifiées restent inchangées. Pour appliquer dès maintenant, utilisez « Recalculer ma semaine » et confirmez l’aperçu. Les séances commencées ou réalisées et leurs performances restent toujours conservées.</Notice>
  {summary&&<p className="tiny">{summary.conflict}</p>}
  <button className="btn primary block" disabled={!dirty||!draft.strength.personalization?.completed} onClick={()=>{if(store.apply((s,c)=>updateStrengthPersonalization(s,draft,c)))setSaved(true);}}>Appliquer aux prochaines semaines</button>
  <StrengthReplanControl profile={draft} onConfirmed={()=>setSaved(false)}/>
  {saved&&<p role="status">Objectifs enregistrés. Vos séances déjà planifiées sont conservées.</p>}
 </div>;
}
