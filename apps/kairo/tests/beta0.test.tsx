// @vitest-environment jsdom
/**
 * Interface Beta 0 (jsdom) : onboarding Musculation / Course / hybride → programme réel → semaine → séance Strength
 * (séries réelles, chrono persisté) → fin de séance → historique ; Course (saisie, TEST) ; douleur ; rechargement ;
 * import ; statut expérimental ; Cross-training et HYROX absents. Horloge injectée (lundi 2026-10-05).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createBeta0Programme, emptyState, EQUIPMENT_PRESETS, exportState, finishProgrammeSession, MemoryStorage, saveState, selectBeta0Week, STORAGE_KEY } from '@hybridsport/app-core';
import type { AppState, Clock, ProfileInput } from '@hybridsport/app-core';
import { App } from '../src/App.js';
import { StoreProvider } from '../src/store.js';

afterEach(cleanup);
const MONDAY = '2026-10-05';
const at = (today: string, time = '07:30:00') => (): Clock => ({ today, now: `${today}T${time}.000Z` });
const mount = (storage: MemoryStorage, clock = at(MONDAY)) => render(<StoreProvider storage={storage} clock={clock}><App /></StoreProvider>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const saved = (storage: MemoryStorage): AppState => JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as AppState;
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];

type Choice = 'Musculation' | 'Course' | 'Musculation + Course';
const CHOICE_NAMES: Record<Choice, RegExp> = { Musculation: /^Musculation Séances/, Course: /^Course Footing/, 'Musculation + Course': /^Musculation \+ Course/ };
function onboard(storage: MemoryStorage, choice: Choice) {
  mount(storage);
  expect(screen.getByRole('button', { name: 'Commencer' })).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByLabelText(/J’ai compris/));
  click('Commencer');
  // CT / HYROX absents de l'onboarding Beta 0.
  expect(screen.queryByText(/HYROX|Cross-training/)).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: CHOICE_NAMES[choice] }));
  click('Continuer');
  if (choice !== 'Musculation') {
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Distance (km)'), { target: { value: '5' } });
  }
  click('Continuer');
  click('Continuer');
  if (choice === 'Musculation + Course') expect(screen.getByRole('radio', { name: 'Priorité Course' })).toBeTruthy();
  click('Créer mon programme');
}

function profileInput(o: Partial<ProfileInput> = {}): ProfileInput {
  return {
    displayName: '', level: 'intermediate', priorities: ['running'],
    strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
    running: { enabled: true, population: 'P_R2', goal: 'HALF_MARATHON', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: [...fullGym] },
    availability: [60, 45, 60, 0, 60, 90, 75], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
  };
}

/** Démarre la séance Strength du jour et renvoie l'index de la première série modifiable. */
function openStrength() {
  click('Commencer la séance');
  click('Commencer la séance');
}

