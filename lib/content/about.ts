/**
 * The about page, in three languages.
 *
 * Every promise here is one the site already makes somewhere — authentic
 * products with an invoice, builds assembled and tested with two years'
 * warranty, delivery to all 58 wilayas, cash on delivery, the PC Builder,
 * order tracking. The story paragraphs are ⚠ placeholder copy in the shop's
 * voice: no dates, names or figures were invented, and they are the part to
 * rewrite with the real story.
 */

import type { Locale } from "@/lib/locales";

type Item = { title: string; text: string };

export type AboutContent = {
  crumb: string;
  title: string;
  subtitle: string;
  imageAlt: string;
  storyTitle: string;
  story: string[];
  promisesTitle: string;
  promises: Item[];
  offerTitle: string;
  offer: (Item & { cta: string; href: string })[];
  cta: { title: string; text: string; button: string };
};

const fr: AboutContent = {
  crumb: "À propos",
  title: "Du matériel choisi par des joueurs, pour des joueurs.",
  subtitle:
    "APL TECH est une boutique algérienne de matériel informatique et gaming : des pièces authentiques, des PC montés avec soin, livrés partout dans le pays.",
  imageAlt: "Un PC gamer APL TECH, ventilateurs éclairés en violet",
  storyTitle: "Pourquoi APL TECH",
  story: [
    "Acheter une carte graphique ou monter un PC en Algérie, c’est souvent comparer des prix sans savoir d’où vient le produit, attendre un colis sans nouvelles, et se débrouiller seul quand quelque chose ne marche pas.",
    "On a créé APL TECH pour faire l’inverse : des produits neufs et authentiques vendus avec facture, des prix affichés clairement, et quelqu’un au bout du fil qui connaît le matériel — en darija, en français ou en anglais.",
    "Et parce qu’un bon PC ne se résume pas à une liste de pièces, on les monte et on les teste nous-mêmes avant de les expédier, avec un PC Builder qui vérifie la compatibilité à chaque étape.",
  ],
  promisesTitle: "Ce qu’on te garantit",
  promises: [
    { title: "Authentique, avec facture", text: "Chaque produit est neuf, d’origine et couvert par sa garantie." },
    { title: "Monté et testé", text: "Nos PC sont assemblés et testés avant l’expédition, et garantis 2 ans." },
    { title: "Livré dans les 58 wilayas", text: "À domicile ou en point de retrait, avec un suivi étape par étape." },
    { title: "Payé à la livraison", text: "Tu règles en espèces, quand tu reçois ta commande." },
  ],
  offerTitle: "Ce qu’on fait",
  offer: [
    {
      title: "La boutique",
      text: "Composants, PC gamer, périphériques, portables et écrans des grandes marques.",
      cta: "Voir la boutique",
      href: "/catalogue",
    },
    {
      title: "Le PC Builder",
      text: "Compose ta config pièce par pièce, ou laisse l’assistant la proposer selon ton budget.",
      cta: "Composer mon PC",
      href: "/configurateur",
    },
    {
      title: "Le suivi de commande",
      text: "Ton numéro de commande et ton téléphone suffisent pour savoir où en est ton colis.",
      cta: "Suivre une commande",
      href: "/suivi",
    },
  ],
  cta: {
    title: "Une question avant de te lancer ?",
    text: "On te conseille gratuitement, par téléphone ou sur WhatsApp.",
    button: "Nous contacter",
  },
};

