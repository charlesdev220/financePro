import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertController, ModalController } from '@ionic/angular/standalone';

import { CategoryFormComponent } from '../../../../features/categories/category-form/category-form.component';
import { CategoriesStateService } from '../../../../core/state/categories.state';
import { UserSettingsStateService } from '../../../../core/state/user-settings.state';
import { ICategory } from '../../../../models/category.model';
import { MODAL_CONTROLLER_MOCK, ALERT_CONTROLLER_MOCK } from '../../../ionic-mocks';

describe('CategoryFormComponent', () => {
  let spectator: Spectator<CategoryFormComponent>;
  const budgetSignal = signal(200);

  const createComponent = createComponentFactory({
    component: CategoryFormComponent,
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      mockProvider(CategoriesStateService),
      mockProvider(UserSettingsStateService, {
        defaultCategoryBudget: budgetSignal,
      }),
      mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
      mockProvider(AlertController, ALERT_CONTROLLER_MOCK),
    ],
  });

  it('should create', () => {
    spectator = createComponent({ props: { userId: 'usr_001' } });
    expect(spectator.component).toBeTruthy();
  });

  // REQ-04 sc1: crear nueva categoría expense → budgetAmount = default (200)
  it('ngOnInit_shouldPrefillBudgetAmount_whenNewExpenseCategory', () => {
    spectator = createComponent({ props: { userId: 'usr_001' } });
    expect(spectator.component.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc2: editar categoría expense con budgetAmount existente → no sobreescribe
  it('ngOnInit_shouldNotOverrideBudgetAmount_whenEditingCategoryWithExistingBudget', () => {
    const category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: 450, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    spectator = createComponent({ props: { userId: 'usr_001', category } });

    expect(spectator.component.form.get('budgetAmount')?.value).toBe(450);
  });

  // REQ-04 sc3: editar categoría expense con budgetAmount null → se aplica el default
  it('ngOnInit_shouldApplyDefault_whenEditingCategoryWithNullBudget', () => {
    const category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Comida',
      icon: '🛒', color: '#4CAF50', type: 'expense',
      budgetAmount: null, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    spectator = createComponent({ props: { userId: 'usr_001', category } });

    expect(spectator.component.form.get('budgetAmount')?.value).toBe(200);
  });

  // REQ-04 sc4: cambiar tipo a income → limpia budgetAmount
  it('onTypeSelect_shouldClearBudgetAmount_whenSwitchingToIncome', () => {
    spectator = createComponent({ props: { userId: 'usr_001' } });
    expect(spectator.component.form.get('budgetAmount')?.value).toBe(200);

    spectator.component.onTypeSelect('income');

    expect(spectator.component.form.get('budgetAmount')?.value).toBeNull();
  });

  // REQ-04 sc5: cambiar tipo a expense con campo vacío → aplica default
  it('onTypeSelect_shouldApplyDefault_whenSwitchingToExpenseWithEmptyBudget', () => {
    const category = {
      categoryId: 'cat-1', userId: 'usr_001', name: 'Salario',
      icon: '💰', color: '#4CAF50', type: 'income',
      budgetAmount: null, budgetPeriod: 'monthly',
      isActive: true, createdAt: '2026-01-01T00:00:00Z',
    } as ICategory;

    spectator = createComponent({ props: { userId: 'usr_001', category } });
    expect(spectator.component.form.get('budgetAmount')?.value).toBeNull();

    spectator.component.onTypeSelect('expense');

    expect(spectator.component.form.get('budgetAmount')?.value).toBe(200);
  });
});
