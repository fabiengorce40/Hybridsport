import { fireEvent, screen } from '@testing-library/react';
/** Le vrai parcours V2.1, partagé par les tests de séance et de création de programme. */
export function completeStrengthCustomization(o: { frequency?:number; allDays?:boolean } = {}) {
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
 click('Me tonifier et me remettre en forme');click('Suivant · Musculation');
 click('Suivant · Musculation');
 fireEvent.change(screen.getByLabelText('Depuis combien de mois pratiquez-vous la musculation ?'),{target:{value:'6'}});
 fireEvent.change(screen.getByLabelText('Séances régulières par semaine sur les derniers mois'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Maîtrise des mouvements'),{target:{value:'confident'}});
 click('Suivant · Musculation');
 if(o.frequency)fireEvent.change(screen.getByLabelText('Séances Musculation par semaine'),{target:{value:String(o.frequency)}});
 if(o.allDays){for(const el of screen.getAllByLabelText(/^Temps disponible le /))fireEvent.change(el,{target:{value:'90'}}); for(const el of screen.getAllByRole('checkbox'))if(!(el as HTMLInputElement).checked)fireEvent.click(el);}
 click('Suivant · Musculation');
 fireEvent.change(screen.getByLabelText('Lieu d’entraînement'),{target:{value:'preset.full_gym'}});
 click('Suivant · Musculation');click('Suivant · Musculation');click('Confirmer ma personnalisation');
}
