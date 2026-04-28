export const WORKSPACE_DEFAULTS = {
  NAME: 'Personal',
  ICON: '🏠',
  COLOR: '--color-green-500',
} as const;

export const BUDGET_MODES = {
  INDEFINITE: 'indefinite',
  PERIOD: 'period',
  DISABLED: 'disabled',
} as const;

export type BudgetMode = typeof BUDGET_MODES[keyof typeof BUDGET_MODES];
