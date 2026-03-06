import { ToPercentPipe } from './percent.pipe';

describe('ToPercentPipe', () => {
  let pipe: ToPercentPipe;

  beforeEach(() => {
    pipe = new ToPercentPipe();
  });

  it('converts 0.75 to "75%"', () => {
    expect(pipe.transform(0.75)).toBe('75%');
  });

  it('converts 1 to "100%"', () => {
    expect(pipe.transform(1)).toBe('100%');
  });

  it('converts 0 to "0%"', () => {
    expect(pipe.transform(0)).toBe('0%');
  });

  it('returns "0%" for null', () => {
    expect(pipe.transform(null)).toBe('0%');
  });

  it('returns "0%" for undefined', () => {
    expect(pipe.transform(undefined)).toBe('0%');
  });

  it('respects digits parameter', () => {
    expect(pipe.transform(0.1234, 1)).toBe('12.3%');
  });

  it('rounds to 0 digits by default', () => {
    expect(pipe.transform(0.856)).toBe('86%');
  });
});
