export interface IConcept {
  conceptId: string;
  userId: string;
  categoryId: string;
  text: string;
  usageCount: number;
  lastUsed: string; // ISO 8601 timestamp
}
