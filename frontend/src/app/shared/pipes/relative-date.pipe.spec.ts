import { RelativeDatePipe } from './relative-date.pipe';

describe('RelativeDatePipe', () => {
  let pipe: RelativeDatePipe;

  beforeEach(() => {
    pipe = new RelativeDatePipe();
  });

  it('should return "Hoy" for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(pipe.transform(today)).toBe('Hoy');
  });

  it('should return "Ayer" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const str = yesterday.toISOString().split('T')[0];
    expect(pipe.transform(str)).toBe('Ayer');
  });

  it('should return "Hace N días" for N days ago (2-6)', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const str = threeDaysAgo.toISOString().split('T')[0];
    expect(pipe.transform(str)).toBe('Hace 3 días');
  });

  it('should return "—" for null or undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('should handle ISO timestamp (with time)', () => {
    const today = new Date().toISOString();
    expect(pipe.transform(today)).toBe('Hoy');
  });
});
