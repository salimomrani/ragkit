import { RelativeDatePipe } from './relative-date.pipe';

describe('RelativeDatePipe', () => {
  let pipe: RelativeDatePipe;

  beforeEach(() => {
    pipe = new RelativeDatePipe();
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = pipe.transform('2024-01-01T00:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns "à l\'instant" for dates less than 1 minute ago', () => {
    const justNow = new Date(Date.now() - 5_000).toISOString();
    expect(pipe.transform(justNow)).toContain("à l'instant");
  });

  it('returns minutes label for dates 1–59 minutes ago', () => {
    const twoMinsAgo = new Date(Date.now() - 2 * 60_000).toISOString();
    expect(pipe.transform(twoMinsAgo)).toContain('il y a 2 min');
  });

  it('returns hours label for dates a few hours ago (same day)', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(pipe.transform(threeHoursAgo)).toContain('il y a 3 h');
  });

  it('returns days label for dates several days ago', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(pipe.transform(fiveDaysAgo)).toContain('il y a 5 j');
  });

  it('returns formatted date only for dates older than 30 days', () => {
    const oldDate = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const result = pipe.transform(oldDate);
    expect(result).not.toContain('il y a');
    expect(result).not.toContain("à l'instant");
  });

  it('accepts a Date object in addition to a string', () => {
    const date = new Date(Date.now() - 5_000);
    expect(pipe.transform(date)).toContain("à l'instant");
  });
});
