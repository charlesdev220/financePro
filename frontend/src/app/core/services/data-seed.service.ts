import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { SheetsApiService } from './sheets-api.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';
import { APP_COLORS } from '@core/constants/colors.constants';

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
      [crypto.randomUUID(), userId, 'Efectivo', 'EUR', 0, APP_COLORS.GREEN_BASE, '💵', true, now],
      [crypto.randomUUID(), userId, 'Banco Principal', 'EUR', 0, APP_COLORS.BLUE, '🏦', false, now],
    ];

    return forkJoin({
      wallets: this.sheetsApi.appendRow('WALLETS!A1', defaultWallets),
      categories: this.sheetsApi.appendRow('CATEGORIES!A1', this._buildDefaultCategories(userId, '')),
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
      [crypto.randomUUID(), userId, 'Sueldo', '💰', APP_COLORS.GREEN_BASE, TRANSACTION_TYPES.INCOME, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Ventas', '📈', APP_COLORS.LIMA, TRANSACTION_TYPES.INCOME, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Otros ingresos', '💵', APP_COLORS.AMARILLO, TRANSACTION_TYPES.INCOME, '', 'monthly', true, now, workspaceId],
      // Gastos
      [crypto.randomUUID(), userId, 'Alimentación', '🛒', APP_COLORS.ROJO, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Transporte', '🚌', APP_COLORS.ANARANJADO, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Vivienda', '🏠', APP_COLORS.BROWN, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Salud', '⚕️', APP_COLORS.PINK, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Educación', '🎓', APP_COLORS.PURPLE, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Ocio', '🎬', APP_COLORS.INDIGO, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
      [crypto.randomUUID(), userId, 'Otros gastos', '🛍️', APP_COLORS.GRAY, TRANSACTION_TYPES.EXPENSE, '', 'monthly', true, now, workspaceId],
    ];
  }
}
