import { useState } from 'react';
import { updateStrengthPersonalization, strengthPersonalizationSummary } from '@hybridsport/app-core';
import type { ProfileInput } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';
import { StrengthCustomization } from './StrengthCustomization.js';
export function StrengthProfileScreen({onBack}:{onBack:()=>void}) {
 const store=useStore();const [draft,setDraft]=useState<ProfileInput|null>(store.state.profile);const [saved,setSaved]=useState(false);
 if(!draft)return null;
 const dirty=JSON.stringify(draft)!==JSON.stringify(store.state.profile);
 const summary=strengthPersonalizationSummary(draft);
 return <div className="screen"><button className="btn ghost" onClick={onBack}>Retour au profil</button><h1 className="screen-title">Ma musculation</h1>
  <StrengthCustomization p={draft} set={f=>{setDraft(x=>x?f(x):x);setSaved(false);}}/>
  <Notice>Les séances déjà planifiées, commencées et terminées restent conservées. Vos nouveaux choix s’appliqueront aux prochaines semaines à planifier. Aucune performance ni charge passée n’est effacée.</Notice>
  {summary&&<p className="tiny">{summary.conflict}</p>}
  <button className="btn primary block" disabled={!dirty||!draft.strength.personalization?.completed} onClick={()=>{if(store.apply((s,c)=>updateStrengthPersonalization(s,draft,c)))setSaved(true);}}>Enregistrer mes objectifs Musculation</button>
  {saved&&<p role="status">Objectifs enregistrés. Vos séances déjà planifiées sont conservées.</p>}
 </div>;
}
