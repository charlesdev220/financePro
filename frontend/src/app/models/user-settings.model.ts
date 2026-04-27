export interface IUserSettings {
  settingId: string;
  userId: string;
  key: string;
  value: string; // Serialized as string — parse on consumer side
}

/** Typed keys for user settings to avoid magic strings across the app */
export type UserSettingKey =
  | 'global_monthly_limit'
  | 'alert_threshold_pct'
  | 'default_view_period'
  | 'custom_period_days'
  | 'base_currency'
  | 'default_category_budget';
