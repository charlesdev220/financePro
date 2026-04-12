import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(console, 'warn');
  });

  afterEach(() => httpMock.verify());

  it('re-throws HTTP errors without silencing them', (done) => {
    httpClient.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    httpMock.expectOne('/api/test').flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('re-throws 401 and logs a warning', (done) => {
    httpClient.get('/api/protected').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
        expect(console.warn).toHaveBeenCalledWith(
          jasmine.stringContaining('[ErrorInterceptor] 401'),
          jasmine.any(String)
        );
        done();
      },
    });

    httpMock.expectOne('/api/protected').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('re-throws 429 and logs a quota warning', (done) => {
    httpClient.get('/api/sheets').subscribe({
      error: (err) => {
        expect(err.status).toBe(429);
        expect(console.warn).toHaveBeenCalledWith(
          jasmine.stringContaining('[ErrorInterceptor] 429'),
          jasmine.any(String)
        );
        done();
      },
    });

    httpMock.expectOne('/api/sheets').flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
  });

  it('lets successful responses pass through untouched', (done) => {
    httpClient.get('/api/ok').subscribe({
      next: (res) => {
        expect(res).toEqual({ data: 'ok' });
        done();
      },
    });

    httpMock.expectOne('/api/ok').flush({ data: 'ok' });
  });
});
