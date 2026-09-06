export type Spec = { k: string; v: string };

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: string; // category key
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: { label: string; tone: "accent" | "ink" };
  /** shown in the Nouvel arrivage row */
  isNew?: boolean;
  /** announced but not on the shelf yet — orderable, ships when it lands */
  preorder?: boolean;
  short: string;
  specs: Spec[];
  stock: boolean;
};

export type Category = {
  key: string;
  name: string;
  image: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { key: "pc-gamer", name: "PC Gamer", image: "/products/setup.jpg", blurb: "Configs prêtes & sur-mesure" },
  { key: "cartes-graphiques", name: "Cartes graphiques", image: "/products/gpu.jpg", blurb: "GeForce & Radeon" },
  { key: "processeurs", name: "Processeurs", image: "/products/cpu.jpg", blurb: "Intel & AMD" },
  { key: "portables", name: "Portables", image: "/products/laptop.jpg", blurb: "Gaming & créateurs" },
  { key: "peripheriques", name: "Périphériques", image: "/products/mouse.jpg", blurb: "Souris · Claviers · Casques" },
  { key: "ecrans", name: "Écrans", image: "/products/monitor.jpg", blurb: "144 – 360 Hz" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "apl-tech-rtx-5080-oc",
    name: "APL TECH RTX 5080 OC",
    brand: "NVIDIA",
    category: "cartes-graphiques",
    price: 289000,
    oldPrice: 329000,
    image: "/products/gpu.jpg",
    rating: 4.9,
    reviews: 132,
    badge: { label: "-12%", tone: "accent" },
    short: "La nouvelle référence du ray tracing, refroidie par un triple ventilateur axial signé APL TECH.",
    specs: [
      { k: "Mémoire", v: "16 Go GDDR7" },
      { k: "Fréquence boost", v: "2,72 GHz" },
      { k: "Consommation", v: "320 W" },
      { k: "Sorties", v: "3× DisplayPort 2.1 · HDMI 2.1" },
      { k: "Refroidissement", v: "Triple ventilateur axial" },
    ],
    stock: true,
  },
  {
    slug: "radeon-rx-9070-xt",
    isNew: true,
    name: "Radeon RX 9070 XT",
    brand: "AMD",
    category: "cartes-graphiques",
    price: 214000,
    image: "/products/gpu.jpg",
    rating: 4.7,
    reviews: 64,
    short: "Le meilleur rapport puissance/prix pour le 1440p haute fréquence.",
    specs: [
      { k: "Mémoire", v: "16 Go GDDR6" },
      { k: "Fréquence boost", v: "2,97 GHz" },
      { k: "Consommation", v: "304 W" },
      { k: "Sorties", v: "3× DisplayPort · HDMI 2.1" },
    ],
    stock: true,
  },
  {
    slug: "ryzen-9-9950x",
    name: "AMD Ryzen 9 9950X",
    brand: "AMD",
    category: "processeurs",
    price: 98000,
    image: "/products/cpu.jpg",
    rating: 4.9,
    reviews: 78,
    short: "16 cœurs Zen 5 pour le gaming comme pour la création la plus lourde.",
    specs: [
      { k: "Cœurs / Threads", v: "16 / 32" },
      { k: "Fréquence boost", v: "5,7 GHz" },
      { k: "Socket", v: "AM5" },
      { k: "TDP", v: "170 W" },
      { k: "Cache", v: "80 Mo" },
    ],
    stock: true,
  },
  {
    slug: "core-ultra-9-285k",
    isNew: true,
    name: "Intel Core Ultra 9 285K",
    brand: "Intel",
    category: "processeurs",
    price: 92000,
    image: "/products/cpu.jpg",
    rating: 4.8,
    reviews: 51,
    short: "Architecture nouvelle génération, efficacité énergétique au sommet.",
    specs: [
      { k: "Cœurs / Threads", v: "24 / 24" },
      { k: "Fréquence boost", v: "5,7 GHz" },
      { k: "Socket", v: "LGA 1851" },
      { k: "TDP", v: "125 W" },
    ],
    stock: true,
  },
  {
    slug: "helios-neo-16",
    name: "Predator Helios Neo 16",
    brand: "Acer",
    category: "portables",
    price: 310000,
    image: "/products/laptop.jpg",
    rating: 4.8,
    reviews: 87,
    badge: { label: "Top vente", tone: "ink" },
    short: "Un portable fin et brutal, dalle 240 Hz et refroidissement vapor-chamber.",
    specs: [
      { k: "Processeur", v: "Intel Core i9" },
      { k: "Carte graphique", v: "RTX 5070 Laptop" },
      { k: "Écran", v: "16″ WQXGA 240 Hz" },
      { k: "Mémoire", v: "32 Go DDR5" },
      { k: "Stockage", v: "1 To NVMe" },
    ],
    stock: true,
  },
  {
    slug: "rog-zephyrus-g14",
    isNew: true,
    name: "ASUS ROG Zephyrus G14",
    brand: "ASUS",
    category: "portables",
    price: 365000,
    image: "/products/laptop.jpg",
    rating: 4.9,
    reviews: 42,
    short: "L'ultraportable gaming par excellence, châssis aluminium et dalle OLED.",
    specs: [
      { k: "Processeur", v: "Ryzen 9" },
      { k: "Carte graphique", v: "RTX 5070 Ti Laptop" },
      { k: "Écran", v: "14″ OLED 120 Hz" },
      { k: "Mémoire", v: "32 Go LPDDR5X" },
      { k: "Stockage", v: "1 To NVMe" },
    ],
    stock: true,
  },
  {
    slug: "razer-viper-v3-pro",
    name: "Razer Viper V3 Pro",
    brand: "Razer",
    category: "peripheriques",
    price: 9900,
    oldPrice: 12500,
    image: "/products/mouse.jpg",
    rating: 4.9,
    reviews: 204,
    badge: { label: "-20%", tone: "accent" },
    short: "54 g de précision pure, capteur 35K et sans-fil 8000 Hz.",
    specs: [
      { k: "Capteur", v: "Focus Pro 35K" },
      { k: "Polling", v: "8000 Hz sans-fil" },
      { k: "Poids", v: "54 g" },
      { k: "Switchs", v: "Optiques Gen-3" },
    ],
    stock: true,
  },
  {
    slug: "razer-huntsman-mini",
    isNew: true,
    name: "Razer Huntsman Mini",
    brand: "Razer",
    category: "peripheriques",
    price: 14500,
    image: "/products/keyboard.jpg",
    rating: 4.7,
    reviews: 56,
    badge: { label: "Nouveau", tone: "ink" },
    short: "Format 60% compact, switchs optiques linéaires ultra-rapides.",
    specs: [
      { k: "Format", v: "60 %" },
      { k: "Switchs", v: "Optiques linéaires" },
      { k: "Rétroéclairage", v: "Chroma RGB" },
      { k: "Câble", v: "USB-C détachable" },
    ],
    stock: true,
  },
  {
    slug: "blackshark-v2-pro",
    name: "Razer BlackShark V2 Pro",
    brand: "Razer",
    category: "peripheriques",
    price: 16900,
    image: "/products/headset.jpg",
    rating: 4.7,
    reviews: 110,
    short: "Le casque esport de référence : son spatial THX et micro détachable.",
    specs: [
      { k: "Transducteurs", v: "TriForce Titanium 50 mm" },
      { k: "Sans-fil", v: "2,4 GHz + Bluetooth" },
      { k: "Autonomie", v: "70 h" },
      { k: "Micro", v: "HyperClear détachable" },
    ],
    stock: true,
  },
  {
    slug: "odyssey-oled-g6-27",
    name: "Samsung Odyssey OLED G6 27″",
    brand: "Samsung",
    category: "ecrans",
    price: 86000,
    oldPrice: 95000,
    image: "/products/monitor.jpg",
    rating: 4.8,
    reviews: 41,
    badge: { label: "-10%", tone: "accent" },
    short: "Dalle OLED 360 Hz, des noirs parfaits et 0,03 ms de réactivité.",
    specs: [
      { k: "Dalle", v: "27″ QD-OLED" },
      { k: "Résolution", v: "2560 × 1440" },
      { k: "Rafraîchissement", v: "360 Hz" },
      { k: "Temps de réponse", v: "0,03 ms" },
    ],
    stock: true,
  },
  {
    slug: "rog-swift-32-4k",
    name: "ASUS ROG Swift 32″ 4K",
    brand: "ASUS",
    category: "ecrans",
    price: 132000,
    image: "/products/monitor.jpg",
    rating: 4.8,
    reviews: 29,
    short: "Le grand format 4K 240 Hz pour ceux qui ne font aucun compromis.",
    specs: [
      { k: "Dalle", v: "32″ QD-OLED" },
      { k: "Résolution", v: "3840 × 2160" },
      { k: "Rafraîchissement", v: "240 Hz" },
      { k: "HDR", v: "True Black 400" },
    ],
    stock: false,
  },
  {
    slug: "setup-apl-tech-pro",
    name: "Setup APL TECH Pro",
    brand: "APL TECH",
    category: "pc-gamer",
    price: 540000,
    image: "/products/setup.jpg",
    rating: 5.0,
    reviews: 33,
    badge: { label: "Sur-mesure", tone: "ink" },
    short: "Notre config ultime, assemblée et testée à la main pour le 4K sans limite.",
    specs: [
      { k: "Carte graphique", v: "RTX 5080 16 Go" },
      { k: "Processeur", v: "Ryzen 9 9950X" },
      { k: "Mémoire", v: "32 Go DDR5 6000" },
      { k: "Stockage", v: "2 To NVMe Gen4" },
      { k: "Refroidissement", v: "AIO 360 mm ARGB" },
    ],
    stock: true,
  },
  {
    slug: "apl-tech-starter",
    name: "APL TECH Starter",
    brand: "APL TECH",
    category: "pc-gamer",
    price: 165000,
    image: "/products/setup.jpg",
    rating: 4.6,
    reviews: 58,
    short: "L'entrée parfaite dans le PC gaming : du 1080p ultra fluide, sans se ruiner.",
    specs: [
      { k: "Carte graphique", v: "RTX 5060 8 Go" },
      { k: "Processeur", v: "Ryzen 5 9600X" },
      { k: "Mémoire", v: "16 Go DDR5" },
      { k: "Stockage", v: "1 To NVMe" },
    ],
    stock: true,
  },
];

