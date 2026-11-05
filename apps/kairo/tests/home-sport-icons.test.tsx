// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HomeSportIcon, HOME_SPORT_ICONS } from '../src/sober/HomeSportIcon.js';
afterEach(cleanup);
const cases = [['strength','Musculation','#DCFF35'],['running','Course','#39DDEB'],['hyrox','HYROX','#FF438B'],['crosstraining','Cross-training','#8B5CF6']] as const;
it.each(cases)('%s garde un nom accessible et une ressource vectorielle autonome', (sport,name,color)=>{
 const {container}=render(<HomeSportIcon sport={sport}/>);
 expect(screen.getByRole('img',{name})).toBeTruthy();
 expect(container.querySelector('.r-sport-glyph')?.getAttribute('style')).toContain(HOME_SPORT_ICONS[sport]);
 const text=readFileSync(`apps/kairo/src/sober/assets/home-sports/${sport}.svg`,'utf8');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 expect(doc.querySelector('parsererror')).toBeNull();
 expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 48 48');
 expect(text).toContain(color);
 expect(doc.querySelector('script,image,foreignObject,animate')).toBeNull();
});
