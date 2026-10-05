/**
 * Champ de durée mobile : [ h ] [ min ] [ s ], chaque composant au clavier NUMÉRIQUE (aucun « : » à saisir), grandes
 * zones tactiles, unités clairement identifiées. L'assemblage et la validation sont dans `duration.ts`.
 */
import type { DurationParts } from './duration.js';

const digits = (v: string, max: number) => v.replace(/[^0-9]/g, '').slice(0, max);

export function DurationInput({ label, value, onChange, withHours, error }: {
  label: string; value: DurationParts; onChange: (v: DurationParts) => void; withHours: boolean; error?: string | null;
}) {
  const field = (key: keyof DurationParts, unit: string, aria: string, max: number, placeholder: string) => (
    <label className="k-dur-part">
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="next"
        aria-label={`${label} : ${aria}`} aria-invalid={error ? true : undefined}
        value={value[key]} placeholder={placeholder} maxLength={max}
        onChange={(e) => onChange({ ...value, [key]: digits(e.target.value, max) })}
      />
      <span aria-hidden="true">{unit}</span>
    </label>
  );
  return (
    <fieldset className={`k-dur ${error ? 'invalid' : ''}`}>
      <legend>{label}</legend>
      <div className="k-dur-row">
        {withHours && field('h', 'h', 'heures', 2, '0')}
        {field('m', 'min', 'minutes', 3, '00')}
        {field('s', 's', 'secondes', 2, '00')}
      </div>
      {error && <div className="k-dur-error" role="alert">{error}</div>}
    </fieldset>
  );
}
