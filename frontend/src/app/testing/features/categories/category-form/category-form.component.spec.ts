import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular/standalone';

import { CategoryFormComponent } from '../../../../features/categories/category-form/category-form.component';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { UserSettingsStateService } from '../../../../core/state/user-settings.state';
import { ICategory } from '../../../../models/category.model';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryFormComponent — ngOnInit budgetAmount pre-fill
// ─────────────────────────────────────────────────────────────────────────────
describe('CategoryFormComponent — default budget pre-fill', () => {

  let categoriesStateSpy: jasmine.SpyObj<CategoriesStateService>;
  let userSettingsSpy:    jasmine.SpyObj<UserSettingsStateService>;
  let modalCtrlSpy:       jasmine.SpyObj<ModalController>;
  let alertCtrlSpy:       jasmine.SpyObj<AlertController>;

  beforeEach(() => {
    const budgetSignal = signal(200);

    categoriesStateSpy = jasmine.createSpyObj('CategoriesStateService', ['add', 'update']);
    userSettingsSpy    = jasmine.createSpyObj('UserSettingsStateService', ['load', 'saveDefaultBudget'], {
      defaultCategoryBudget: budgetSignal,
    });
    modalCtrlSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    alertCtrlSpy = jasmine.createSpyObj('AlertController', ['create']);

    TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        { provide: CategoriesStateService, useValue: categoriesStateSpy },
        { provide: UserSettingsStateService, useValue: userSettingsSpy },
        { provide: ModalController, useValue: modalCtrlSpy },
        { provide: AlertController, useValue: alertCtrlSpy },
      ],
    });
  });

  // REQ-04 sc1: crear nueva categoría expense → budgetAmount = default (200)
  it('ngOnInit_shouldPrefillBudgetAmount_whenNewExpenseCategory', () => {
    // Given
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    // no category input → modo creación

    // When
    fixture.detectChanges(); // triggers ngOnInit

    // Then
    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc2: editar categoría expense con budgetAmount existente → no sobreescribe
  it('ngOnInit_shouldNotOverrideBudgetAmount_whenEditingCategoryWithExistingBudget', () => {
    // Given
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    comp.category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: 450, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    // When
    fixture.detectChanges();

    // Then: budgetAmount permanece en 450, no se sobreescribe con 200
    expect(comp.form.get('budgetAmount')?.value).toBe(450);
  });

  // REQ-04 sc3: editar categoría expense con budgetAmount null → se aplica el default
  it('ngOnInit_shouldApplyDefault_whenEditingCategoryWithNullBudget', () => {
    // Given
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    comp.category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: null, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    // When
    fixture.detectChanges();

    // Then: se aplica el default
    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc4: cambiar tipo a income → limpia budgetAmount
  it('onTypeSelect_shouldClearBudgetAmount_whenSwitchingToIncome', () => {
    // Given
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const comp    = fixture.componentInstance;
    comp.userId   = 'usr_001';
    fixture.detectChanges();
    expect(comp.form.get('budgetAmount')?.value).toBe(200);

    // When
    comp.onTypeSelect('income');

    // Then
    expect(comp.form.get('budgetAmount')?.value).toBeNull();
  });

  // REQ-04 sc5: cambiar tipo a expense con campo vacío → aplica default
  it('onTypeSelect_shouldApplyDefault_whenSwitchingToExpenseWithEmptyBudget', () => {
    // Given: empezamos como income (budgetAmount = null)
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

    // When
    comp.onTypeSelect('expense');

    // Then
    expect(comp.form.get('budgetAmount')?.value).toBe(200);
  });
});
