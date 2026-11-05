export type VehicleKind = 'all' | 'motorcycle' | 'car';
export type VehicleFilters = {
  kind: VehicleKind;
  brand: string;
  minPrice: number;
  maxPrice: number;
  radiusKm: number;
  province: string;
};
export const searchRadii = [5, 10, 25, 50];
export const vehicleBrands = {
  motorcycle: [
    'Honda',
    'Yamaha',
    'Suzuki',
    'SYM',
    'Piaggio',
    'Vespa',
    'Kymco',
    'Kawasaki',
    'KTM',
    'Ducati',
    'BMW Motorrad',
    'Triumph',
    'Royal Enfield',
    'Benelli',
    'GPX',
    'CFMoto',
    'VinFast',
    'Yadea',
    'Dat Bike',
    'Pega',
    'Dibao',
    'DK Bike',
    'Harley-Davidson',
    'Aprilia',
  ],
  car: [
    'Toyota',
    'Hyundai',
    'Kia',
    'Mazda',
    'Ford',
    'Honda',
    'Suzuki',
    'Mitsubishi',
    'Nissan',
    'Chevrolet',
    'VinFast',
    'Peugeot',
    'Mercedes-Benz',
    'BMW',
    'Audi',
    'Lexus',
    'Volvo',
    'Volkswagen',
    'Subaru',
    'Isuzu',
    'MG',
    'BYD',
    'Wuling',
    'Chery',
    'Omoda',
    'Jaecoo',
    'Skoda',
    'Porsche',
    'Land Rover',
    'MINI',
  ],
};
export function brandsFor(kind: VehicleKind): string[] {
  return kind === 'all'
    ? [...new Set([...vehicleBrands.motorcycle, ...vehicleBrands.car])]
    : vehicleBrands[kind];
}
export const defaultVehicleFilters: VehicleFilters = {
  kind: 'all',
  brand: 'all',
  minPrice: 1,
  maxPrice: 200,
  radiusKm: 25,
  province: '',
};

// Fictional offers for UI demonstration. Prices, year, mileage and distances
// do not describe actual vehicles or verified sellers near a visitor.
const motorcycles: [string, string, number][] = [
  ['Honda', 'Wave Alpha', 8],
  ['Honda', 'Vision', 22],
  ['Honda', 'Air Blade', 29],
  ['Honda', 'SH Mode', 42],
  ['Honda', 'Winner X', 25],
  ['Honda', 'Future', 18],
  ['Honda', 'Dream', 12],
  ['Honda', 'Super Cub', 7],
  ['Honda', 'SH 150i', 65],
  ['Yamaha', 'Sirius', 9],
  ['Yamaha', 'Jupiter', 15],
  ['Yamaha', 'Exciter', 28],
  ['Yamaha', 'Janus', 19],
  ['Yamaha', 'Grande', 31],
  ['Yamaha', 'NVX', 36],
  ['Suzuki', 'Raider', 32],
  ['Suzuki', 'Satria', 39],
  ['Suzuki', 'Axelo', 13],
  ['SYM', 'Galaxy', 6],
  ['SYM', 'Attila', 5],
  ['Piaggio', 'Liberty', 24],
  ['Vespa', 'Primavera', 48],
  ['Kymco', 'Like 50', 10],
  ['Kawasaki', 'Ninja 300', 76],
  ['Benelli', 'TNT 150', 21],
  ['VinFast', 'Klara', 14],
  ['Yadea', 'G5', 11],
  ['Pega', 'Cap A', 3],
  ['Dibao', 'Gogo', 2],
  ['DK Bike', 'S1', 1],
];
const cars: [string, string, number][] = [
  ['Toyota', 'Vios', 175],
  ['Toyota', 'Corolla', 120],
  ['Hyundai', 'Getz', 135],
  ['Hyundai', 'Grand i10', 195],
  ['Kia', 'Morning', 155],
  ['Kia', 'Pride', 55],
  ['Chevrolet', 'Spark', 95],
  ['Chevrolet', 'Aveo', 160],
  ['Ford', 'Laser', 105],
  ['Ford', 'Focus', 185],
  ['Mazda', '323', 78],
  ['Honda', 'Civic', 200],
  ['Suzuki', 'Wagon R', 65],
  ['Suzuki', 'Vitara', 145],
  ['Mitsubishi', 'Lancer', 125],
  ['Nissan', 'Sunny', 190],
  ['Daewoo', 'Matiz', 45],
  ['Daewoo', 'Lacetti', 115],
  ['Mercedes-Benz', 'C180', 198],
  ['BMW', '318i', 188],
];
// Include historic makes appearing in used-car demo offers.
vehicleBrands.car.push('Daewoo');
export const demoVehicles = [...motorcycles, ...cars].map(([brand, model, price], index) => ({
  id: `demo-${String(index + 1).padStart(3, '0')}`,
  kind: (index < motorcycles.length ? 'motorcycle' : 'car') as Exclude<VehicleKind, 'all'>,
  brand,
  model,
  price,
  year: (index < motorcycles.length ? 2014 : 2001) + (index % 10),
  mileageKm: 4000 + index * 1700,
  distanceKm: Math.round((0.8 + ((index * 7) % 48) * 0.45) * 10) / 10,
  demo: true as const,
}));
export type DemoVehicle = (typeof demoVehicles)[number];
export function findDemoVehicles(filters: VehicleFilters): DemoVehicle[] {
  return demoVehicles
    .filter(
      (v) =>
        (filters.kind === 'all' || v.kind === filters.kind) &&
        (filters.brand === 'all' || v.brand === filters.brand) &&
        v.price >= filters.minPrice &&
        v.price <= filters.maxPrice &&
        v.distanceKm <= filters.radiusKm,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm || a.price - b.price);
}
