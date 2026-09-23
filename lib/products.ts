import { DEFAULT_LOCALE, type Locale } from "./locales";

/** `group` is the family the spec belongs to — PRD-11 prints one table per
    family. A spec with no group falls into the unnamed first block, so the
    field is optional and older entries keep working. */
export type Spec = { k: string; v: string; group?: string };

/**
 * How a product may be bought — PRD-06, chosen per product.
 *
 * "buy"      order it now
 * "preorder" order it now, arrives when it lands (PRD-07)
 * "builder"  not sold on its own; only inside a configuration (PRD-08)
 */
export type SaleMode = "buy" | "preorder" | "builder";

/**
 * The description an admin writes — PRD-10.
 *
 * A small block list rather than raw HTML: the fields are typed, nothing can
 * arrive as markup, and each block renders through a component we control.
 * `text` carries **bold** spans, which is the only inline mark the copy here
 * has ever needed.
 */
export type RichBlock =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "img"; src: string; alt?: string };

/**
 * A choice the customer makes before ordering — colour, switch type, capacity.
 *
 * The labels are plain strings, like every other piece of product copy in this
 * file: names, `short`, and the whole spec table are French only, and a
 * variant that went through the phrasebook would be the one string on the page
 * that changed language while the product around it did not.
 *
 * `swatch` is any CSS colour, and a dual-tone finish can give two — the chip
 * splits down the middle rather than lying about which half is which. An
 * option with no swatch at all shows its label instead, which is what a
 * "Switch rouge / Switch marron" group wants.
 */
export type VariantOption = {
  id: string;
  label: string;
  swatch?: string | [string, string];
  /** sold out in this finish only; the product itself is still in stock */
  sold?: boolean;
};

export type VariantGroup = {
  /** shown above the row — "Couleur", "Switches" */
  name: string;
  options: VariantOption[];
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: string; // category key
  /** the shelf inside that category; every product in PRODUCTS carries one */
  subcategory?: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: { label: string; tone: BadgeTone };
  /** shown in the Nouvel arrivage row */
  isNew?: boolean;
  /** announced but not on the shelf yet — orderable, ships when it lands */
  preorder?: boolean;
  short: string;
  specs: Spec[];
  stock: boolean;

  /* ── everything below is set per product by the admin ── */

  /** PRD-01 — the gallery, first shot leading. Falls back to `image` alone. */
  images?: string[];
  /** PRD-05 — how many are actually left, when the count is known */
  stockCount?: number;
  /** PRD-05 — the count at or below which the page starts pressing */
  lowStockThreshold?: number;
  /** PRD-06 — defaults to "preorder" when `preorder` is set, else "buy" */
  saleMode?: SaleMode;
  /** PRD-07 — free text, e.g. "Livraison estimée fin mars" */
  preorderEta?: string;
  /** PRD-02 — the finishes this one is sold in, if it is sold in more than one */
  variants?: VariantGroup[];
  /** PRD-10 — the long description */
  description?: RichBlock[];
  /** PRD-12 — pinned by hand; the rest of the row is filled automatically */
  related?: string[];
  /** FID-10 — what buying one earns on the loyalty card. Unset earns by the
      rule in `lib/loyalty/program.ts`, so the programme covers the whole
      catalogue and not only the rows the admin has been through. */
  points?: number;
};

/** A narrower shelf inside a category — the level the store is actually
    browsed at once you know roughly what you are after. Names live in the
    phrasebook under `sub.<key>`; the one here is the French fallback, the
    same arrangement Category uses. */
export type Sub = { key: string; name: string };

export type Category = {
  key: string;
  name: string;
  image: string;
  blurb: string;
  /** Ordered as the drawer and the filter panel list them. */
  subs: Sub[];
};

export const CATEGORIES: Category[] = [
  {
    key: "pc-gamer",
    name: "PC Gamer",
    image: "/products/setup.jpg",
    blurb: "Configs prêtes & sur-mesure",
    subs: [
      { key: "pc-starter", name: "Essentiel" },
      { key: "pc-performance", name: "Performance" },
      { key: "pc-extreme", name: "Extrême" },
    ],
  },
  {
    key: "cartes-graphiques",
    name: "Cartes graphiques",
    image: "/products/gpu.jpg",
    blurb: "GeForce & Radeon",
    subs: [
      { key: "gpu-geforce", name: "NVIDIA GeForce" },
      { key: "gpu-radeon", name: "AMD Radeon" },
      { key: "gpu-arc", name: "Intel Arc" },
    ],
  },
  {
    key: "processeurs",
    name: "Processeurs",
    image: "/products/cpu.jpg",
    blurb: "Intel & AMD",
    subs: [
      { key: "cpu-ryzen", name: "AMD Ryzen" },
      { key: "cpu-core", name: "Intel Core" },
    ],
  },
  {
    key: "cartes-meres",
    name: "Cartes mères",
    image: "/products/cpu.jpg",
    blurb: "AM5 · LGA 1851",
    subs: [
      { key: "mb-am5", name: "AMD AM5" },
      { key: "mb-lga1851", name: "Intel LGA 1851" },
      { key: "mb-lga1700", name: "Intel LGA 1700" },
      { key: "mb-itx", name: "Mini-ITX" },
    ],
  },
  {
    key: "memoire",
    name: "Mémoire",
    image: "/products/cpu.jpg",
    blurb: "DDR5 jusqu'à 6400 MT/s",
    subs: [
      { key: "ram-ddr5", name: "DDR5" },
      { key: "ram-ddr4", name: "DDR4" },
      { key: "ram-sodimm", name: "SO-DIMM" },
    ],
  },
  {
    key: "stockage",
    name: "Stockage",
    image: "/products/cpu.jpg",
    blurb: "SSD NVMe Gen4 & Gen5",
    subs: [
      { key: "ssd-nvme", name: "SSD NVMe" },
      { key: "ssd-sata", name: "SSD SATA" },
      { key: "hdd", name: "Disques durs" },
      { key: "stockage-externe", name: "Stockage externe" },
    ],
  },
  {
    key: "refroidissement",
    name: "Refroidissement",
    image: "/products/setup.jpg",
    blurb: "AIO & ventirads",
    subs: [
      { key: "refro-aio", name: "Watercooling AIO" },
      { key: "refro-air", name: "Ventirads" },
      { key: "refro-ventilateurs", name: "Ventilateurs" },
    ],
  },
  {
    key: "alimentations",
    name: "Alimentations",
    image: "/products/setup.jpg",
    blurb: "80+ Gold & Platinum",
    subs: [
      { key: "psu-bronze", name: "80+ Bronze" },
      { key: "psu-gold", name: "80+ Gold" },
      { key: "psu-platinum", name: "80+ Platinum" },
    ],
  },
  {
    key: "boitiers",
    name: "Boîtiers",
    image: "/products/setup.jpg",
    blurb: "ATX · Micro-ATX",
    subs: [
      { key: "case-atx", name: "Moyen-tour ATX" },
      { key: "case-matx", name: "Micro-ATX" },
      { key: "case-itx", name: "Mini-ITX" },
    ],
  },
  {
    key: "portables",
    name: "Portables",
    image: "/products/laptop.jpg",
    blurb: "Gaming & créateurs",
    subs: [
      { key: "laptop-gaming", name: "Gaming" },
      { key: "laptop-createur", name: "Créateurs" },
      { key: "laptop-bureautique", name: "Bureautique" },
    ],
  },
  {
    key: "peripheriques",
    name: "Périphériques",
    image: "/products/mouse.jpg",
    blurb: "Souris · Claviers · Casques",
    subs: [
      { key: "peri-souris", name: "Souris" },
      { key: "peri-claviers", name: "Claviers" },
      { key: "peri-casques", name: "Casques" },
      { key: "peri-tapis", name: "Tapis de souris" },
    ],
  },
  {
    key: "ecrans",
    name: "Écrans",
    image: "/products/monitor.jpg",
    blurb: "144 – 360 Hz",
    subs: [
      { key: "ecran-fhd", name: "Full HD" },
      { key: "ecran-qhd", name: "QHD" },
      { key: "ecran-4k", name: "4K UHD" },
      { key: "ecran-ultrawide", name: "Ultrawide" },
    ],
  },
  {
    key: "streaming",
    name: "Streaming",
    image: "/products/headset.jpg",
    blurb: "Micros · Webcams · Éclairage",
    subs: [
      { key: "stream-micros", name: "Micros" },
      { key: "stream-webcams", name: "Webcams" },
      { key: "stream-eclairage", name: "Éclairage" },
      { key: "stream-controle", name: "Contrôle & capture" },
    ],
  },
  {
    key: "chaises",
    name: "Chaises gaming",
    image: "/products/setup.jpg",
    blurb: "Longues sessions",
    subs: [
      { key: "chaise-tissu", name: "Tissu" },
      { key: "chaise-cuir", name: "Simili-cuir" },
      { key: "chaise-ergonomique", name: "Ergonomiques" },
    ],
  },
];