describe('onboarding Beta 0 et programme', () => {
  it('Musculation : programme créé par le chemin Beta 0, semaine affichée, statut expérimental visible', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    const s = saved(storage);
    expect(s.programmeState?.definition.sports.map((x) => x.sport)).toEqual(['strength']);
    expect(Object.keys(s.sessions)).toEqual([]);
    expect(screen.getAllByText('BETA EXPÉRIMENTALE').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Commencer la séance' })).toBeTruthy();
    click('Planning');
    expect(screen.getAllByRole('button', { name: /Musculation : Full body, Prévue/ }).length).toBe(2);
    expect(screen.queryByText('str_full_body')).toBeNull();
    click('Programme');
    expect(screen.getByText(/Certaines règles de planification sont encore en cours de validation/)).toBeTruthy();
  });

  it('Course : dernière course déclarée, séances composées par le moteur Course', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Course');
    const s = saved(storage);
    expect(s.running.realized).toHaveLength(1);
    expect(s.programmeState?.definition.sports[0]).toMatchObject({ sport: 'running', composition: 'engine' });
    click('Planning');
    expect(screen.getAllByRole('button', { name: /^Course : /}).length).toBe(2);
  });

  it('Musculation + Course : hybride planifié (une séance par jour), priorité déclarée', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation + Course');
    const s = saved(storage);
    expect(s.programmeState?.definition.priorities).toEqual(['strength', 'running']);
    const w = s.planner.weeks[MONDAY];
    expect(w?.hybrid).toBe(true);
    expect(w?.authority).toBe('beta0_experimental');
    const dates = (w?.requests ?? []).filter((r) => r.status === 'planned').map((r) => r.date);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe('cohérence Accueil / Planning / selector', () => {
  // Scénario réel : mardi disponible 30 min ⇒ 2e course essayée mardi puis refusée ; séances placées lundi, mercredi, samedi.
  const seed = (storage: MemoryStorage): AppState => {
    const s = createBeta0Programme(emptyState(), profileInput({
      priorities: ['strength', 'running'], strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
      running: { ...profileInput().running, goal: 'GENERAL_RUNNING', sessionsPerWeek: 2 }, availability: [60, 30, 60, 0, 0, 90, 0],
    }), at(MONDAY)(), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    expect(saveState(storage, s).ok).toBe(true);
    return s;
  };
  const stripMarked = (): string[] => [...document.querySelectorAll('.weekstrip .c')].filter((c) => Number(c.getAttribute('data-sessions')) > 0).map((c) => c.getAttribute('data-date') ?? '');

  it('jours marqués sur l’Accueil === jours portant une séance planifiée dans selectBeta0Week (lundi, mercredi, samedi ; jamais mardi)', () => {
    const storage = new MemoryStorage();
    const s = seed(storage);
    mount(storage);
    const canonical = (selectBeta0Week(s, MONDAY)?.days ?? []).filter((d) => d.sessions.length > 0).map((d) => d.date);
    expect(canonical).toEqual(['2026-10-05', '2026-10-07', '2026-10-10']);
    expect(stripMarked()).toEqual(canonical);
    expect(document.querySelectorAll('.weekstrip .dots .dot')).toHaveLength(3);
    expect(document.querySelector('.weekstrip .c[data-date="2026-10-06"] .dot')?.className).toBe('dot off');
    expect(screen.getByText('0 / 3 séances')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Ouvrir le planning/ }).getAttribute('aria-label')).not.toMatch(/mardi/);
    // Planning : mardi disponible sans séance ; la course refusée est listée à part, expliquée.
    click('Planning');
    const tuesday = [...document.querySelectorAll('.week .day')].find((d) => d.textContent?.includes('Mar'));
    expect(tuesday?.textContent).toContain('Disponible, aucune séance');
    expect(screen.getByText('Cette séance n’a pas pu être placée dans vos disponibilités.')).toBeTruthy();
  });

  it('états visuels : séance adaptée et course réalisée restent sur leur jour, avec leur état', () => {
    const storage = new MemoryStorage();
    let s = seed(storage);
    const days = selectBeta0Week(s, MONDAY)?.days ?? [];
    const on = (date: string) => days.find((d) => d.date === date)?.sessions[0]?.requestId ?? '';
    s = finishProgrammeSession(s, at(MONDAY, '19:00:00')(), { requestId: on('2026-10-05'), completion: 'modified', pain: false });
    s = finishProgrammeSession(s, at('2026-10-10', '19:00:00')(), { requestId: on('2026-10-10'), completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800 } });
    saveState(storage, s);
    mount(storage, at('2026-10-10', '20:00:00'));
    expect(stripMarked()).toEqual(['2026-10-05', '2026-10-07', '2026-10-10']);
    const dot = (date: string) => document.querySelector(`.weekstrip .c[data-date="${date}"] .dots .dot`)?.className;
    expect(dot('2026-10-05')).toBe('dot st-modified');
    expect(dot('2026-10-07')).toBe('dot st-planned');
    expect(dot('2026-10-10')).toBe('dot st-completed_as_prescribed');
    expect(screen.getByText('2 / 3 séances')).toBeTruthy();
  });
});

