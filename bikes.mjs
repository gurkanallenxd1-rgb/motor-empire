const categories = {
  'Honda CB 125F': 'commuter', 'Yamaha YBR 125': 'commuter', 'Suzuki GN 125': 'commuter',
  'Mondial Drift L': 'commuter', 'Bajaj Pulsar NS 200': 'naked', 'TVS Apache RTR 160': 'naked',
  'Honda CBR 125R': 'sport', 'Yamaha Delight 125': 'scooter',
};

export const categoryLabel = { commuter: 'Şehir motosikleti', naked: 'Naked', sport: 'Sport', scooter: 'Scooter' };
export const categoryOf = bike => categories[bike.name] ?? 'commuter';
export const spriteUrl = category => new URL(`./assets/${category}.webp`, import.meta.url).href;
