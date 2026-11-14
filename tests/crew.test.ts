import { describe, expect, test } from 'bun:test';
import { GestureRecognizer } from '../src/lib/crew/gestures';
import { simulate } from '../src/lib/crew/simulation';
import { crewDefaults, freshness, validateConfig, defaultConfig } from '../src/lib/crew/model';

describe('intentional ring gestures', () => {
  test('two short nearby taps create exactly one capture', () => {
    const g = new GestureRecognizer();
    g.down(10, 10, 0);
    expect(g.up(10, 10, 80)).toBeNull();
    g.down(12, 12, 200);
    expect(g.up(12, 12, 270)).toBe('double-tap');
    expect(g.up(12, 12, 280)).toBeNull();
  });
  test('a deliberate swipe creates one emergency and consumes tap candidates', () => {
    const g = new GestureRecognizer();
    g.down(0, 0, 0);
    g.up(0, 0, 60);
    g.down(0, 0, 200);
    g.move(140, 5);
    expect(g.up(150, 5, 600)).toBe('swipe');
    g.down(150, 5, 650);
    expect(g.up(150, 5, 700)).toBeNull();
  });
  test('scroll-like, fast, canceled and held interactions do not create events', () => {
    const g = new GestureRecognizer();
    g.down(0, 0, 0);
    expect(g.up(10, 140, 500)).toBeNull();
    g.down(0, 0, 600);
    expect(g.up(150, 0, 700)).toBeNull();
    g.down(0, 0, 900);
    g.cancel();
    expect(g.up(150, 0, 1400)).toBeNull();
    g.down(0, 0, 1500);
    expect(g.up(0, 0, 2500)).toBeNull();
  });
  test('large movements which return to origin cannot become taps', () => {
    const g = new GestureRecognizer();
    g.down(0, 0, 0);
    g.move(100, 0);
    g.up(0, 0, 200);
    g.down(0, 0, 300);
    expect(g.up(0, 0, 350)).toBeNull();
  });
});

describe('simulation and signal age', () => {
  test('crew have different baselines and successive readings remain continuous', () => {
    const a = simulate('vega', 0, 'normal');
    const b = simulate('vega', 3000, 'normal', a);
    expect(Math.abs(b.pulse - a.pulse)).toBeLessThanOrEqual(3);
    expect(simulate('nova', 0, 'normal').pulse).not.toBe(a.pulse);
    expect(crewDefaults).toHaveLength(4);
  });
  test('excursions progress instead of jumping and eventually cross demo references', () => {
    let value = simulate('vega', 0, 'normal');
    const initial = value.pulse;
    for (let i = 0; i < 70; i++) value = simulate('vega', i * 3000, 'excursion', value);
    expect(value.pulse).toBeGreaterThan(110);
    expect(initial).toBeLessThan(100);
  });
  test('staleness depends on last received telemetry and configured emission', () => {
    expect(freshness(true, 1000, 3000, 5000)).toBe('live');
    expect(freshness(true, 1000, 3000, 12000)).toBe('stale');
    expect(freshness(false, 1000, 3000, 2000)).toBe('offline');
    expect(freshness(true, null, 3000, 2000)).toBe('waiting');
  });
  test('invalid intervals and inverted demo ranges are rejected', () => {
    expect(validateConfig({ ...defaultConfig, intervalMs: 500 })).toBe(false);
    expect(
      validateConfig({ ...defaultConfig, ranges: { ...defaultConfig.ranges, pulse: [120, 60] } }),
    ).toBe(false);
    expect(validateConfig(defaultConfig)).toBe(true);
  });
});
