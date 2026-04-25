import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { SheetsApiService } from './sheets-api.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

/**
 * DataSeedService — Provee datos iniciales (Semillas) para nuevos usuarios.
 * Evita que el usuario entre a una aplicación vacía creando carteras y categorías básicas.
 */
@Injectable({ providedIn: 'root' })
export class DataSeedService {
  private readonly sheetsApi = inject(SheetsApiService);

  /**
   * Genera los datos base (carteras y categorías) para un usuario.
   * @param userId ID del usuario (UUID).
   * @returns Observable con el resultado de la operación.
   */
  seedUserBaseData(userId: string): Observable<boolean> {
    const now = new Date().toISOString();

    // 1. Carteras por defecto
    const defaultWallets = [
      [crypto.randomUUID(), userId, 'Efectivo', 'EUR', 0, '#4CAF50', '💵', true, now],
      [crypto.randomUUID(), userId, 'Banco Principal', 'EUR', 0, '#2196F3', '🏦', false, now],
    ];

    // 2. Categorías por defecto (Ingresos y Gastos)
    const defaultCategories = [
      // Ingresos
      [crypto.randomUUID(), userId, 'Sueldo', '💰', '#4CAF50', TRANSACTION_TYPES.INCOME, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Ventas', '📈', '#8BC34A', TRANSACTION_TYPES.INCOME, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Otros ingresos', '💵', '#CDDC39', TRANSACTION_TYPES.INCOME, '', 'monthly', true, now],
      // Gastos
      [crypto.randomUUID(), userId, 'Alimentación', '🛒', '#F44336', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Transporte', '🚌', '#FF9800', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Vivienda', '🏠', '#795548', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Salud', '⚕️', '#E91E63', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Educación', '🎓', '#9C27B0', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Ocio', '🎬', '#3F51B5', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
      [crypto.randomUUID(), userId, 'Otros gastos', '🛍️', '#9E9E9E', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now],
    ];

    return forkJoin({
      wallets: this.sheetsApi.appendRow('WALLETS!A1', defaultWallets),
      categories: this.sheetsApi.appendRow('CATEGORIES!A1', defaultCategories),
    }).pipe(
      map(() => true)
    );
  }
}