describe('Profil Course : niveau actuel, objectif, TEST', () => {
  /** Onboarding Course jusqu'à l'étape « Objectifs » incluse (callback pour la saisie du niveau actuel). */
  function onboardCourse(storage: MemoryStorage, level: () => void) {
    mount(storage);
    fireEvent.click(screen.getByLabelText(/J’ai compris/));
    click('Commencer');
    fireEvent.click(screen.getByRole('radio', { name: CHOICE_NAMES.Course }));
    click('Continuer');
    fireEvent.click(screen.getByRole('button', { name: /^Loisir entraîné/ }));
    fireEvent.change(screen.getByLabelText('Objectif'), { target: { value: 'TEN_K' } });
    fireEvent.change(screen.getByLabelText(/Date de l’objectif/), { target: { value: '2027-03-16' } });
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Distance (km)'), { target: { value: '5' } });
    level();
    click('Continuer'); click('Continuer');
    click('Créer mon programme');
  }
  const addPerformance = (o: { kind: RegExp; distance: string; chrono: string; date: string }) => {
    click('Ajouter une performance');
    const form = within(screen.getByLabelText('Ajouter une performance'));
    fireEvent.click(form.getByRole('radio', { name: o.kind }));
    fireEvent.click(form.getByRole('radio', { name: o.distance }));
    fireEvent.change(form.getByLabelText(/Chrono \(min:s/), { target: { value: o.chrono } });
    fireEvent.change(form.getByLabelText('Date de réalisation'), { target: { value: o.date } });
    fireEvent.click(form.getByRole('button', { name: 'Ajouter cette performance' }));
  };

  it('performance actuelle (10 km en 45:00) distincte de l’objectif (10 km le 16/03/2027) ; profil calculé par le moteur affiché', () => {
    const storage = new MemoryStorage();
    onboardCourse(storage, () => addPerformance({ kind: /^Chrono personnel/, distance: '10 km', chrono: '45:00', date: '2026-09-27' }));
    const st = saved(storage);
    expect(st.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: { distanceM: 10000, durationS: 2700 }, provenance: { source: 'USER_DECLARED' } })]);
    expect(st.programmeState?.definition.goals).toEqual([expect.objectContaining({ goal: 'TEN_K', targetDate: '2027-03-16' })]);
    click('Réglages');
    click(/^Profil Course/);
    expect(screen.getByLabelText(/^Chrono du/).textContent).toMatch(/10 km.*45 min.*4:30 \/km/);
    expect(screen.getByText(/^récente/)).toBeTruthy();
    // Séances clés débloquées par un 10 km récent ; allure VO₂ : ancre 3–5 km absente et pas de montre ⇒ effort, causes affichées.
    expect(screen.getByText('Seuil : disponibles')).toBeTruthy();
    expect(screen.getByText(/Non calculable : .*course ou un chrono récent de 3 à 5 km/)).toBeTruthy();
    expect(screen.getByText(/KAIRO ne calcule pas de Critical Speed/)).toBeTruthy();
    expect(screen.getByText(/Aucune zone d’allure/)).toBeTruthy();
    expect(screen.getByText(/jamais utilisé comme une performance réalisée/)).toBeTruthy();
  });

  it('« je n’ai pas de chrono récent » : TEST programmé dès la semaine 1 et visible dans le planning ; mise à jour ultérieure depuis le profil sans effacer', () => {
    const storage = new MemoryStorage();
    onboardCourse(storage, () => fireEvent.click(screen.getByLabelText(/Je n’ai pas de chrono récent/)));
    expect(saved(storage).programmeState?.assessments).toEqual([expect.objectContaining({ sport: 'running', status: 'scheduled' })]);
    click('Planning');
    expect(screen.getAllByText('TEST').length).toBe(1);
    click('Réglages');
    click(/^Profil Course/);
    expect(screen.getByText(/Test chronométré programmé/)).toBeTruthy();
    addPerformance({ kind: /^Course officielle/, distance: '5 km', chrono: '22:30', date: '2026-10-04' });
    addPerformance({ kind: /^Chrono personnel/, distance: '3 km', chrono: '12:40', date: '2026-10-05' });
    expect(saved(storage).running.references.map((r) => [r.type, r.values.distanceM])).toEqual([['RACE_RESULT', 5000], ['TIME_TRIAL', 3000]]);
    expect(screen.getAllByLabelText(/(Course officielle|Chrono) du/)).toHaveLength(2);
  });
});

