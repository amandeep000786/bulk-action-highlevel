export interface BulkActionPayload {
  actionId: string;
  updates: Partial<ContactUpdate>;
  entities: string[];
}

export interface ContactUpdate {
  name?: string;
  email?: string;
  age?: number;
  status?: string;
}
