import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { environment } from '@env/environment';

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${environment.spreadsheetId}/values`;

describe('SheetsApiService', () => {
  let service: SheetsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SheetsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // REQ-12: no expone métodos obsoletos
  it('does not expose initDatabase()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).initDatabase).toBeUndefined();
  });

  it('does not expose healthCheck()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).healthCheck).toBeUndefined();
  });

  // REQ-10: getRange sin ETag previo
  describe('getRange() — first call (no cached ETag)', () => {
    it('sends request without If-None-Match header', () => {
      service.getRange('TRANSACTIONS!A:O').subscribe();

      const req = httpMock.expectOne(`${BASE}/${encodeURIComponent('TRANSACTIONS!A:O')}`);
      expect(req.request.headers.has('If-None-Match')).toBe(false);
      req.flush({ range: 'TRANSACTIONS!A:O', majorDimension: 'ROWS', values: [] });
    });

    it('returns the response body', async () => {
      const mockData = { range: 'TRANSACTIONS!A:O', majorDimension: 'ROWS', values: [['a', 'b']] };

      const resultPromise = firstValueFrom(service.getRange('TRANSACTIONS!A:O'));
      const req = httpMock.expectOne(`${BASE}/${encodeURIComponent('TRANSACTIONS!A:O')}`);
      req.flush(mockData);

      expect(await resultPromise).toEqual(mockData);
    });
  });

  // REQ-11: ETag caching
  describe('getRange() — ETag caching', () => {
    it('stores ETag from response header', async () => {
      // Primera llamada — poblar caché con ETag
      const firstCall = firstValueFrom(service.getRange('USERS!A:F'));
      const req1 = httpMock.expectOne(`${BASE}/${encodeURIComponent('USERS!A:F')}`);
      req1.flush(
        { range: 'USERS!A:F', majorDimension: 'ROWS', values: [] },
        { headers: { ETag: '"etag-abc"' } },
      );
      await firstCall;

      // Segunda llamada — debe enviar el ETag almacenado
      const secondCall = firstValueFrom(service.getRange('USERS!A:F'));
      const req2 = httpMock.expectOne(`${BASE}/${encodeURIComponent('USERS!A:F')}`);
      expect(req2.request.headers.get('If-None-Match')).toBe('"etag-abc"');
      req2.flush({ range: 'USERS!A:F', majorDimension: 'ROWS', values: [] });
      await secondCall;
    });

    it('sends If-None-Match on second call to same range', () => {
      // Primera llamada — poblar caché
      service.getRange('CATEGORIES!A:I').subscribe();
      const req1 = httpMock.expectOne(`${BASE}/${encodeURIComponent('CATEGORIES!A:I')}`);
      req1.flush(
        { range: 'CATEGORIES!A:I', majorDimension: 'ROWS', values: [] },
        { headers: { ETag: '"etag-xyz"' } },
      );

      // Segunda llamada — debe incluir ETag
      service.getRange('CATEGORIES!A:I').subscribe();
      const req2 = httpMock.expectOne(`${BASE}/${encodeURIComponent('CATEGORIES!A:I')}`);
      expect(req2.request.headers.get('If-None-Match')).toBe('"etag-xyz"');
      req2.flush({ range: 'CATEGORIES!A:I', majorDimension: 'ROWS', values: [] });
    });

    it('returns null when response body is null (304 simulation)', async () => {
      const resultPromise = firstValueFrom(service.getRange('WALLETS!A:I'));
      const req = httpMock.expectOne(`${BASE}/${encodeURIComponent('WALLETS!A:I')}`);
      req.flush(null);

      expect(await resultPromise).toBeNull();
    });
  });

  // REQ-10: appendRow
  describe('appendRow()', () => {
    it('sends POST to :append with valueInputOption=USER_ENTERED', () => {
      const values = [['tx_001', 'usr_001', 'wal_001', '100']];
      service.appendRow('TRANSACTIONS!A:O', values).subscribe();

      const req = httpMock.expectOne(
        `${BASE}/${encodeURIComponent('TRANSACTIONS!A:O')}:append?valueInputOption=USER_ENTERED`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ values });
      req.flush({});
    });
  });

  // updateRow
  describe('updateRow()', () => {
    it('sends PUT with valueInputOption=USER_ENTERED', () => {
      const values = [['updated']];
      service.updateRow('TRANSACTIONS!A2:O2', values).subscribe();

      const req = httpMock.expectOne(
        `${BASE}/${encodeURIComponent('TRANSACTIONS!A2:O2')}?valueInputOption=USER_ENTERED`,
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ values });
      req.flush({});
    });
  });

  // deleteRow
  describe('deleteRow()', () => {
    it('sends POST to :clear', () => {
      service.deleteRow('TRANSACTIONS!A2:O2').subscribe();

      const req = httpMock.expectOne(
        `${BASE}/${encodeURIComponent('TRANSACTIONS!A2:O2')}:clear`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });
});
