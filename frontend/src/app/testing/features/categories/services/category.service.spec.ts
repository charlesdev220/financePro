import { rowToCategory, categoryToRow } from '@features/categories/services/category.service';

describe('category.service pure functions', () => {
  describe('rowToCategory / categoryToRow', () => {
    it('round-trips a category through row format', () => {
      const row = ['cat_1', 'usr_1', 'Comida', '🍔', '#E57373', 'expense', '200', 'monthly', 'true', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const cat = rowToCategory(row, 'ws_default');
      expect(cat.categoryId).toBe('cat_1');
      expect(cat.name).toBe('Comida');
      expect(cat.type).toBe('expense');
      expect(cat.budgetAmount).toBe(200);
      expect(cat.isActive).toBe(true);
      const backToRow = categoryToRow(cat);
      expect(backToRow[0]).toBe('cat_1');
      expect(backToRow[5]).toBe('expense');
    });

    it('sets budgetAmount to null when column is empty', () => {
      const row = ['cat_2', 'usr_1', 'Salario', '💼', '#5BAD8F', 'income', '', 'monthly', 'true', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const cat = rowToCategory(row);
      expect(cat.budgetAmount).toBeNull();
    });

    it('maps all category fields correctly', () => {
      const row = ['cat_3', 'usr_2', 'Transporte', '🚌', '#5BAD8F', 'expense', '150', 'weekly', 'false', '2025-01-01T00:00:00.000Z', 'ws_2'];
      const cat = rowToCategory(row);
      expect(cat.categoryId).toBe('cat_3');
      expect(cat.userId).toBe('usr_2');
      expect(cat.icon).toBe('🚌');
      expect(cat.color).toBe('#5BAD8F');
      expect(cat.budgetPeriod).toBe('weekly');
      expect(cat.isActive).toBe(false);
      expect(cat.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(cat.workspaceId).toBe('ws_2');
    });

    it('uses defaultWsId when workspaceId column is undefined', () => {
      const row = ['cat_4', 'usr_1', 'Ocio', '🎮', '#E57373', 'expense', '', 'monthly', 'true', '2024-01-01T00:00:00.000Z', undefined];
      const cat = rowToCategory(row, 'ws_default');
      expect(cat.workspaceId).toBe('ws_default');
    });

    it('maps isActive false when row[8] is "false"', () => {
      const row = ['cat_5', 'usr_1', 'Archivada', '📦', '#000000', 'expense', '', 'monthly', 'false', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const cat = rowToCategory(row);
      expect(cat.isActive).toBe(false);
    });

    it('categoryToRow preserves null budgetAmount as empty string', () => {
      const row = ['cat_6', 'usr_1', 'Sin presupuesto', '💸', '#5BAD8F', 'expense', '', 'monthly', 'true', '2024-01-01T00:00:00.000Z', 'ws_1'];
      const cat = rowToCategory(row);
      expect(cat.budgetAmount).toBeNull();
      const backToRow = categoryToRow(cat);
      expect(backToRow[6]).toBe(''); // null → ''
    });
  });
});
