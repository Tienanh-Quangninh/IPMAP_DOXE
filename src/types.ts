export type { Branch, Job } from '../shared/types';
export type Product = {
  id: string;
  name: string;
  category: string;
  vehicle: string;
  brand: string;
  models: string[];
  description: string;
  image: string;
  tag: string;
  price: number | null;
};
