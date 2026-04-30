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
   * Genera los datos base (carteras y categorías) para un usuario nuevo.
   * @param userId ID del usuario (UUID).
   */
  seedUserBaseData(userId: string): Observable<boolean> {
    const now = new Date().toISOString();

    const defaultWallets = [
      [crypto.randomUUID(), userId, 'Efectivo', 'EUR', 0, '#4CAF50', '💵', true, now],
      [crypto.randomUUID(), userId, 'Banco Principal', 'EUR', 0, '#2196F3', '🏦', false, now],
    ];

    return forkJoin({
      wallets:     this.sheetsApi.appendRow('WALLETS!A1', defaultWallets),
      categories:  this.sheetsApi.appendRow('CATEGORIES!A1', this._buildDefaultCategories(userId, '')),
    }).pipe(map(() => true));
  }

  /**
   * Crea las categorías por defecto para un workspace recién creado.
   * @param workspaceId ID del nuevo workspace.
   * @param userId ID del usuario propietario.
   */
  seedCategoriesForWorkspace(workspaceId: string, userId: string): Observable<boolean> {
    return this.sheetsApi
      .appendRow('CATEGORIES!A1', this._buildDefaultCategories(userId, workspaceId))
      .pipe(map(() => true));
  }

  private _buildDefaultCategories(userId: string, workspaceId: string): unknown[][] {
    const now = new Date().toISOString();
    return [
      // Ingresos
      [crypto.randomUUID(), userId, 'Sueldo',         '💰', '#4CAF50', TRANSACTION_TYPES.INCOME,  '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Ventas',          '📈', '#8BC34A', TRANSACTION_TYPES.INCOME,  '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Otros ingresos',  '💵', '#CDDC39', TRANSACTION_TYPES.INCOME,  '', 'monthly', true, now, workspaceId],
      // Gastos
      [crypto.randomUUID(), userId, 'Alimentación',   '🛒', '#F44336', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Transporte',     '🚌', '#FF9800', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Vivienda',       '🏠', '#795548', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Salud',          '⚕️', '#E91E63', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Educación',      '🎓', '#9C27B0', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Ocio',           '🎬', '#3F51B5', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Otros gastos',   '🛍️', '#9E9E9E', TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
    ];
  }
}
