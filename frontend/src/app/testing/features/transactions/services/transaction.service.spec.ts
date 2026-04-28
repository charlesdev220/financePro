import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TransactionService, rowToTransaction, transactionToRow } from '../../../../features/transactions/services/transaction.service';
import { CurrencyApiService } from '../../../../core/services/currency-api.service';
import { SheetsApiService } from '../../../../core/services/sheets-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ITransaction } from '../../../../models/transaction.model';

const mockTx = (overrides: Partial<ITransaction> = {}): ITransaction => ({
  txId:           'tx-001',
  userId:         'user-001',
  walletId:       'wal-001',
  categoryId:     'cat-001',
  amount:         100,
  currency:       'EUR',
  amountBase:     100,
  concept:        'Test',
  date:           '2026-03-01',
  type:           'expense',
  isRecurring:    false,
  recurrenceRule: null,
  notes:          null,
  workspaceId:    'ws_test',
  createdAt:      '2026-03-01T10:00:00.000Z',
  updatedAt:      '2026-03-01T10:00:00.000Z',
  ...overrides,
});

describe('TransactionService', () => {
  let service: TransactionService;
  let currencySpy: jasmine.SpyObj<CurrencyApiService>;
  let sheetsSpy: jasmine.SpyObj<SheetsApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    currencySpy = jasmine.createSpyObj('CurrencyApiService', ['getRate']);
    sheetsSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow', 'deleteRow']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUser', 'signIn', 'isAuthenticated', 'getAccessToken']);

    // Mocks básicos para evitar errores si se llaman (aunque no deberían con los spies)
    authSpy.isAuthenticated.and.returnValue(true);
    authSpy.getUser.and.returnValue({ sub: 'user-001', email: 'test@test.com', name: 'Tester' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TransactionService,
        { provide: CurrencyApiService, useValue: currencySpy },
        { provide: SheetsApiService, useValue: sheetsSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });
    service = TestBed.inject(TransactionService);
  });

  // REQ-03 sc1: transacción en divisa diferente a la base
  it('should calculate amountBase using currency rate', async () => {
    currencySpy.getRate.and.returnValue(of(0.92));
    const draft = {
      userId: 'user-001', walletId: 'wal-001', categoryId: 'cat-001',
      amount: 100, currency: 'USD', concept: 'Test', date: '2026-04-01',
      type: 'expense' as const, isRecurring: false, recurrenceRule: null, notes: null,
    };
    const tx = await service.createTransaction(draft, 'tx-001', 'ws_test', 'EUR');
    expect(tx.amountBase).toBeCloseTo(92, 1);
    expect(tx.txId).toBe('tx-001');
    expect(currencySpy.getRate).toHaveBeenCalledWith('USD', 'EUR');
  });

  // REQ-03 sc2: transacción en divisa base — amountBase = amount
  it('should set amountBase = amount when currency equals base', async () => {
    currencySpy.getRate.and.returnValue(of(1));
    const draft = {
      userId: 'user-001', walletId: 'wal-001', categoryId: 'cat-001',
      amount: 50, currency: 'EUR', concept: '', date: '2026-04-01',
      type: 'expense' as const, isRecurring: false, recurrenceRule: null, notes: null,
    };
    const tx = await service.createTransaction(draft, 'tx-002', 'ws_test', 'EUR');
    expect(tx.amountBase).toBe(50);
  });

  // REQ-07 sc1: recurrente mensual vencida → genera nueva transacción
  it('should generate new transaction for overdue monthly recurring', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const recurring = mockTx({ isRecurring: true, recurrenceRule: 'monthly', date: lastMonthStr });
    const result = service.processRecurring([recurring]);
    expect(result.length).toBe(1);
    expect(result[0].txId).not.toBe(recurring.txId);
    expect(result[0].isRecurring).toBeTrue();
  });

  // REQ-07 sc2: recurrente al día — no duplica si ya existe en período
  it('should not duplicate recurring if already generated this period', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthStr = thisMonth.toISOString().split('T')[0];

    const original = mockTx({ isRecurring: true, recurrenceRule: 'monthly', date: lastMonthStr });
    const alreadyGenerated = mockTx({ txId: 'tx-002', isRecurring: true, recurrenceRule: 'monthly', date: thisMonthStr });
    const result = service.processRecurring([original, alreadyGenerated]);
    expect(result.length).toBe(0);
  });
});

describe('rowToTransaction / transactionToRow', () => {
  it('should round-trip a transaction through row conversion', () => {
    const tx = mockTx();
    const row = transactionToRow(tx);
    const restored = rowToTransaction(row);
    expect(restored.txId).toBe(tx.txId);
    expect(restored.amount).toBe(tx.amount);
    expect(restored.amountBase).toBe(tx.amountBase);
    expect(restored.type).toBe(tx.type);
    expect(restored.isRecurring).toBe(tx.isRecurring);
    expect(restored.recurrenceRule).toBeNull();
  });
});
