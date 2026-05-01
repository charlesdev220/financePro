import { TestBed } from '@angular/core/testing';
import { PeriodService } from '../../../core/services/period.service';

// ─────────────────────────────────────────────────────────────────────────────
// PeriodService — getDateRange + getPeriodLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('PeriodService', () => {
  let service: PeriodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeriodService);
  });

  // ── getDateRange — tab 'month', monthStartDay = 1 ────────────────────────

  describe('getDateRange — mes estándar (monthStartDay=1)', () => {

    it('getDateRange_shouldReturn2026April_whenOffset0AndToday20260415', () => {
      // Given: mitad de abril
      const today = new Date(2026, 3, 15); // abril = índice 3

      // When
      const range = service.getDateRange('month', today, 1, 0);

      // Then
      expect(range).toEqual({ from: '2026-04-01', to: '2026-04-30' });
    });

    it('getDateRange_shouldReturn2026March_whenOffset-1AndToday20260415', () => {
      // Given: mitad de abril, retroceder un mes
      const today = new Date(2026, 3, 15);

      // When
      const range = service.getDateRange('month', today, 1, -1);

      // Then
      expect(range).toEqual({ from: '2026-03-01', to: '2026-03-31' });
    });

  });

  // ── getDateRange — mes personalizado (monthStartDay = 15) ────────────────

  describe('getDateRange — mes personalizado (monthStartDay=15)', () => {

    it('getDateRange_shouldReturnApr15ToMay14_whenToday20260420AndOffset0', () => {
      // Given: 20 de abril — después del día 15, el período activo es 15-abr a 14-may
      const today = new Date(2026, 3, 20);

      // When
      const range = service.getDateRange('month', today, 15, 0);

      // Then
      expect(range).toEqual({ from: '2026-04-15', to: '2026-05-14' });
    });

    it('getDateRange_shouldReturnMar15ToApr14_whenToday20260410AndOffset0', () => {
      // Given: 10 de abril — antes del día 15, el período activo es 15-mar a 14-abr
      const today = new Date(2026, 3, 10);

      // When
      const range = service.getDateRange('month', today, 15, 0);

      // Then
      expect(range).toEqual({ from: '2026-03-15', to: '2026-04-14' });
    });

  });

  // ── getDateRange — tab 'day' ─────────────────────────────────────────────

  describe('getDateRange — día', () => {

    it('getDateRange_shouldReturnToday_whenDayTabAndOffset0', () => {
      // Given
      const today = new Date(2026, 3, 15);

      // When
      const range = service.getDateRange('day', today, 1, 0);

      // Then
      expect(range).toEqual({ from: '2026-04-15', to: '2026-04-15' });
    });

    it('getDateRange_shouldReturnYesterday_whenDayTabAndOffset-1', () => {
      // Given
      const today = new Date(2026, 3, 15);

      // When
      const range = service.getDateRange('day', today, 1, -1);

      // Then
      expect(range).toEqual({ from: '2026-04-14', to: '2026-04-14' });
    });

  });

  // ── getDateRange — tab 'week' ────────────────────────────────────────────

  describe('getDateRange — semana (lun–dom)', () => {

    it('getDateRange_shouldReturnMonToSun_whenWeekTabAndTodayIsWednesday20260415', () => {
      // Given: miércoles 15-abr-2026 → semana: lun 13-abr a dom 19-abr
      const today = new Date(2026, 3, 15); // miércoles

      // When
      const range = service.getDateRange('week', today, 1, 0);

      // Then
      expect(range).toEqual({ from: '2026-04-13', to: '2026-04-19' });
    });

  });

  // ── getDateRange — tab 'year' ────────────────────────────────────────────

  describe('getDateRange — año', () => {

    it('getDateRange_shouldReturn2026FullYear_whenYearTabAndOffset0', () => {
      // Given
      const today = new Date(2026, 3, 15);

      // When
      const range = service.getDateRange('year', today, 1, 0);

      // Then
      expect(range).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    });

  });

  // ── getPeriodLabel ───────────────────────────────────────────────────────

  describe('getPeriodLabel', () => {

    it('getPeriodLabel_shouldContainHoy_whenDayTabAndOffset0', () => {
      // Given: hoy mismo
      const today = new Date(2026, 3, 15);

      // When
      const label = service.getPeriodLabel('day', today, 1, 0);

      // Then — el label empieza con "Hoy," cuando offset = 0
      expect(label).toMatch(/^Hoy,/);
    });

    it('getPeriodLabel_shouldContainDia_whenDayTabAndOffset-1', () => {
      // Given: ayer
      const today = new Date(2026, 3, 15);

      // When
      const label = service.getPeriodLabel('day', today, 1, -1);

      // Then — offset != 0 → empieza con "Día,"
      expect(label).toMatch(/^Día,/);
    });

    it('getPeriodLabel_shouldContainCurrentMonthName_whenMonthTabAndOffset0', () => {
      // Given: abril 2026
      const today = new Date(2026, 3, 15);

      // When
      const label = service.getPeriodLabel('month', today, 1, 0);

      // Then — el label incluye el nombre del mes en español (capitalizado)
      expect(label).toMatch(/[Aa]bril/i);
      expect(label).toContain('2026');
    });

    it('getPeriodLabel_shouldContainPreviousMonthName_whenMonthTabAndOffset-1', () => {
      // Given: desde abril, retroceder a marzo
      const today = new Date(2026, 3, 15);

      // When
      const label = service.getPeriodLabel('month', today, 1, -1);

      // Then — incluye "marzo"
      expect(label).toMatch(/[Mm]arzo/i);
    });

    it('getPeriodLabel_shouldReturnYear_whenYearTabAndOffset0', () => {
      // Given
      const today = new Date(2026, 3, 15);

      // When
      const label = service.getPeriodLabel('year', today, 1, 0);

      // Then
      expect(label).toBe('2026');
    });

  });

});
