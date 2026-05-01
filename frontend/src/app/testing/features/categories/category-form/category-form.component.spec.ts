import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertController, ModalController } from '@ionic/angular/standalone';

import { CategoryFormComponent } from '../../../../features/categories/category-form/category-form.component';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { UserSettingsStateService } from '../../../../core/state/user-settings.state';
import { ICategory } from '../../../../models/category.model';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryFormComponent — ngOnInit budgetAmount pre-fill
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryFormComponent — default budget pre-fill', () => {

  let categoriesStateSpy: { add: jest.Mock; update: jest.Mock };
  let userSettingsSpy:    { load: jest.Mock; saveDefaultBudget: jest.Mock; defaultCategoryBudget: ReturnType<typeof signal<number>> };
  let modalCtrlSpy:       { dismiss: jest.Mock };
  let alertCtrlSpy:       { create: jest.Mock };

  beforeEach(() => {
    const budgetSignal = signal(200);

    categoriesStateSpy = { add: jest.fn(), update: jest.fn() };
    userSettingsSpy    = {
      load: jest.fn(),
      saveDefaultBudget: jest.fn(),
      defaultCategoryBudget: budgetSignal,
    };
    modalCtrlSpy = { dismiss: jest.fn() };
    alertCtrlSpy = { create: jest.fn() };

    TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CategoriesStateService,  useValue: categoriesStateSpy },
        { provide: UserSettingsStateService, useValue: userSettingsSpy },
        { provide: ModalController,          useValue: modalCtrlSpy },
        { provide: AlertController,          useValue: alertCtrlSpy },
      ],
    });
  });

  // REQ-04 sc1: crear nueva categoría expense → budgetAmount = default (200)
  it('ngOnInit_shouldPrefillBudgetAmount_whenNewExpenseCategory', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';

    fixture.detectChanges();

    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc2: editar categoría expense con budgetAmount existente → no sobreescribe
  it('ngOnInit_shouldNotOverrideBudgetAmount_whenEditingCategoryWithExistingBudget', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    comp.category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: 450, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    fixture.detectChanges();

    expect(comp.form.get('budgetAmount')?.value).toBe(450);
  });

  // REQ-04 sc3: editar categoría expense con budgetAmount null → se aplica el default
  it('ngOnInit_shouldApplyDefault_whenEditingCategoryWithNullBudget', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    comp.category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: null, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    fixture.detectChanges();

    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc4: cambiar tipo a income → limpia budgetAmount
  it('onTypeSelect_shouldClearBudgetAmount_whenSwitchingToIncome', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    fixture.detectChanges();
    expect(comp.form.get('budgetAmount')?.value).toBe(200);

    comp.onTypeSelect('income');

    expect(comp.form.get('budgetAmount')?.value).toBeNull();
  });

  // REQ-04 sc5: cambiar tipo a expense con campo vacío → aplica default
  it('onTypeSelect_shouldApplyDefault_whenSwitchingToExpenseWithEmptyBudget', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    comp.category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Salario',
      icon: '💰', color: '#4CAF50', type: 'income',
      budgetAmount: null, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;
    fixture.detectChanges();
    expect(comp.form.get('budgetAmount')?.value).toBeNull();

    comp.onTypeSelect('expense');

    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });
});
