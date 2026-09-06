import { describe, expect, it } from 'vitest';
import { calculate } from '../../src/lib/calculator';
describe('safe arithmetic parser', () => {
  it.each([
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['-3 + 8', 5],
    ['.5 + .25', 0.75],
    ['8 ÷ 2 × 3', 12],
    ['100 × 15%', 15],
    ['2^3^2', 512],
    ['0.1 + 0.2', 0.3],
    ['12 − 3', 9],
    ['1e+3 + 2', 1002],
    ['-2^2', -4],
    ['2^-2', 0.25],
    ['(2 + (-4)) / 2', -1],
  ])('evaluates %s', (input, expected) => expect(calculate(input)).toBe(expected));
  it.each([
    '',
    '1 / 0',
    '1 +',
    '(2+3',
    '2 3',
    'process.exit()',
    'alert(1)',
    '2;3',
    'Infinity',
    'NaN',
    '9**9',
  ])('rejects unsafe or invalid input %s', (input) => {
    expect(() => calculate(input)).toThrow();
  });
});
