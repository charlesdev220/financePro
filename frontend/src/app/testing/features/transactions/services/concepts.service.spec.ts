import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConceptsService } from '../../../../features/transactions/services/concepts.service';
import { SheetsApiService } from '../../../../core/services/sheets-api.service';
import { IConcept } from '../../../../models/concept.model';
import { ITransaction } from '../../../../models/transaction.model';

const mockConcept = (overrides: Partial<IConcept> = {}): IConcept => ({
  conceptId: 'con-001',
  userId: 'user-001',
  categoryId: 'cat-001',
  text: 'Mercadona',
  usageCount: 5,
  lastUsed: '2026-04-01T00:00:00.000Z',
  ...overrides,
});

const mockTransaction = (): ITransaction => ({
  txId: 'tx-001',
  userId: 'user-001',
  walletId: 'wal-001',
  categoryId: 'cat-001',
  amount: 100,
  currency: 'EUR',
  amountBase: 100,
  concept: 'Mercadona',
  date: '2026-04-01',
  type: 'expense',
  isRecurring: false,
  recurrenceRule: null,
  notes: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
});

describe('ConceptsService.getSuggestions', () => {
  let service: ConceptsService;
  let sheetsSpy: jasmine.SpyObj<SheetsApiService>;

  beforeEach(() => {
    sheetsSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow']);
    TestBed.configureTestingModule({
      providers: [
        ConceptsService,
        { provide: SheetsApiService, useValue: sheetsSpy },
      ],
    });
    service = TestBed.inject(ConceptsService);
  });

  // REQ-09 sc1: sugerencias ordenadas por usage_count DESC
  it('should return suggestions ordered by usageCount DESC', () => {
    const concepts: IConcept[] = [
      mockConcept({ text: 'Mercadona', usageCount: 5 }),
      mockConcept({ conceptId: 'con-002', text: 'Maderas', usageCount: 10 }), 
      mockConcept({ conceptId: 'con-003', text: 'Mermelada', usageCount: 8 }),
    ];
    // Prefix 'Mer' -> Mercadona y Mermelada
    // Orden desc: Mermelada (8), Mercadona (5)
    const result = service.getSuggestions('cat-001', 'Mer', concepts);
    expect(result).toEqual(['Mermelada', 'Mercadona']);
  });

  // REQ-09 sc2: sin coincidencias para el prefijo → retorna []
  it('should return empty array when no prefix matches', () => {
    const concepts = [mockConcept()];
    const result = service.getSuggestions('cat-001', 'XYZ', concepts);
    expect(result).toEqual([]);
  });

  // Filtra por categoryId
  it('should only return suggestions for the matching categoryId', () => {
    const concepts: IConcept[] = [
      mockConcept({ text: 'Mercadona', categoryId: 'cat-001' }),
      mockConcept({ conceptId: 'con-002', text: 'Mercería', categoryId: 'cat-002' }),
    ];
    const result = service.getSuggestions('cat-001', 'Mer', concepts);
    expect(result).toEqual(['Mercadona']);
    expect(result).not.toContain('Mercería');
  });
});

describe('ConceptsService.upsertConcept', () => {
  let service: ConceptsService;
  let sheetsSpy: jasmine.SpyObj<SheetsApiService>;

  beforeEach(() => {
    sheetsSpy = jasmine.createSpyObj('SheetsApiService', ['getRange', 'appendRow', 'updateRow']);
    TestBed.configureTestingModule({
      providers: [
        ConceptsService,
        { provide: SheetsApiService, useValue: sheetsSpy },
      ],
    });
    service = TestBed.inject(ConceptsService);
  });

  // REQ-08 sc3: concepto vacío → no-op
  it('should not call Sheets when concept is empty', async () => {
    const tx: ITransaction = { ...mockTransaction(), concept: '' };
    await service.upsertConcept(tx);
    expect(sheetsSpy.getRange).not.toHaveBeenCalled();
    expect(sheetsSpy.appendRow).not.toHaveBeenCalled();
  });

  // REQ-08 sc1: concepto nuevo → appendRow
  it('should appendRow when concept does not exist', async () => {
    sheetsSpy.getRange.and.returnValue(of({ range: 'CONCEPTS!A:F', majorDimension: 'ROWS', values: [['concept_id','user_id','category_id','text','usage_count','last_used']] }));
    sheetsSpy.appendRow.and.returnValue(of({}));
    await service.upsertConcept(mockTransaction());
    expect(sheetsSpy.appendRow).toHaveBeenCalledWith(
      'CONCEPTS!A1',
      jasmine.arrayContaining([jasmine.arrayContaining(['user-001', 'cat-001', 'Mercadona', 1])]),
    );
  });

  // REQ-08 sc2: concepto existente → updateRow con usage_count + 1
  it('should updateRow with usage_count + 1 when concept exists', async () => {
    const existingRow = ['con-001', 'user-001', 'cat-001', 'mercadona', 5, '2026-04-01T00:00:00.000Z'];
    sheetsSpy.getRange.and.returnValue(of({
      range: 'CONCEPTS!A:F',
      majorDimension: 'ROWS',
      values: [['concept_id','user_id','category_id','text','usage_count','last_used'], existingRow],
    }));
    sheetsSpy.updateRow.and.returnValue(of({}));
    await service.upsertConcept(mockTransaction());
    expect(sheetsSpy.updateRow).toHaveBeenCalled();
    const updateCall = sheetsSpy.updateRow.calls.mostRecent().args;
    expect(updateCall[1][0][4]).toBe(6); // usage_count = 5 + 1
  });
});
