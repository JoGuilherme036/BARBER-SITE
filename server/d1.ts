// Minimal Cloudflare D1 typings used by the API (avoids pulling the full workers-types package).
export interface D1Result<T = unknown> {
  results: T[];
  meta: { changes: number; last_row_id: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
export type Env = { DB: D1Database; ADMIN_TOKEN?: string };
