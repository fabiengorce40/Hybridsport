import { fireEvent, screen } from '@testing-library/react';
/** Le vrai parcours V2.1, partagé par les tests de séance et de création de programme. */
export function completeStrengthCustomization(o: { frequency?:number } = {}) {
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name}));
 click('Me tonifier et me remettre en forme');click('Suivant · Musculation');
 click('Suivant · Musculation');
 fireEvent.change(screen.getByLabelText('Depuis combien de mois pratiquez-vous la musculation ?'),{target:{value:'6'}});
 fireEvent.change(screen.getByLabelText('Séances régulières par semaine sur les derniers mois'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText('Maîtrise des mouvements'),{target:{value:'confident'}});
 click('Suivant · Musculation');
 if(o.frequency)fireEvent.change(screen.getByLabelText('Séances Musculation par semaine'),{target:{value:String(o.frequency)}});
 // Reprise 3A : disponibilités et jours Musculation à l'étape « Disponibilités » (voir `openAllDays`).
 click('Suivant · Musculation');
 fireEvent.change(screen.getByLabelText('Lieu d’entraînement'),{target:{value:'preset.full_gym'}});
 click('Suivant · Musculation');click('Suivant · Musculation');click('Confirmer ma personnalisation');
}

/** Étape « Disponibilités » : 90 min chaque jour ; les jours Musculation suivent la proposition (tous les jours disponibles). */
export function openAllDays() {
 for(const el of screen.getAllByLabelText(/^Temps disponible le /))fireEvent.change(el,{target:{value:'90'}});
}
