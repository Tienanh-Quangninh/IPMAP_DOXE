export interface Branch {
  id: string;
  name: string;
  province: string;
  aliases: string[];
  address: string;
  lat: number;
  lng: number;
  hotline: string;
  mapUrl: string;
  services: string[];
  active: boolean;
  verified: boolean;
  recruitmentEnabled: boolean;
}

export interface Job {
  id: string;
  branchId: string | null;
  scope?: 'national' | 'branch';
  title: string;
  salary: string;
  benefits: string[];
  vehicle: 'motorcycle' | 'car' | 'any';
  active: boolean;
}

export interface Province {
  name: string;
  aliases: string[];
}

// Small structural interfaces keep the Functions independent of generated vendor types.
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes?: number };
}
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
}
export interface EventDatabase {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
}
export interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TURNSTILE_SECRET_KEY?: string;
  EVENT_STORE?: EventDatabase;
}
export interface FunctionContext {
  request: Request & { cf?: { region?: string; country?: string } };
  env: Env;
}