const ar: AboutContent = {
  crumb: "من نحن",
  title: "عتاد يختاره اللاعبون، للاعبين.",
  subtitle: "APL TECH متجر جزائري لعتاد الكمبيوتر والألعاب: قطع أصلية، وحواسيب تُركَّب بعناية، وتوصيل إلى كل أنحاء البلاد.",
  imageAlt: "حاسوب ألعاب من APL TECH بمراوح مضاءة باللون البنفسجي",
  storyTitle: "لماذا APL TECH",
  story: [
    "شراء بطاقة رسومية أو تركيب حاسوب في الجزائر يعني غالباً مقارنة أسعار دون معرفة مصدر المنتج، وانتظار طرد دون أخبار، والتصرّف وحدك عندما لا يعمل شيء ما.",
    "أنشأنا APL TECH لنفعل العكس: منتجات جديدة وأصلية تُباع بفاتورة، وأسعار واضحة، وشخص على الطرف الآخر من الهاتف يعرف العتاد — بالدارجة أو الفرنسية أو الإنجليزية.",
    "ولأن الحاسوب الجيد ليس مجرد قائمة قطع، نركّب حواسيبنا ونختبرها بأنفسنا قبل شحنها، مع PC Builder يتحقّق من التوافق في كل خطوة.",
  ],
  promisesTitle: "ما نضمنه لك",
  promises: [
    { title: "أصلي، بفاتورة", text: "كل منتج جديد وأصلي ومشمول بضمانه." },
    { title: "مُركَّب ومُختبَر", text: "حواسيبنا تُجمَّع وتُختبر قبل الشحن، ومضمونة لمدة سنتين." },
    { title: "توصيل إلى 58 ولاية", text: "إلى المنزل أو نقطة استلام، مع تتبّع خطوة بخطوة." },
    { title: "الدفع عند الاستلام", text: "تدفع نقداً عندما تستلم طلبك." },
  ],
  offerTitle: "ما نقدّمه",
  offer: [
    { title: "المتجر", text: "قطع، حواسيب ألعاب، ملحقات، حواسيب محمولة وشاشات من كبرى العلامات.", cta: "تصفّح المتجر", href: "/catalogue" },
    { title: "PC Builder", text: "كوّن تجميعتك قطعة بقطعة، أو دع المساعد يقترحها حسب ميزانيتك.", cta: "كوّن حاسوبي", href: "/configurateur" },
    { title: "تتبّع الطلب", text: "رقم طلبك وهاتفك يكفيان لمعرفة أين وصل طردك.", cta: "تتبّع طلباً", href: "/suivi" },
  ],
  cta: {
    title: "سؤال قبل أن تبدأ؟",
    text: "ننصحك مجاناً، بالهاتف أو على واتساب.",
    button: "اتصل بنا",
  },
};

const en: AboutContent = {
  crumb: "About",
  title: "Gear chosen by gamers, for gamers.",
  subtitle:
    "APL TECH is an Algerian computer and gaming hardware shop: genuine parts, carefully built PCs, delivered anywhere in the country.",
  imageAlt: "An APL TECH gaming PC with purple-lit fans",
  storyTitle: "Why APL TECH",
  story: [
    "Buying a graphics card or building a PC in Algeria often means comparing prices without knowing where the product came from, waiting on a parcel with no news, and sorting things out alone when something doesn't work.",
    "We started APL TECH to do the opposite: new, genuine products sold with an invoice, clearly marked prices, and someone on the other end of the phone who knows the hardware — in Darja, French or English.",
    "And because a good PC is more than a list of parts, we build and test ours ourselves before they ship, with a PC Builder that checks compatibility at every step.",
  ],
  promisesTitle: "What we promise",
  promises: [
    { title: "Genuine, with an invoice", text: "Every product is new, original and covered by its warranty." },
    { title: "Built and tested", text: "Our PCs are assembled and tested before they ship, with a 2-year warranty." },
    { title: "Delivered to 58 wilayas", text: "To your door or a pickup point, tracked step by step." },
    { title: "Paid on delivery", text: "You pay in cash when your order arrives." },
  ],
  offerTitle: "What we do",
  offer: [
    { title: "The store", text: "Components, gaming PCs, peripherals, laptops and monitors from the big brands.", cta: "Browse the store", href: "/catalogue" },
    { title: "The PC Builder", text: "Put your build together part by part, or let the assistant suggest one for your budget.", cta: "Build my PC", href: "/configurateur" },
    { title: "Order tracking", text: "Your order number and phone are all you need to see where your parcel is.", cta: "Track an order", href: "/suivi" },
  ],
  cta: {
    title: "A question before you start?",
    text: "We'll advise you for free, by phone or on WhatsApp.",
    button: "Contact us",
  },
};

export const ABOUT: Record<Locale, AboutContent> = { fr, ar, en };