export const BRANDS = Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort();

export function formatDA(n: number): string {
  return n.toLocaleString("fr-FR") + " DA";
}

export const NEW_ARRIVALS = PRODUCTS.filter((p) => p.isNew);

/** A promo is simply a product carrying a struck-through oldPrice — no extra
 *  flag to keep in sync with the price itself. */
export const PROMOS = PRODUCTS.filter((p) => p.oldPrice !== undefined && p.stock);

/* ── Badges ───────────────────────────────────────────────────────────────
   Derived from the product rather than stored beside it, so a badge cannot
   end up contradicting the price or the stock flag it describes. The order is
   the priority order: the first is the one a cramped layout shows alone. */
export type BadgeKind = "promo" | "new" | "preorder" | "out";

export function badgeKinds(p: Product): BadgeKind[] {
  const kinds: BadgeKind[] = [];
  if (p.oldPrice !== undefined) kinds.push("promo");
  if (p.isNew) kinds.push("new");
  // a pre-order is not a rupture — nobody failed to stock it yet
  if (p.preorder) kinds.push("preorder");
  else if (!p.stock) kinds.push("out");
  return kinds;
}

/** the saving as a whole percent, for a promo carrying no label of its own */
export function discountPct(p: Product): number | null {
  if (p.oldPrice === undefined || p.oldPrice <= p.price) return null;
  return Math.round((1 - p.price / p.oldPrice) * 100);
}

/** orderable at all — a pre-order takes money, a rupture does not */
export function isOrderable(p: Product): boolean {
  return p.stock || p.preorder === true;
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getByCategory(key: string): Product[] {
  return PRODUCTS.filter((p) => p.category === key);
}

export function categoryName(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.name ?? key;
}
