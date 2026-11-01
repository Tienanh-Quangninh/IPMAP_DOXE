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

export interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TURNSTILE_SECRET_KEY?: string;
}
export interface FunctionContext {
  request: Request & { cf?: { region?: string; country?: string } };
  env: Env;
}
