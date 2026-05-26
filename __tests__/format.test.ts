import { formatCountdownShort } from '../src/ui/format';

describe('formatCountdownShort', () => {
  it('formats hours and minutes', () => {
    expect(formatCountdownShort(4 * 3600_000 + 12 * 60_000)).toBe('4h 12m');
  });

  it('formats minutes only', () => {
    expect(formatCountdownShort(38 * 60_000)).toBe('38m');
  });

  it('formats sub-minute as a few seconds', () => {
    expect(formatCountdownShort(15_000)).toBe('a few seconds');
  });
});