export const PRODUCTS: Product[] = [
  {
    slug: "apl-tech-rtx-5080-oc",
    name: "APL TECH RTX 5080 OC",
    brand: "NVIDIA",
    category: "cartes-graphiques",
    subcategory: "gpu-geforce",
    price: 289000,
    oldPrice: 329000,
    image: "/products/gpu.jpg",
    rating: 4.9,
    reviews: 132,
    badge: { label: "-12%", tone: "sale" },
    short: "La nouvelle référence du ray tracing, refroidie par un triple ventilateur axial signé APL TECH.",
    images: [
      "/products/gpu.jpg",
      "/products/setup.jpg",
      "/products/cpu.jpg",
      "/products/monitor.jpg",
      "/products/apl-promo.jpg",
    ],
    specs: [
      { group: "Processeur graphique", k: "Architecture", v: "Blackwell" },
      { group: "Processeur graphique", k: "Fréquence boost", v: "2,72 GHz" },
      { group: "Processeur graphique", k: "Unités de calcul", v: "10 752 CUDA" },
      { group: "Mémoire", k: "Capacité", v: "16 Go GDDR7" },
      { group: "Mémoire", k: "Bus", v: "256 bits" },
      { group: "Mémoire", k: "Bande passante", v: "960 Go/s" },
      { group: "Alimentation", k: "Consommation", v: "320 W" },
      { group: "Alimentation", k: "Alimentation conseillée", v: "850 W" },
      { group: "Alimentation", k: "Connecteurs", v: "1× 16 broches (12V-2×6)" },
      { group: "Connectique", k: "Sorties", v: "3× DisplayPort 2.1 · HDMI 2.1" },
      { group: "Connectique", k: "Résolution max", v: "7680 × 4320 à 60 Hz" },
      { group: "Refroidissement", k: "Système", v: "Triple ventilateur axial" },
      { group: "Refroidissement", k: "Nuisance sonore", v: "32 dB(A) en charge" },
      { group: "Refroidissement", k: "Format", v: "3,2 slots · 336 mm" },
    ],
    description: [
      {
        t: "p",
        text: "La RTX 5080 OC est la carte que nous montons nous-mêmes dans nos configurations haut de gamme. Le PCB de référence NVIDIA reçoit un **étage d'alimentation renforcé** et un ventirad triple axial conçu par APL TECH, testé sur nos bancs à Alger avant d'être proposé en boutique.",
      },
      { t: "h", text: "Pensée pour le 4K" },
      {
        t: "p",
        text: "Les 16 Go de GDDR7 tiennent les textures ultra sans compromis, et le ray tracing de troisième génération reste jouable là où la génération précédente demandait de baisser les curseurs.",
      },
      {
        t: "ul",
        items: [
          "4K 120 Hz sur les titres récents avec DLSS en mode qualité",
          "Ray tracing intégral sans effondrement du framerate",
          "Encodeur AV1 double flux pour le streaming et le montage",
          "Trois ans de garantie officielle, prise en charge à Alger",
        ],
      },
      { t: "img", src: "/products/setup.jpg", alt: "La carte montée dans une configuration APL TECH" },
      { t: "h", text: "Montage et garantie" },
      {
        t: "p",
        text: "Livrée scellée avec sa facture. Le montage est offert si la carte est commandée avec une configuration complète, et notre atelier vérifie les températures avant expédition.",
      },
    ],
    related: ["radeon-rx-9070-xt", "ryzen-9-9950x"],
    saleMode: "buy",
    stockCount: 3,
    lowStockThreshold: 5,
    stock: true,
  },
  {
    slug: "radeon-rx-9070-xt",
    isNew: true,
    name: "Radeon RX 9070 XT",
    brand: "AMD",
    category: "cartes-graphiques",
    subcategory: "gpu-radeon",
    price: 214000,
    image: "/products/gpu.jpg",
    rating: 4.7,
    reviews: 64,
    short: "Le meilleur rapport puissance/prix pour le 1440p haute fréquence.",
    images: ["/products/gpu.jpg", "/products/cpu.jpg", "/products/setup.jpg"],
    specs: [
      { group: "Processeur graphique", k: "Architecture", v: "RDNA 4" },
      { group: "Processeur graphique", k: "Fréquence boost", v: "2,97 GHz" },
      { group: "Mémoire", k: "Capacité", v: "16 Go GDDR6" },
      { group: "Mémoire", k: "Bus", v: "256 bits" },
      { group: "Alimentation", k: "Consommation", v: "304 W" },
      { group: "Alimentation", k: "Alimentation conseillée", v: "750 W" },
      { group: "Connectique", k: "Sorties", v: "3× DisplayPort · HDMI 2.1" },
    ],
    description: [
      {
        t: "p",
        text: "Notre carte de référence pour le 1440p à haute fréquence. Elle est **réservée aux configurations montées par nos soins** : l'alimentation, le boîtier et le refroidissement doivent suivre, et le configurateur s'en charge.",
      },
      {
        t: "ul",
        items: [
          "1440p 165 Hz sur la quasi-totalité du catalogue actuel",
          "16 Go de mémoire, confortable pour les années à venir",
          "Montée en charge silencieuse dans un boîtier bien ventilé",
        ],
      },
    ],
    related: ["apl-tech-rtx-5080-oc"],
    saleMode: "builder",
    stock: true,
  },
  {
    slug: "ryzen-9-9950x",
    name: "AMD Ryzen 9 9950X",
    brand: "AMD",
    category: "processeurs",
    subcategory: "cpu-ryzen",
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
    subcategory: "cpu-core",
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
    subcategory: "laptop-gaming",
    price: 310000,
    image: "/products/laptop.jpg",
    rating: 4.8,
    reviews: 87,
    badge: { label: "Top vente", tone: "gold" },
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
    subcategory: "laptop-gaming",
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
    subcategory: "peri-souris",
    price: 9900,
    oldPrice: 12500,
    image: "/products/mouse.jpg",
    rating: 4.9,
    reviews: 204,
    badge: { label: "-20%", tone: "sale" },
    short: "54 g de précision pure, capteur 35K et sans-fil 8000 Hz.",
    specs: [
      { k: "Capteur", v: "Focus Pro 35K" },
      { k: "Polling", v: "8000 Hz sans-fil" },
      { k: "Poids", v: "54 g" },
      { k: "Switchs", v: "Optiques Gen-3" },
    ],
    stock: true,
    variants: [
      {
        name: "Couleur",
        options: [
          { id: "noir", label: "Noir", swatch: "#141414" },
          { id: "blanc", label: "Blanc", swatch: "#f2f0ec" },
          { id: "faye", label: "Faye Edition", swatch: ["#f2f0ec", "#c9a227"], sold: true },
        ],
      },
    ],
  },
  {
    slug: "razer-huntsman-mini",
    isNew: true,
    name: "Razer Huntsman Mini",
    brand: "Razer",
    category: "peripheriques",
    subcategory: "peri-claviers",
    price: 14500,
    image: "/products/keyboard.jpg",
    rating: 4.7,
    reviews: 56,
    badge: { label: "Nouveau", tone: "new" },
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
    subcategory: "peri-casques",
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
    variants: [
      {
        name: "Couleur",
        options: [
          { id: "noir", label: "Noir", swatch: "#141414" },
          { id: "blanc", label: "Blanc", swatch: "#f2f0ec" },
        ],
      },
    ],
  },
  {
    slug: "odyssey-oled-g6-27",
    name: "Samsung Odyssey OLED G6 27″",
    brand: "Samsung",
    category: "ecrans",
    subcategory: "ecran-qhd",
    price: 86000,
    oldPrice: 95000,
    image: "/products/monitor.jpg",
    rating: 4.8,
    reviews: 41,
    badge: { label: "-10%", tone: "sale" },
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
    subcategory: "ecran-4k",
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
    subcategory: "pc-performance",
    price: 540000,
    image: "/products/setup.jpg",
    rating: 5.0,
    reviews: 33,
    badge: { label: "Sur-mesure", tone: "brand" },
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
    subcategory: "pc-starter",
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
  {
    slug: "rog-strix-b850-f",
    name: "ASUS ROG Strix B850-F Gaming",
    brand: "ASUS",
    category: "cartes-meres",
    subcategory: "mb-am5",
    price: 62000,
    image: "/products/cpu.jpg",
    rating: 4.7,
    reviews: 41,
    short: "La base solide d'une config AM5 : étage d'alimentation généreux et trois M.2 refroidis.",
    specs: [
      { k: "Socket", v: "AM5" },
      { k: "Chipset", v: "B850" },
      { k: "Mémoire", v: "4× DDR5 8000 MT/s" },
      { k: "Stockage", v: "3× M.2 PCIe 5.0" },
      { k: "Réseau", v: "2,5 GbE · Wi-Fi 7" },
    ],
    stock: true,
  },
  {
    slug: "mag-z890-tomahawk",
    isNew: true,
    name: "MSI MAG Z890 Tomahawk WiFi",
    brand: "MSI",
    category: "cartes-meres",
    subcategory: "mb-lga1851",
    price: 79000,
    image: "/products/cpu.jpg",
    rating: 4.6,
    reviews: 27,
    short: "Pour les Core Ultra série 2, avec la connectique Thunderbolt 4 en façade.",
    specs: [
      { k: "Socket", v: "LGA 1851" },
      { k: "Chipset", v: "Z890" },
      { k: "Mémoire", v: "4× DDR5 9200 MT/s" },
      { k: "Stockage", v: "4× M.2" },
      { k: "Réseau", v: "5 GbE · Wi-Fi 7" },
    ],
    stock: true,
  },
  {
    slug: "vengeance-32go-ddr5-6000",
    name: "Corsair Vengeance 32 Go DDR5-6000",
    brand: "Corsair",
    category: "memoire",
    subcategory: "ram-ddr5",
    price: 26500,
    oldPrice: 31000,
    image: "/products/cpu.jpg",
    rating: 4.8,
    reviews: 96,
    badge: { label: "-15%", tone: "sale" },
    short: "Le kit qui va avec tout : profil EXPO validé sur AM5, timings CL30 serrés.",
    specs: [
      { k: "Capacité", v: "32 Go (2× 16 Go)" },
      { k: "Type", v: "DDR5" },
      { k: "Fréquence", v: "6000 MT/s" },
      { k: "Latence", v: "CL30" },
    ],
    stock: true,
  },
  {
    slug: "trident-z5-64go-ddr5-6400",
    name: "G.Skill Trident Z5 RGB 64 Go DDR5-6400",
    brand: "G.Skill",
    category: "memoire",
    subcategory: "ram-ddr5",
    price: 52000,
    image: "/products/cpu.jpg",
    rating: 4.7,
    reviews: 34,
    short: "Deux barrettes de 32 Go pour les stations de montage qui ouvrent tout en même temps.",
    specs: [
      { k: "Capacité", v: "64 Go (2× 32 Go)" },
      { k: "Type", v: "DDR5" },
      { k: "Fréquence", v: "6400 MT/s" },
      { k: "Latence", v: "CL32" },
    ],
    stock: true,
  },
  {
    slug: "samsung-990-pro-2to",
    name: "Samsung 990 PRO 2 To",
    brand: "Samsung",
    category: "stockage",
    subcategory: "ssd-nvme",
    price: 38000,
    image: "/products/cpu.jpg",
    rating: 4.9,
    reviews: 148,
    short: "La référence Gen4 : des chargements courts et une dissipation qui tient dans la durée.",
    specs: [
      { k: "Capacité", v: "2 To" },
      { k: "Interface", v: "PCIe 4.0 NVMe" },
      { k: "Lecture", v: "7450 Mo/s" },
      { k: "Écriture", v: "6900 Mo/s" },
    ],
    stock: true,
  },
  {
    slug: "wd-black-sn850x-1to",
    name: "WD Black SN850X 1 To",
    brand: "Western Digital",
    category: "stockage",
    subcategory: "ssd-nvme",
    price: 21000,
    oldPrice: 24500,
    image: "/products/cpu.jpg",
    rating: 4.8,
    reviews: 112,
    badge: { label: "-14%", tone: "sale" },
    short: "Le disque de jeu par défaut : rapide, sobre, et livré avec son dissipateur.",
    specs: [
      { k: "Capacité", v: "1 To" },
      { k: "Interface", v: "PCIe 4.0 NVMe" },
      { k: "Lecture", v: "7300 Mo/s" },
      { k: "Écriture", v: "6300 Mo/s" },
    ],
    stock: true,
  },
  {
    slug: "nzxt-kraken-360-rgb",
    name: "NZXT Kraken 360 RGB",
    brand: "NZXT",
    category: "refroidissement",
    subcategory: "refro-aio",
    price: 41000,
    image: "/products/setup.jpg",
    rating: 4.6,
    reviews: 63,
    short: "Watercooling 360 mm à écran LCD, taillé pour les processeurs qui montent haut.",
    specs: [
      { k: "Format", v: "360 mm" },
      { k: "Ventilateurs", v: "3× 120 mm" },
      { k: "Nuisance", v: "36 dBA" },
      { k: "Sockets", v: "AM5 · LGA 1851" },
    ],
    stock: true,
  },
  {
    slug: "noctua-nh-d15-g2",
    name: "Noctua NH-D15 G2",
    brand: "Noctua",
    category: "refroidissement",
    subcategory: "refro-air",
    price: 24000,
    image: "/products/setup.jpg",
    rating: 4.9,
    reviews: 71,
    short: "Le ventirad qui refroidit comme un AIO sans une goutte de liquide dans le boîtier.",
    specs: [
      { k: "Format", v: "Double tour" },
      { k: "Ventilateurs", v: "2× 140 mm" },
      { k: "Nuisance", v: "24 dBA" },
      { k: "Hauteur", v: "168 mm" },
    ],
    stock: true,
  },
  {
    slug: "corsair-rm850x",
    name: "Corsair RM850x 850 W",
    brand: "Corsair",
    category: "alimentations",
    subcategory: "psu-gold",
    price: 32000,
    image: "/products/setup.jpg",
    rating: 4.8,
    reviews: 88,
    short: "Modulaire, silencieuse, et prête pour un câble 12V-2×6 sans adaptateur.",
    specs: [
      { k: "Puissance", v: "850 W" },
      { k: "Certification", v: "80+ Gold" },
      { k: "Câblage", v: "Full modulaire" },
      { k: "Garantie", v: "10 ans" },
    ],
    stock: true,
  },
  {
    slug: "msi-mag-a750gl",
    name: "MSI MAG A750GL 750 W",
    brand: "MSI",
    category: "alimentations",
    subcategory: "psu-gold",
    price: 21500,
    image: "/products/setup.jpg",
    rating: 4.5,
    reviews: 52,
    short: "Le bon compromis pour une config milieu de gamme, connecteur PCIe 5.1 inclus.",
    specs: [
      { k: "Puissance", v: "750 W" },
      { k: "Certification", v: "80+ Gold" },
      { k: "Câblage", v: "Full modulaire" },
      { k: "Garantie", v: "10 ans" },
    ],
    stock: false,
  },
  {
    slug: "lian-li-o11-dynamic-evo",
    name: "Lian Li O11 Dynamic EVO",
    brand: "Lian Li",
    category: "boitiers",
    subcategory: "case-atx",
    price: 34000,
    image: "/products/setup.jpg",
    rating: 4.9,
    reviews: 104,
    short: "Le boîtier vitrine par excellence : trois faces de radiateur et un montage inversable.",
    specs: [
      { k: "Format", v: "Moyen tour ATX" },
      { k: "Façade", v: "Verre trempé" },
      { k: "Radiateurs", v: "3× 360 mm" },
      { k: "Carte graphique", v: "423 mm max" },
    ],
    stock: true,
    variants: [
      {
        name: "Couleur",
        options: [
          { id: "noir", label: "Noir", swatch: "#16181c" },
          { id: "blanc", label: "Blanc", swatch: "#f2f0ec" },
          { id: "argent", label: "Argent", swatch: "#c8ccd2" },
          { id: "bicolore", label: "Noir & Blanc", swatch: ["#16181c", "#f2f0ec"] },
        ],
      },
    ],
  },
  {
    slug: "nzxt-h7-flow",
    isNew: true,
    name: "NZXT H7 Flow",
    brand: "NZXT",
    category: "boitiers",
    subcategory: "case-atx",
    price: 27000,
    image: "/products/setup.jpg",
    rating: 4.7,
    reviews: 59,
    short: "Une façade entièrement perforée : le flux d'air avant tout, sans sacrifier la ligne.",
    specs: [
      { k: "Format", v: "Moyen tour ATX" },
      { k: "Façade", v: "Maille perforée" },
      { k: "Radiateurs", v: "2× 360 mm" },
      { k: "Carte graphique", v: "400 mm max" },
    ],
    stock: true,
  },
  {
    slug: "elgato-stream-deck-mk2",
    name: "Elgato Stream Deck MK.2",
    brand: "Elgato",
    category: "streaming",
    subcategory: "stream-controle",
    price: 29000,
    image: "/products/headset.jpg",
    rating: 4.8,
    reviews: 77,
    short: "Quinze touches LCD pour piloter scène, son et alertes sans quitter la partie.",
    specs: [
      { k: "Touches", v: "15 touches LCD" },
      { k: "Connexion", v: "USB-C" },
      { k: "Logiciel", v: "Stream Deck 6" },
    ],
    stock: true,
  },
  {
    slug: "shure-mv7-plus",
    isNew: true,
    name: "Shure MV7+",
    brand: "Shure",
    category: "streaming",
    subcategory: "stream-micros",
    price: 46000,
    image: "/products/headset.jpg",
    rating: 4.9,
    reviews: 38,
    short: "Un micro dynamique qui pardonne les pièces mal traitées — USB et XLR dans le même corps.",
    specs: [
      { k: "Type", v: "Dynamique cardioïde" },
      { k: "Connexion", v: "USB-C · XLR" },
      { k: "Échantillonnage", v: "48 kHz / 24 bits" },
    ],
    stock: true,
  },
  {
    slug: "secretlab-titan-evo",
    name: "Secretlab Titan Evo",
    brand: "Secretlab",
    category: "chaises",
    subcategory: "chaise-cuir",
    price: 96000,
    image: "/products/setup.jpg",
    rating: 4.8,
    reviews: 143,
    short: "Le soutien lombaire intégré change tout après la troisième heure d'affilée.",
    specs: [
      { k: "Revêtement", v: "Cuir hybride NEO" },
      { k: "Charge max", v: "130 kg" },
      { k: "Inclinaison", v: "165°" },
      { k: "Accoudoirs", v: "4D magnétiques" },
    ],
    stock: true,
  },
  {
    slug: "dxracer-craft-series",
    name: "DXRacer Craft Series",
    brand: "DXRacer",
    category: "chaises",
    subcategory: "chaise-tissu",
    price: 58000,
    preorder: true,
    image: "/products/setup.jpg",
    rating: 4.4,
    reviews: 21,
    short: "Assise large et dossier haut, annoncée pour le prochain arrivage.",
    images: ["/products/setup.jpg", "/products/headset.jpg"],
    specs: [
      { group: "Assise", k: "Revêtement", v: "Tissu respirant" },
      { group: "Assise", k: "Charge max", v: "120 kg" },
      { group: "Réglages", k: "Inclinaison", v: "135°" },
      { group: "Réglages", k: "Accoudoirs", v: "3D" },
    ],
    description: [
      {
        t: "p",
        text: "Annoncée pour le prochain arrivage. La commande est enregistrée dès maintenant et **rien n'est débité avant l'expédition** — le paiement se fait à la livraison, comme pour le reste du catalogue.",
      },
    ],
    saleMode: "preorder",
    preorderEta: "Livraison estimée fin mars 2026",
    stock: false,
  },

  /* ── Components added for the PC Builder (MODULE 4) ──────────────────────
     The builder selects from this catalogue and nowhere else (PCB-05), so it
     can only propose what the shelf actually carries. Before these, the shelf
     held two processors, both flagships at 92 000 DA and up, and the cheapest
     machine the generator could reach was around 480 000 DA — under a budget
     the brief's own quick-reply buttons offer. These seventeen open the
     bottom and middle of the range, and they carry what the compatibility
     engine reads: socket, memory generation, card length, cooler height,
     clearance. Brands are ones the store already stocks, so the filter keeps
     its logos and nothing falls back to a monogram. */

  {
    slug: "ryzen-5-7600",
    name: "AMD Ryzen 5 7600",
    brand: "AMD",
    category: "processeurs",
    subcategory: "cpu-ryzen",
    price: 38000,
    image: "/products/cpu.jpg",
    rating: 4.6,
    reviews: 88,
    short: "Six cœurs Zen 4 qui suivent n'importe quelle carte de milieu de gamme sans jamais la brider.",
    specs: [
      { k: "Cœurs / Threads", v: "6 / 12" },
      { k: "Fréquence boost", v: "5,1 GHz" },
      { k: "Socket", v: "AM5" },
      { k: "TDP", v: "65 W" },
      { k: "Cache", v: "38 Mo" },
      { k: "Refroidisseur fourni", v: "Wraith Stealth" },
    ],
    stock: true,
  },
  {
    slug: "ryzen-7-7800x3d",
    name: "AMD Ryzen 7 7800X3D",
    brand: "AMD",
    category: "processeurs",
    subcategory: "cpu-ryzen",
    price: 72000,
    image: "/products/cpu.jpg",
    rating: 4.9,
    reviews: 174,
    badge: { label: "Gaming", tone: "electric" },
    short: "Le cache 3D empilé lui donne l'avantage en jeu sur des processeurs bien plus chers.",
    specs: [
      { k: "Cœurs / Threads", v: "8 / 16" },
      { k: "Fréquence boost", v: "5,0 GHz" },
      { k: "Socket", v: "AM5" },
      { k: "TDP", v: "120 W" },
      { k: "Cache", v: "104 Mo (3D V-Cache)" },
    ],
    stock: true,
  },
  {
    slug: "core-i5-14400f",
    name: "Intel Core i5-14400F",
    brand: "Intel",
    category: "processeurs",
    subcategory: "cpu-core",
    price: 34000,
    image: "/products/cpu.jpg",
    rating: 4.5,
    reviews: 96,
    short: "L'entrée de gamme Intel la plus sensée : dix cœurs, sobre, et une plateforme DDR4 peu coûteuse.",
    specs: [
      { k: "Cœurs / Threads", v: "10 / 16" },
      { k: "Fréquence boost", v: "4,7 GHz" },
      { k: "Socket", v: "LGA 1700" },
      { k: "TDP", v: "65 W" },
      { k: "Cache", v: "20 Mo" },
      { k: "Graphique intégré", v: "Aucun" },
    ],
    stock: true,
  },
  {
    slug: "msi-b650-gaming-plus",
    name: "MSI B650 Gaming Plus WiFi",
    brand: "MSI",
    category: "cartes-meres",
    subcategory: "mb-am5",
    price: 29000,
    image: "/products/cpu.jpg",
    rating: 4.5,
    reviews: 63,
    short: "La carte AM5 qu'on monte le plus souvent : tout ce qu'il faut, rien de facturé en trop.",
    specs: [
      { k: "Socket", v: "AM5" },
      { k: "Chipset", v: "B650" },
      { k: "Format", v: "ATX" },
      { k: "Mémoire", v: "4× DDR5 6400 MT/s" },
      { k: "Stockage", v: "2× M.2 PCIe 4.0" },
      { k: "Réseau", v: "2,5 GbE · Wi-Fi 6E" },
    ],
    stock: true,
  },
  {
    slug: "msi-pro-b760m-a",
    name: "MSI PRO B760M-A DDR4",
    brand: "MSI",
    category: "cartes-meres",
    subcategory: "mb-lga1700",
    price: 18000,
    image: "/products/cpu.jpg",
    rating: 4.3,
    reviews: 47,
    short: "Micro-ATX en DDR4 : la façon la moins chère de faire tourner un Core i5 récent.",
    specs: [
      { k: "Socket", v: "LGA 1700" },
      { k: "Chipset", v: "B760" },
      { k: "Format", v: "Micro-ATX" },
      { k: "Mémoire", v: "4× DDR4 3200 MT/s" },
      { k: "Stockage", v: "2× M.2 PCIe 4.0" },
      { k: "Réseau", v: "2,5 GbE" },
    ],
    stock: true,
  },
  {
    slug: "rtx-5070-12go",
    name: "NVIDIA GeForce RTX 5070 12 Go",
    brand: "NVIDIA",
    category: "cartes-graphiques",
    subcategory: "gpu-geforce",
    price: 138000,
    image: "/products/gpu.jpg",
    rating: 4.7,
    reviews: 118,
    short: "Le QHD à haut rafraîchissement sans discuter, et le 4K reste ouvert avec DLSS.",
    specs: [
      { group: "Processeur graphique", k: "Architecture", v: "Blackwell" },
      { group: "Processeur graphique", k: "Unités de calcul", v: "6 144 CUDA" },
      { group: "Mémoire", k: "Capacité", v: "12 Go GDDR7" },
      { group: "Mémoire", k: "Bus", v: "192 bits" },
      { group: "Alimentation", k: "Consommation", v: "250 W" },
      { group: "Alimentation", k: "Alimentation conseillée", v: "650 W" },
      { group: "Alimentation", k: "Connecteurs", v: "1× 16 broches (12V-2×6)" },
      { group: "Refroidissement", k: "Format", v: "2,5 slots · 304 mm" },
    ],
    stock: true,
  },
  {
    slug: "rtx-5060-ti-16go",
    name: "NVIDIA GeForce RTX 5060 Ti 16 Go",
    brand: "NVIDIA",
    category: "cartes-graphiques",
    subcategory: "gpu-geforce",
    price: 96000,
    image: "/products/gpu.jpg",
    rating: 4.6,
    reviews: 84,
    short: "Seize gigaoctets sur une carte de cette taille : les textures ultra passent en 1440p.",
    specs: [
      { group: "Processeur graphique", k: "Architecture", v: "Blackwell" },
      { group: "Processeur graphique", k: "Unités de calcul", v: "4 608 CUDA" },
      { group: "Mémoire", k: "Capacité", v: "16 Go GDDR7" },
      { group: "Mémoire", k: "Bus", v: "128 bits" },
      { group: "Alimentation", k: "Consommation", v: "180 W" },
      { group: "Alimentation", k: "Alimentation conseillée", v: "550 W" },
      { group: "Alimentation", k: "Connecteurs", v: "1× 8 broches PCIe" },
      { group: "Refroidissement", k: "Format", v: "2 slots · 242 mm" },
    ],
    stock: true,
  },
  {
    slug: "radeon-rx-9060-xt",
    name: "AMD Radeon RX 9060 XT 8 Go",
    brand: "AMD",
    category: "cartes-graphiques",
    subcategory: "gpu-radeon",
    price: 72000,
    image: "/products/gpu.jpg",
    rating: 4.4,
    reviews: 71,
    short: "La carte du 1080p compétitif : courte, sobre, et elle tient les 240 Hz sur les titres esport.",
    specs: [
      { group: "Processeur graphique", k: "Architecture", v: "RDNA 4" },
      { group: "Processeur graphique", k: "Unités de calcul", v: "32 CU" },
      { group: "Mémoire", k: "Capacité", v: "8 Go GDDR6" },
      { group: "Mémoire", k: "Bus", v: "128 bits" },
      { group: "Alimentation", k: "Consommation", v: "160 W" },
      { group: "Alimentation", k: "Alimentation conseillée", v: "550 W" },
      { group: "Alimentation", k: "Connecteurs", v: "1× 8 broches PCIe" },
      { group: "Refroidissement", k: "Format", v: "2 slots · 232 mm" },
    ],
    stock: true,
  },
  {
    slug: "fury-beast-16go-ddr5-5600",
    name: "Kingston Fury Beast 16 Go DDR5-5600",
    brand: "Kingston",
    category: "memoire",
    subcategory: "ram-ddr5",
    price: 14000,
    image: "/products/cpu.jpg",
    rating: 4.5,
    reviews: 59,
    short: "Deux barrettes de huit, le minimum sérieux pour jouer en DDR5.",
    specs: [
      { k: "Capacité", v: "16 Go (2× 8 Go)" },
      { k: "Type", v: "DDR5" },
      { k: "Fréquence", v: "5600 MT/s" },
      { k: "Latence", v: "CL36" },
      { k: "Hauteur", v: "34,9 mm" },
    ],
    stock: true,
  },
  {
    slug: "fury-beast-16go-ddr4-3200",
    name: "Kingston Fury Beast 16 Go DDR4-3200",
    brand: "Kingston",
    category: "memoire",
    subcategory: "ram-ddr4",
    price: 8500,
    image: "/products/cpu.jpg",
    rating: 4.6,
    reviews: 142,
    short: "La DDR4 reste la façon la moins chère d'arriver à seize gigaoctets sur une plateforme Intel.",
    specs: [
      { k: "Capacité", v: "16 Go (2× 8 Go)" },
      { k: "Type", v: "DDR4" },
      { k: "Fréquence", v: "3200 MT/s" },
      { k: "Latence", v: "CL16" },
      { k: "Hauteur", v: "34,9 mm" },
    ],
    stock: true,
  },
  {
    slug: "kingston-nv3-1to",
    name: "Kingston NV3 1 To NVMe",
    brand: "Kingston",
    category: "stockage",
    subcategory: "ssd-nvme",
    price: 11000,
    image: "/products/cpu.jpg",
    rating: 4.4,
    reviews: 103,
    short: "Le disque système qui ne coûte presque rien et charge les jeux en quelques secondes.",
    specs: [
      { k: "Capacité", v: "1 To" },
      { k: "Interface", v: "PCIe 4.0 ×4" },
      { k: "Lecture", v: "6 000 Mo/s" },
      { k: "Écriture", v: "4 000 Mo/s" },
      { k: "Format", v: "M.2 2280" },
    ],
    stock: true,
  },
  {
    slug: "hyper-212-black",
    name: "Cooler Master Hyper 212 Black",
    brand: "Cooler Master",
    category: "refroidissement",
    subcategory: "refro-air",
    price: 6500,
    image: "/products/setup.jpg",
    rating: 4.5,
    reviews: 188,
    short: "Le ventirad qu'on pose sur un processeur 65 W depuis quinze ans, et pour de bonnes raisons.",
    specs: [
      { k: "Type", v: "Ventirad tour" },
      { k: "Hauteur", v: "159 mm" },
      { k: "Ventilateur", v: "1× 120 mm PWM" },
      { k: "Nuisance", v: "27 dBA" },
      { k: "Sockets", v: "AM5 · AM4 · LGA 1700 · LGA 1851" },
      { k: "Dissipation", v: "150 W" },
    ],
    stock: true,
  },
  {
    slug: "corsair-h100i-rgb",
    name: "Corsair iCUE H100i RGB Elite",
    brand: "Corsair",
    category: "refroidissement",
    subcategory: "refro-aio",
    price: 19000,
    image: "/products/setup.jpg",
    rating: 4.6,
    reviews: 97,
    short: "Watercooling 240 mm : de quoi tenir un processeur 120 W en silence dans un boîtier moyen.",
    specs: [
      { k: "Format", v: "240 mm" },
      { k: "Ventilateurs", v: "2× 120 mm" },
      { k: "Nuisance", v: "33 dBA" },
      { k: "Sockets", v: "AM5 · AM4 · LGA 1700 · LGA 1851" },
      { k: "Dissipation", v: "250 W" },
    ],
    stock: true,
  },
  {
    slug: "corsair-cx650",
    name: "Corsair CX650 650 W",
    brand: "Corsair",
    category: "alimentations",
    subcategory: "psu-bronze",
    price: 14000,
    image: "/products/setup.jpg",
    rating: 4.4,
    reviews: 126,
    short: "650 W certifiés, câblage fixe : l'alimentation honnête d'une configuration d'entrée de gamme.",
    specs: [
      { k: "Puissance", v: "650 W" },
      { k: "Certification", v: "80+ Bronze" },
      { k: "Câblage", v: "Non modulaire" },
      { k: "Connecteurs PCIe", v: "2× 6+2 broches" },
      { k: "Garantie", v: "5 ans" },
    ],
    stock: true,
  },
  {
    slug: "corsair-hx1000",
    name: "Corsair HX1000 1000 W",
    brand: "Corsair",
    category: "alimentations",
    subcategory: "psu-platinum",
    price: 44000,
    image: "/products/setup.jpg",
    rating: 4.8,
    reviews: 64,
    short: "Mille watts en Platinum, avec le câble 12V-2×6 qu'attendent les cartes récentes.",
    specs: [
      { k: "Puissance", v: "1000 W" },
      { k: "Certification", v: "80+ Platinum" },
      { k: "Câblage", v: "Full modulaire" },
      { k: "Connecteurs PCIe", v: "1× 12V-2×6 · 4× 6+2 broches" },
      { k: "Garantie", v: "12 ans" },
    ],
    stock: true,
  },
  {
    slug: "cooler-master-q300l",
    name: "Cooler Master MasterBox Q300L",
    brand: "Cooler Master",
    category: "boitiers",
    subcategory: "case-matx",
    price: 9500,
    image: "/products/setup.jpg",
    rating: 4.2,
    reviews: 151,
    short: "Micro-ATX compact et ventilé, pour une configuration qui tient sur un coin de bureau.",
    specs: [
      { k: "Format", v: "Micro-ATX" },
      { k: "Cartes mères", v: "Micro-ATX · Mini-ITX" },
      { k: "Carte graphique", v: "360 mm max" },
      { k: "Ventirad", v: "159 mm max" },
      { k: "Radiateurs", v: "1× 240 mm" },
    ],
    stock: true,
  },
  {
    slug: "corsair-4000d-airflow",
    name: "Corsair 4000D Airflow",
    brand: "Corsair",
    category: "boitiers",
    subcategory: "case-atx",
    price: 15000,
    image: "/products/setup.jpg",
    rating: 4.7,
    reviews: 209,
    short: "La façade ajourée fait tout le travail : le boîtier ATX le plus sûr à recommander.",
    specs: [
      { k: "Format", v: "Moyen tour ATX" },
      { k: "Cartes mères", v: "ATX · Micro-ATX · Mini-ITX" },
      { k: "Carte graphique", v: "360 mm max" },
      { k: "Ventirad", v: "170 mm max" },
      { k: "Radiateurs", v: "1× 360 mm · 1× 280 mm" },
    ],
    stock: true,
  },
  /* ── the setup around the tower ──────────────────────────────────────────
     Everything below is what the builder offers once a machine is complete
     (`lib/pcbuilder/extras.ts`). They are ordinary catalogue products, sold on
     their own shelves like any other — the configurator does not get a private
     stock. Several of them also fill shelves the store already advertised and
     had nothing on: `refro-ventilateurs`, `peri-tapis`, `stream-webcams` and
     `ecran-fhd` were empty categories a customer could click into. */
  {
    slug: "msi-g244f-e2",
    name: "MSI G244F E2 24″ 180 Hz",
    brand: "MSI",
    category: "ecrans",
    subcategory: "ecran-fhd",
    price: 32000,
    image: "/products/monitor.jpg",
    rating: 4.5,
    reviews: 74,
    short: "L'écran compétitif d'entrée : 24″, 180 Hz et 1 ms sur dalle Rapid IPS.",
    specs: [
      { k: "Dalle", v: "Rapid IPS 24″" },
      { k: "Définition", v: "1920 × 1080" },
      { k: "Fréquence", v: "180 Hz" },
      { k: "Temps de réponse", v: "1 ms GtG" },
      { k: "Connectique", v: "2× HDMI 2.0 · DisplayPort 1.2a" },
    ],
    stock: true,
  },
  {
    slug: "corsair-k70-rgb-pro",
    name: "Corsair K70 RGB Pro",
    brand: "Corsair",
    category: "peripheriques",
    subcategory: "peri-claviers",
    price: 24000,
    image: "/products/keyboard.jpg",
    rating: 4.6,
    reviews: 92,
    short: "Clavier plein format en aluminium, switchs Cherry MX et polling 8000 Hz.",
    specs: [
      { k: "Format", v: "Plein format" },
      { k: "Switchs", v: "Cherry MX Red" },
      { k: "Polling", v: "8000 Hz" },
      { k: "Châssis", v: "Aluminium brossé" },
      { k: "Repose-poignets", v: "Magnétique, fourni" },
    ],
    stock: true,
    variants: [
      {
        name: "Switches",
        options: [
          { id: "mx-red", label: "MX Red" },
          { id: "mx-brown", label: "MX Brown" },
          { id: "mx-speed", label: "MX Speed", sold: true },
        ],
      },
    ],
  },
  {
    slug: "corsair-m75-air-wireless",
    name: "Corsair M75 Air Wireless",
    brand: "Corsair",
    category: "peripheriques",
    subcategory: "peri-souris",
    price: 13500,
    image: "/products/mouse.jpg",
    rating: 4.5,
    reviews: 61,
    short: "60 g, symétrique et sans-fil : la souris légère pour longues sessions.",
    specs: [
      { k: "Capteur", v: "Marksman 26K" },
      { k: "Poids", v: "60 g" },
      { k: "Sans-fil", v: "Slipstream 2,4 GHz + Bluetooth" },
      { k: "Autonomie", v: "34 h" },
    ],
    stock: true,
  },
  {
    slug: "hyperx-cloud-iii",
    name: "HyperX Cloud III",
    brand: "HyperX",
    category: "peripheriques",
    subcategory: "peri-casques",
    price: 11000,
    image: "/products/headset.jpg",
    rating: 4.6,
    reviews: 148,
    short: "Le confort HyperX au prix d'entrée : mousse à mémoire et micro certifié.",
    specs: [
      { k: "Transducteurs", v: "53 mm angulés" },
      { k: "Connexion", v: "Filaire USB-C / 3,5 mm" },
      { k: "Micro", v: "10 mm détachable, certifié TeamSpeak" },
      { k: "Poids", v: "308 g" },
    ],
    stock: true,
  },
  {
    slug: "razer-gigantus-v2-xxl",
    name: "Razer Gigantus V2 XXL",
    brand: "Razer",
    category: "peripheriques",
    subcategory: "peri-tapis",
    price: 4900,
    image: "/products/mouse.jpg",
    rating: 4.7,
    reviews: 89,
    short: "940 × 410 mm : le bureau entier sous la souris et le clavier.",
    specs: [
      { k: "Dimensions", v: "940 × 410 × 4 mm" },
      { k: "Surface", v: "Tissu microtexturé" },
      { k: "Base", v: "Caoutchouc anti-dérapant" },
      { k: "Bords", v: "Surpiqûres renforcées" },
    ],
    stock: true,
  },
  {
    slug: "corsair-mm300-pro-extended",
    name: "Corsair MM300 PRO Extended",
    brand: "Corsair",
    category: "peripheriques",
    subcategory: "peri-tapis",
    price: 3500,
    image: "/products/setup.jpg",
    rating: 4.5,
    reviews: 47,
    short: "930 × 300 mm, tissage serré et bords cousus qui ne s'effilochent pas.",
    specs: [
      { k: "Dimensions", v: "930 × 300 × 3 mm" },
      { k: "Surface", v: "Tissu à tissage serré" },
      { k: "Base", v: "Caoutchouc" },
      { k: "Bords", v: "Cousus" },
    ],
    stock: true,
  },
  {
    slug: "corsair-af120-rgb-elite-x3",
    name: "Corsair iCUE AF120 RGB Elite — pack de 3",
    brand: "Corsair",
    category: "refroidissement",
    subcategory: "refro-ventilateurs",
    price: 9500,
    image: "/products/setup.jpg",
    rating: 4.6,
    reviews: 53,
    short: "Trois ventilateurs 120 mm et leur contrôleur : le flux d'air du boîtier, réglé.",
    specs: [
      { k: "Format", v: "3× 120 mm" },
      { k: "Débit", v: "62 CFM par ventilateur" },
      { k: "Nuisance", v: "26 dB(A) max" },
      { k: "Éclairage", v: "8 LED RGB adressables par ventilateur" },
      { k: "Fourni", v: "Contrôleur Lighting Node CORE" },
    ],
    stock: true,
  },
  {
    slug: "coolermaster-sickleflow-120-argb-x3",
    name: "Cooler Master SickleFlow 120 ARGB — pack de 3",
    brand: "Cooler Master",
    category: "refroidissement",
    subcategory: "refro-ventilateurs",
    price: 5500,
    image: "/products/setup.jpg",
    rating: 4.4,
    reviews: 38,
    short: "Le pack qui remplit un boîtier sans discussion : trois 120 mm ARGB.",
    specs: [
      { k: "Format", v: "3× 120 mm" },
      { k: "Débit", v: "62 CFM par ventilateur" },
      { k: "Nuisance", v: "27 dB(A) max" },
      { k: "Éclairage", v: "ARGB 5 V adressable" },
    ],
    stock: true,
  },
  {
    slug: "elgato-facecam-mk2",
    name: "Elgato Facecam MK.2",
    brand: "Elgato",
    category: "streaming",
    subcategory: "stream-webcams",
    price: 27000,
    image: "/products/setup.jpg",
    rating: 4.6,
    reviews: 41,
    short: "Capteur Sony STARVIS 2 et optique fixe : du 1080p60 sans compression.",
    specs: [
      { k: "Capteur", v: "Sony STARVIS 2" },
      { k: "Définition", v: "1080p60 · 1440p30" },
      { k: "Optique", v: "Elgato Prime f/2.0 · 82°" },
      { k: "Connexion", v: "USB-C UVC" },
    ],
    stock: true,
  },
];

export const BRANDS = Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort();

/* The three characters the price is built from, by code point rather than as
   literals. Two of them are invisible: written straight into the source they
   are a pair of zero-width things that any editor, merge or careless
   selection can drop without leaving a mark, and the bug that follows is
   text silently reordering itself on one locale. */
const LRI = String.fromCharCode(0x2066); // LEFT-TO-RIGHT ISOLATE
const PDI = String.fromCharCode(0x2069); // POP DIRECTIONAL ISOLATE
const NBSP = String.fromCharCode(0x00a0);

/**
 * A price, written so it survives an Arabic page.
 *
 * ─── on the isolate ───
 * The grouped number has a space in it, and a space is bidi-neutral. Dropped
 * into an RTL paragraph, the Unicode algorithm resolves that neutral to the
 * paragraph direction and reorders the two digit runs around it — so 72 000
 * was rendering, on screen, as "000 72". Every price on the Arabic site was
 * wrong, not merely mirrored.
 *
 * The number is therefore wrapped in an explicit left-to-right isolate. It has
 * to live in the string rather than in a `dir="ltr"` attribute at the call
 * site, because prices are also interpolated into sentences — "المجموع {total}"
 * goes through `fill()`, where there is no element to hang an attribute on and
 * nowhere to put one.
 *
 * The isolate stops at the number. The currency stays outside it so it keeps
 * flowing with the paragraph, which is what puts دج on the correct side of the
 * figure in Arabic and DA on the correct side in French, from one string.
 *
 * ─── on the digits ───
 * Western digits and `fr-FR` grouping in all three locales, deliberately.
 * Prices are written this way on Algerian shelves, invoices and shopfronts;
 * Arabic-Indic numerals here would be a typographic flourish nobody asked for
 * on the one part of the page that has to be read exactly.
 */
export function formatDA(n: number, locale: Locale = DEFAULT_LOCALE): string {
  return LRI + n.toLocaleString("fr-FR") + PDI + NBSP + (locale === "ar" ? "دج" : "DA");
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

/** The colour of a hand-written badge; each maps to a `.badge-*` class. */
export type BadgeTone = "sale" | "new" | "gold" | "brand" | "electric" | "ink";

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

/**
 * What the promotion is actually worth, in dinars.
 *
 * A percentage is the shop's arithmetic, not the customer's: nobody weighs
 * "-20%" against their budget, they weigh the two thousand dinars it comes to.
 * The percentage still has its place as a badge on a shot, where there is room
 * for two characters and no room for a price — but wherever the page has space
 * to say what is saved, it says the money.
 */
export function savingsOf(p: Product): number | null {
  if (p.oldPrice === undefined || p.oldPrice <= p.price) return null;
  return p.oldPrice - p.price;
}

/**
 * The finish a page opens on: the first option of each group that is actually
 * available. Opening on a sold-out swatch would make the buy button lie.
 */
export function openingVariant(p: Product): Record<string, string> {
  return Object.fromEntries(
    (p.variants ?? []).map((g) => [g.name, (g.options.find((o) => !o.sold) ?? g.options[0]).id]),
  );
}

/** How a chosen set is written on an order line, and nowhere else — one join,
    so the cart, the card and the product page cannot disagree about it. */
export function variantLabel(p: Product, chosen: Record<string, string>): string | undefined {
  const parts = (p.variants ?? [])
    .map((g) => g.options.find((o) => o.id === chosen[g.name])?.label)
    .filter((label): label is string => Boolean(label));
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * The finish recorded when nobody was asked.
 *
 * The catalogue's quick-add buttons use this: a card has no room for swatches,
 * and an order line that recorded no colour at all would leave the question to
 * whoever packs the box.
 */
export function defaultVariantOf(p: Product): string | undefined {
  return variantLabel(p, openingVariant(p));
}

/** PRD-06 — the mode as set, or inferred from the older `preorder` flag. */
export function saleModeOf(p: Product): SaleMode {
  if (p.saleMode) return p.saleMode;
  return p.preorder ? "preorder" : "buy";
}

/**
 * Orderable on its own — PRD-08.
 *
 * A pre-order takes money and a rupture does not, and a builder-only part
 * takes money only as part of a configuration. Reading it here rather than at
 * each button means the catalogue card and the product page cannot disagree
 * about whether a thing can be bought.
 */
export function isOrderable(p: Product): boolean {
  if (saleModeOf(p) === "builder") return false;
  return p.stock || p.preorder === true;
}

/** PRD-04, and the "low" case is PRD-05 */
export type StockState = "in" | "low" | "preorder" | "out";

export function stockStateOf(p: Product): StockState {
  if (saleModeOf(p) === "preorder") return "preorder";
  if (!p.stock) return "out";
  const { stockCount: left, lowStockThreshold: floor } = p;
  if (left !== undefined && floor !== undefined && left <= floor) return "low";
  return "in";
}

/** PRD-01 — never more than ten, however many an admin pastes in. */
const GALLERY_MAX = 10;

export function galleryOf(p: Product): string[] {
  const shots = p.images?.length ? p.images : [p.image];
  return shots.slice(0, GALLERY_MAX);
}

/**
 * PRD-11 — the specs in families, each family keeping the order it was
 * written in. Ungrouped specs collect under "" and the table prints that
 * block without a heading, so a product nobody has grouped yet still reads
 * exactly as it did before.
 */
export function specGroupsOf(p: Product): { name: string; specs: Spec[] }[] {
  const order: string[] = [];
  const byName = new Map<string, Spec[]>();
  for (const spec of p.specs) {
    const name = spec.group ?? "";
    let bucket = byName.get(name);
    if (!bucket) {
      bucket = [];
      byName.set(name, bucket);
      order.push(name);
    }
    bucket.push(spec);
  }
  return order.map((name) => ({ name, specs: byName.get(name)! }));
}

/**
 * PRD-12 — what to show under the details, in the order the spec asks for:
 * whatever was pinned by hand first, then the same category within a price
 * band of this one, then the rest of the category so the row is never half
 * empty. Each step only adds what the last one missed.
 */
const RELATED_MAX = 4;
/** "same price range" — within 40% either side reads as a real alternative */
const PRICE_BAND = 0.4;

export function relatedFor(p: Product): Product[] {
  const out: Product[] = [];
  const seen = new Set([p.slug]);
  const push = (x: Product | undefined) => {
    if (x && !seen.has(x.slug)) {
      seen.add(x.slug);
      out.push(x);
    }
  };

  for (const slug of p.related ?? []) push(getProduct(slug));

  PRODUCTS.filter(
    (x) => x.category === p.category && Math.abs(x.price - p.price) <= p.price * PRICE_BAND,
  )
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .forEach(push);

  getByCategory(p.category).forEach(push);

  return out.slice(0, RELATED_MAX);
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

/** The shelves inside one category, or none for "all" and unknown keys. */
export function subsOf(categoryKey: string): Sub[] {
  return CATEGORIES.find((c) => c.key === categoryKey)?.subs ?? [];
}

/** Every sub across the store, flattened — the reverse lookup a sub key needs
    when it arrives from a URL without its category alongside it. */
const SUB_INDEX: Map<string, { sub: Sub; category: Category }> = new Map(
  CATEGORIES.flatMap((c) => c.subs.map((sub) => [sub.key, { sub, category: c }] as const)),
);

export function subName(key: string): string {
  return SUB_INDEX.get(key)?.sub.name ?? key;
}

/** Which category a sub belongs to — how ?sub= alone can still select its shelf. */
export function categoryOfSub(key: string): string | undefined {
  return SUB_INDEX.get(key)?.category.key;
}