describe('durée du programme', () => {
  it('aucun choix 4 / 8 / 12 semaines ; objectif daté ⇒ date affichée et programme jusqu’à l’objectif', () => {
    const storage = new MemoryStorage();
    mount(storage);
    fireEvent.click(screen.getByLabelText(/J’ai compris/));
    click('Commencer');
    fireEvent.click(screen.getByRole('radio', { name: CHOICE_NAMES.Course }));
    click('Continuer');
    fireEvent.change(screen.getByLabelText('Objectif'), { target: { value: 'TEN_K' } });
    fireEvent.change(screen.getByLabelText(/Date de l’objectif/), { target: { value: '2027-03-14' } });
    fireEvent.change(screen.getByLabelText('Durée (min)'), { target: { value: '30' } });
    click('Continuer');
    click('Continuer');
    expect(screen.queryByText(/semaines$/)).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Durée du programme' })).toBeNull();
    expect(screen.getByText('Votre programme évolue semaine après semaine jusqu’à votre objectif.', { exact: false })).toBeTruthy();
    expect(screen.getByText(/Objectif 10 km le dimanche 14 mars/)).toBeTruthy();
    click('Créer mon programme');
    const d = saved(storage).programmeState?.definition;
    expect(d?.goals).toEqual([expect.objectContaining({ goal: 'TEN_K', targetDate: '2027-03-14' })]);
    expect(d?.horizonWeeks).toBe(23);
    click('Programme');
    expect(screen.getByText(/Objectif le dimanche 14 mars/)).toBeTruthy();
  });

  it('sans objectif daté : programme continu, sans date de fin', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    expect(saved(storage).programmeState?.definition.horizonWeeks).toBeUndefined();
    click('Programme');
    expect(screen.getByText('Votre programme évolue semaine après semaine, sans date de fin.')).toBeTruthy();
  });
});

