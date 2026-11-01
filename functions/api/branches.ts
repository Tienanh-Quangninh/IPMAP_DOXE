import { branches, json, route } from '../../shared/server';
export const onRequest = route('GET', () => json({ branches }));
