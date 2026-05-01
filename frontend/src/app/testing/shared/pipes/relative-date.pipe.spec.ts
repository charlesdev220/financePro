import { RelativeDatePipe } from '../../../shared/pipes/relative-date.pipe';

// toISOString() devuelve UTC — en timezones adelantados puede dar un día menos.
// La pipe parsea fechas como hora local, así que el test debe usar fecha local.
function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('RelativeDatePipe', () => {
  let pipe: RelativeDatePipe;

  beforeEach(() => {
    pipe = new RelativeDatePipe();
  });

  it('should return "Hoy" for today\'s date', () => {
    expect(pipe.transform(localDateStr(0))).toBe('Hoy');
  });

  it('should return "Ayer" for yesterday', () => {
    expect(pipe.transform(localDateStr(-1))).toBe('Ayer');
  });

  it('should return "Hace N días" for N days ago (2-6)', () => {
    expect(pipe.transform(localDateStr(-3))).toBe('Hace 3 días');
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
