/**
 * @file Schema.gs
 * @description Definición de la estructura de la base de datos de MyFinance.
 */

const DATABASE_SCHEMA = {
  'USERS': [
    'user_id', 
    'email', 
    'display_name', 
    'default_currency', 
    'period_start_day', 
    'created_at'
  ],
  'WALLETS': [
    'wallet_id', 
    'user_id', 
    'name', 
    'currency', 
    'balance', 
    'color', 
    'icon', 
    'is_default', 
    'created_at'
  ],
  'CATEGORIES': [
    'category_id', 
    'user_id', 
    'name', 
    'icon', 
    'color', 
    'type', 
    'budget_amount', 
    'budget_period', 
    'is_active'
  ],
  'TRANSACTIONS': [
    'tx_id', 
    'user_id', 
    'wallet_id', 
    'category_id', 
    'amount', 
    'currency', 
    'amount_base', 
    'concept', 
    'date', 
    'type', 
    'is_recurring',
    'recurrence_rule',
    'notes',
    'created_at', 
    'updated_at'
  ],
  'BUDGETS': [
    'budget_id', 
    'user_id', 
    'category_id', 
    'period', 
    'spent_amount', 
    'budget_amount', 
    'status', 
    'last_updated'
  ],
  'CURRENCIES': [
    'currency_code', 
    'name', 
    'rate_to_base', 
    'last_updated', 
    'source'
  ],
  'CONCEPTS': [
    'concept_id', 
    'user_id', 
    'category_id', 
    'text', 
    'usage_count', 
    'last_used'
  ],
  'USER_SETTINGS': [
    'setting_id', 
    'user_id', 
    'key', 
    'value'
  ]
};