describe('séance Strength', () => {
  it('validation d’une série : valeurs réelles enregistrées, chrono démarré automatiquement (pause, +15 s, passer)', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    openStrength();
    const reps = screen.getAllByLabelText('Répétitions réalisées') as HTMLInputElement[];
    const kg = screen.getAllByLabelText('Charge (kg)') as HTMLInputElement[];
    const ticks = screen.getAllByRole('button', { name: 'Cocher la série' }) as HTMLButtonElement[];
    // Aucune série n'est considérée faite d'office.
    expect(saved(storage).programmeLogs[Object.keys(saved(storage).programmeLogs)[0] ?? '']?.sets).toEqual([]);
    fireEvent.change(reps[0]!, { target: { value: '6' } });
    fireEvent.change(kg[0]!, { target: { value: '37.5' } });
    fireEvent.click(ticks[0]!);
    const log = Object.values(saved(storage).programmeLogs)[0];
    expect(log?.sets).toEqual([expect.objectContaining({ setIndex: 0, done: true, reps: 6, loadKg: 37.5 })]);
    expect(log?.rest).not.toBeNull();
    const timer = screen.getByRole('timer', { name: 'Chrono de repos' });
    fireEvent.click(within(timer).getByRole('button', { name: 'Mettre le repos en pause' }));
    expect(within(screen.getByRole('timer')).getByText('Repos en pause')).toBeTruthy();
    const before = Object.values(saved(storage).programmeLogs)[0]?.rest?.pausedRemainingS ?? 0;
    fireEvent.click(within(screen.getByRole('timer')).getByRole('button', { name: 'Ajouter 15 secondes' }));
    expect(Object.values(saved(storage).programmeLogs)[0]?.rest?.pausedRemainingS).toBe(before + 15);
    fireEvent.click(within(screen.getByRole('timer')).getByRole('button', { name: 'Reprendre le repos' }));
    fireEvent.click(within(screen.getByRole('timer')).getByRole('button', { name: 'Passer' }));
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.getByText(/1\/\d+ séries/)).toBeTruthy();
  });

  it('séance partiellement commencée : rechargement ⇒ série validée et chrono conservés, aucune autre série supposée faite', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    openStrength();
    const reps = screen.getAllByLabelText('Répétitions réalisées') as HTMLInputElement[];
    if (reps[0]?.value === '') fireEvent.change(reps[0], { target: { value: '8' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cocher la série' })[0]!);
    cleanup();
    mount(storage, at(MONDAY, '07:31:00'));
    click('Reprendre la séance');
    expect(screen.getAllByRole('button', { name: 'Décocher la série' })).toHaveLength(1);
    expect(screen.getByRole('timer', { name: 'Chrono de repos' })).toBeTruthy();
    expect(Object.values(saved(storage).programmeLogs)[0]?.sets.filter((x) => x.done)).toHaveLength(1);
  });

  it('fin de séance « adaptée » ⇒ enregistrée par le programme, terminée, visible dans l’historique avec les séries réelles ; conservée après rechargement', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    openStrength();
    fireEvent.change((screen.getAllByLabelText('Répétitions réalisées') as HTMLInputElement[])[0]!, { target: { value: '6' } });
    fireEvent.change((screen.getAllByLabelText('Charge (kg)') as HTMLInputElement[])[0]!, { target: { value: '40' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cocher la série' })[0]!);
    click('Terminer la séance');
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    expect((sheet.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    // « Comme prévu » sans toutes les séries : refus explicite, rien d'enregistré.
    fireEvent.click(sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByRole('alert').textContent).toMatch(/J’ai adapté la séance/);
    expect(saved(storage).programmeState?.results).toEqual([]);
    fireEvent.click(sheet.getByRole('radio', { name: 'J’ai adapté la séance' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).programmeState?.results).toEqual([expect.objectContaining({ completion: 'modified' })]);
    expect(screen.getByText(/Séance terminée/)).toBeTruthy();
    click('Retour');
    click('Planning');
    expect(screen.getAllByRole('button', { name: /Full body, Adaptée/ })).toHaveLength(1);
    click('Historique');
    expect(screen.getByText(/6 × 40 kg/)).toBeTruthy();
    cleanup();
    mount(storage);
    click('Historique');
    expect(screen.getByText(/6 × 40 kg/)).toBeTruthy();
  });
});

describe('séance Course', () => {
  it('ouverture, saisie du résultat (durée, distance), fin ⇒ historique', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Course');
    click('Commencer la séance');
    expect(screen.getAllByText(/Effort/).length).toBeGreaterThan(0);
    click('Commencer la séance');
    click('Terminer la séance');
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    fireEvent.click(sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    expect((sheet.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(sheet.getByLabelText(/Durée totale courue/), { target: { value: '32' } });
    fireEvent.change(sheet.getByLabelText(/Distance/), { target: { value: '5.4' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    const s = saved(storage);
    expect(s.programmeState?.results).toEqual([expect.objectContaining({ sport: 'running', completion: 'completed_as_prescribed' })]);
    expect(s.running.realized).toHaveLength(2);
    click('Retour');
    click('Historique');
    expect(screen.getByText(/32 min · 5.4 km/)).toBeTruthy();
  });

  it('TEST chronométré identifiable ; temps du test exigé ; référence TIME_TRIAL enregistrée', () => {
    const storage = new MemoryStorage();
    const s0 = createBeta0Programme(emptyState(), profileInput(), at(MONDAY)(), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    expect(saveState(storage, s0).ok).toBe(true);
    mount(storage, at('2026-10-11'));
    click('Planning');
    const card = screen.getByRole('button', { name: /Test chronométré/ });
    expect(within(card).getByText('TEST')).toBeTruthy();
    fireEvent.click(card);
    expect(screen.getByText('TEST CHRONOMÉTRÉ')).toBeTruthy();
    click('Commencer la séance');
    click('Terminer la séance');
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    fireEvent.click(sheet.getByRole('radio', { name: 'Tout s’est passé comme prévu' }));
    fireEvent.change(sheet.getByLabelText(/Durée totale courue/), { target: { value: '60' } });
    expect((sheet.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(sheet.getByLabelText('Minutes du test'), { target: { value: '25' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: expect.objectContaining({ durationS: 1500 }) })]);
  });
});

describe('douleur, persistance, import', () => {
  it('douleur signalée ⇒ planification suspendue clairement ; levée explicite dans les réglages', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    openStrength();
    click('Terminer la séance');
    const sheet = within(screen.getByRole('dialog', { name: 'Fin de séance' }));
    fireEvent.click(sheet.getByRole('radio', { name: 'J’ai arrêté la séance' }));
    fireEvent.click(sheet.getByLabelText('J’ai ressenti une douleur'));
    fireEvent.click(sheet.getByRole('button', { name: 'Enregistrer' }));
    expect(saved(storage).safety.activePain).not.toBeNull();
    click('Retour');
    expect(screen.getByText('La planification automatique est suspendue car une douleur a été signalée.')).toBeTruthy();
    click('Ouvrir les réglages');
    click('La douleur a disparu');
    click('Je confirme');
    expect(saved(storage).safety.activePain).toBeNull();
    click('Accueil');
    expect(screen.queryByText(/planification automatique est suspendue/)).toBeNull();
  });

  it('import : données d’un autre appareil relues par app-core, programme et historique restaurés', async () => {
    const source = new MemoryStorage();
    onboard(source, 'Musculation + Course');
    const json = exportState(saved(source) as never);
    cleanup();
    const target = new MemoryStorage();
    const s1 = createBeta0Programme(emptyState(), profileInput({ priorities: ['strength'], strength: { enabled: true, goal: 'strength', sessionsPerWeek: 1 }, running: { ...profileInput().running, enabled: false } }), at(MONDAY)(), {});
    saveState(target, s1);
    mount(target);
    click('Réglages');
    fireEvent.change(screen.getByLabelText('Fichier de données à importer'), { target: { files: [new File([json], 'kairo.json', { type: 'application/json' })] } });
    await waitFor(() => expect(screen.getByText('Données importées.')).toBeTruthy());
    expect(saved(target).programmeState?.definition.priorities).toEqual(['strength', 'running']);
    const bad = new File(['{"schemaVersion":99}'], 'x.json');
    fireEvent.change(screen.getByLabelText('Fichier de données à importer'), { target: { files: [bad] } });
    await waitFor(() => expect(screen.getByText(/Import impossible/)).toBeTruthy());
    expect(saved(target).programmeState?.definition.priorities).toEqual(['strength', 'running']);
  });

  it('semaine suivante : ouverture le lundi d’après ⇒ semaine passée clôturée (séances non faites « manquées » dans l’historique), nouvelle semaine', () => {
    const storage = new MemoryStorage();
    onboard(storage, 'Musculation');
    cleanup();
    mount(storage, at('2026-10-12'));
    const s = saved(storage);
    expect(s.programmeState?.weeks.map((w) => w.closedAt !== undefined)).toEqual([true, false]);
    click('Historique');
    expect(screen.getAllByText('Manquée').length).toBe(2);
  });
});
