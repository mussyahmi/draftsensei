import { test, expect } from 'vitest';
import { bestLanes, usualLanes } from '../lib/best-lanes';
import { newPool } from '../lib/draft';

const hero = (name: string, win: number, ban = 0) => ({ hero: name, win, ban });

const lanes = { Masha: 'exp', Argus: 'exp', Sun: 'exp', Marcel: 'roam', Rafaela: 'roam', Khufra: 'roam', Valir: 'mid' } as const;

test('lanes rank by the average of their top three heroes', () => {
  const meta = [
    hero('Argus', 0.56),
    hero('Sun', 0.53),
    hero('Masha', 0.6),
    hero('Rafaela', 0.55),
    hero('Khufra', 0.545),
    hero('Marcel', 0.575),
    hero('Valir', 0.54),
  ];
  const ranked = bestLanes(meta, usualLanes(lanes));
  expect(ranked.map((s) => s.lane)).toEqual(['exp', 'roam', 'mid']);
  expect(ranked[0].heroes.map((m) => m.hero)).toEqual(['Masha', 'Argus', 'Sun']);
  expect(ranked[0].win).toBeCloseTo(0.5633, 3);
});

test('a hero banned in over a third of games does not count', () => {
  const meta = [hero('Masha', 0.6, 0.4), hero('Argus', 0.53), hero('Marcel', 0.575, 0.34), hero('Rafaela', 0.55)];
  const ranked = bestLanes(meta, usualLanes(lanes));
  expect(ranked.map((s) => [s.lane, s.heroes.map((m) => m.hero)])).toEqual([
    ['roam', ['Rafaela']],
    ['exp', ['Argus']],
  ]);
});

test('My heroes count in the lanes I put them, and empty lanes are left out', () => {
  const pool = { ...newPool(), gold: ['Sun'], roam: ['Rafaela'] };
  const ranked = bestLanes([hero('Sun', 0.53), hero('Rafaela', 0.55), hero('Valir', 0.6)], pool);
  expect(ranked.map((s) => s.lane)).toEqual(['roam', 'gold']);
});
