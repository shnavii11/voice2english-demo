import { computeBLEU, computeWER } from '../../lib/metrics.js';

describe('computeWER', () => {
  test('exact match returns 0', () => {
    expect(computeWER('hello world', 'hello world')).toBe(0);
  });
  test('one substitution out of 2 words = 0.5', () => {
    expect(computeWER('hello earth', 'hello world')).toBeCloseTo(0.5);
  });
  test('completely different = 1.0', () => {
    expect(computeWER('foo bar', 'hello world')).toBeCloseTo(1.0);
  });
  test('empty hypothesis = 1.0', () => {
    expect(computeWER('', 'hello world')).toBeCloseTo(1.0);
  });
  test('extra word in hypothesis (insertion) = 0.5', () => {
    expect(computeWER('hello world extra', 'hello world')).toBeCloseTo(0.5);
  });
});

describe('computeBLEU', () => {
  test('exact match returns 1', () => {
    expect(computeBLEU('hello world', 'hello world')).toBeCloseTo(1.0);
  });
  test('no overlap returns 0', () => {
    expect(computeBLEU('foo bar baz qux', 'hello world test case')).toBe(0);
  });
  test('partial match is between 0 and 1', () => {
    // 7 vs 7 words, last word differs — 1/2/3/4-grams all have partial overlap
    const s = computeBLEU(
      'the cat sat on the mat today',
      'the cat sat on the mat yesterday'
    );
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
  test('short hypothesis gets brevity penalty vs full', () => {
    const full  = computeBLEU('hello world foo bar', 'hello world foo bar');
    const short = computeBLEU('hello world', 'hello world foo bar');
    expect(short).toBeLessThan(full);
  });
});
