export interface ICurrency {
  currencyCode: string; // ISO 4217, e.g. 'USD'
  name: string;
  rateToBase: number; // Conversion rate relative to user's base currency
  lastUpdated: string; // ISO 8601 timestamp
  source: 'api' | 'manual';
}
