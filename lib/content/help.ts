/**
 * The help page — delivery, returns, warranty, questions — in three languages.
 *
 * Long-form text lives here rather than in the phrasebook: a page of policy
 * reads and gets edited as a page, not as a hundred separate keys.
 *
 * What is taken from the rest of the site: delivery to all 58 wilayas, home or
 * pickup point, free from the threshold in `lib/checkout/shipping.ts`, cash on
 * delivery, the confirmation call, tracking by number and phone, builds
 * assembled and tested with two years' warranty, authentic products with an
 * invoice.
 *
 * ⚠ TO CONFIRM WITH THE SHOP. The return window (7 days), what is excluded
 * from returns, how refunds are paid, what the warranty does not cover and
 * cancelling before shipping are written as the usual terms for a shop like
 * this one, not as terms the shop has agreed. Change them here.
 */

import type { Locale } from "@/lib/locales";
import type { Zone } from "@/lib/checkout/shipping";

type Step = { title: string; text: string };

export type HelpContent = {
  crumb: string;
  title: string;
  subtitle: string;
  nav: { delivery: string; returns: string; warranty: string; faq: string };
  delivery: {
    lead: string;
    facts: Step[];
    zonesTitle: string;
    zonesNote: string;
    columns: { zone: string; home: string; pickup: string; days: string };
    zoneNames: Record<Zone, string>;
    wilayas: string;
    days: string;
    free: string;
    stepsTitle: string;
    steps: Step[];
    track: string;
  };
  returns: {
    lead: string;
    acceptedTitle: string;
    accepted: string[];
    excludedTitle: string;
    excluded: string[];
    stepsTitle: string;
    steps: Step[];
    damaged: string;
  };
  warranty: {
    lead: string;
    plans: { title: string; duration: string; text: string }[];
    coveredTitle: string;
    covered: string[];
    notCoveredTitle: string;
    notCovered: string[];
    howTitle: string;
    how: string;
  };
  faq: { lead: string; items: { q: string; a: string }[] };
  more: { title: string; text: string; cta: string };
};

const fr: HelpContent = {
  crumb: "Aide",
  title: "Livraison, retours et garantie",
  subtitle: "Tout ce qui se passe après ta commande, expliqué simplement.",
  nav: { delivery: "Livraison", returns: "Retours", warranty: "Garantie", faq: "FAQ" },
  delivery: {
    lead: "On livre dans les 58 wilayas, à domicile ou en point de retrait, et tu paies à la réception.",
    facts: [
      { title: "58 wilayas", text: "De Tlemcen à Tamanrasset, partout en Algérie." },
      { title: "Domicile ou point de retrait", text: "Tu choisis au moment de commander." },
      { title: "Offerte dès {amount}", text: "Calculé sur ta commande, après réduction." },
      { title: "Paiement à la livraison", text: "En espèces, quand tu reçois ton colis." },
    ],
    zonesTitle: "Frais et délais par zone",
    zonesNote: "Délais indicatifs, comptés à partir de l’expédition. Le prix exact pour ta wilaya s’affiche avant de valider ta commande.",
    columns: { zone: "Zone", home: "À domicile", pickup: "Point de retrait", days: "Délai" },
    zoneNames: {
      centre: "Alger et alentours",
      north: "Nord",
      highlands: "Hauts plateaux",
      south: "Sud",
      deepSouth: "Grand Sud",
    },
    wilayas: "{n} wilayas",
    days: "{a} à {b} jours",
    free: "Offerte",
    stepsTitle: "Le trajet de ta commande",
    steps: [
      { title: "Commande", text: "En ligne, avec ou sans compte." },
      { title: "Confirmation", text: "On t’appelle pour la valider." },
      { title: "Préparation", text: "Emballage soigné ; les PC sont montés et testés." },
      { title: "Expédition", text: "Le transporteur prend le relais." },
      { title: "Livraison", text: "Le livreur t’appelle avant de passer." },
    ],
    track: "Suivre ma commande",
  },
  returns: {
    lead: "Un produit ne te convient pas, ou il est arrivé avec un défaut ? Tu as 7 jours après la livraison pour nous le signaler.",
    acceptedTitle: "Accepté en retour",
    accepted: [
      "Signalé dans les 7 jours qui suivent la livraison",
      "Complet, dans son emballage d’origine, avec ses accessoires et la facture",
      "Non utilisé, sauf s’il présente un défaut",
    ],
    excludedTitle: "Non repris",
    excluded: [
      "Logiciels et licences déjà activés",
      "Consommables entamés : pâte thermique, câbles coupés…",
      "Produits abîmés par une chute, un liquide ou une mauvaise utilisation",
    ],
    stepsTitle: "Comment faire",
    steps: [
      { title: "Contacte-nous", text: "Par téléphone, WhatsApp ou le formulaire, avec ton numéro de commande." },
      { title: "On organise le retour", text: "On t’indique où déposer le produit, ou on le fait récupérer." },
      { title: "Échange ou remboursement", text: "Après vérification, on échange le produit ou on te rembourse sous 7 jours." },
    ],
    damaged: "Colis abîmé à l’arrivée ? Signale-le au livreur et appelle-nous dans les 48 heures, photos à l’appui.",
  },
  warranty: {
    lead: "Tous nos produits sont neufs, authentiques et vendus avec facture. On s’occupe des démarches de garantie à ta place.",
    plans: [
      {
        title: "Composants et périphériques",
        duration: "Garantie constructeur",
        text: "La durée dépend de la marque et du produit — souvent de 1 à 3 ans. Elle est précisée sur ta facture.",
      },
      {
        title: "PC montés par APL TECH",
        duration: "2 ans",
        text: "Sur toute la configuration, montage compris. Un seul interlocuteur, quelle que soit la pièce en cause.",
      },
    ],
    coveredTitle: "Couvert",
    covered: ["Les défauts de fabrication", "Les pannes en usage normal", "Chaque pièce d’un PC que nous avons monté"],
    notCoveredTitle: "Non couvert",
    notCovered: [
      "Casse, chute, liquide ou surtension",
      "Modification, réparation par un tiers ou overclocking hors tolérances",
      "L’usure normale : patins de souris, revêtements, touches",
    ],
    howTitle: "Faire jouer la garantie",
    how: "Garde ta facture, c’est ta preuve d’achat. Contacte-nous avec ton numéro de commande et une description du problème : on te dit comment nous confier le produit et on te tient au courant jusqu’à son retour.",
  },
  faq: {
    lead: "Les questions qu’on nous pose le plus souvent.",
    items: [
      {
        q: "Dois-je créer un compte pour commander ?",
        a: "Non. Tu peux commander sans compte et suivre ta commande avec son numéro et ton téléphone. Un compte sert à retrouver toutes tes commandes au même endroit.",
      },
      {
        q: "Comment se passe la confirmation ?",
        a: "Après ta commande, on t’appelle pour la confirmer avant de la préparer. Garde ton téléphone à portée de main.",
      },
      {
        q: "Puis-je payer par carte ?",
        a: "Pas pour l’instant : le paiement se fait en espèces, à la livraison.",
      },
      {
        q: "Les produits sont-ils authentiques ?",
        a: "Oui. Tous nos produits sont neufs, d’origine, et vendus avec facture et garantie.",
      },
      {
        q: "Vous montez les PC ?",
        a: "Oui. Compose ta config dans le PC Builder : on vérifie la compatibilité, on la monte et on la teste avant l’expédition.",
      },
      {
        q: "Où saisir un code promo ?",
        a: "Dans ton panier : la réduction s’applique tout de suite et reste valable jusqu’à la commande.",
      },
      {
        q: "Puis-je modifier ou annuler ma commande ?",
        a: "Oui, tant qu’elle n’est pas expédiée. Contacte-nous avec ton numéro de commande.",
      },
    ],
  },
  more: {
    title: "Une autre question ?",
    text: "On répond en darija, français ou anglais, du samedi au jeudi.",
    cta: "Nous contacter",
  },
};

const ar: HelpContent = {
  crumb: "المساعدة",
  title: "التوصيل والإرجاع والضمان",
  subtitle: "كل ما يحدث بعد طلبك، بشرح بسيط.",
  nav: { delivery: "التوصيل", returns: "الإرجاع", warranty: "الضمان", faq: "الأسئلة الشائعة" },
  delivery: {
    lead: "نوصل إلى الولايات الـ58، إلى المنزل أو إلى نقطة استلام، وتدفع عند الاستلام.",
    facts: [
      { title: "58 ولاية", text: "من تلمسان إلى تمنراست، في كل الجزائر." },
      { title: "المنزل أو نقطة استلام", text: "تختار عند الطلب." },
      { title: "مجاني ابتداءً من {amount}", text: "يُحسب على طلبك بعد التخفيض." },
      { title: "الدفع عند الاستلام", text: "نقداً، عندما تستلم طردك." },
    ],
    zonesTitle: "التكلفة والمدة حسب المنطقة",
    zonesNote: "المدة تقريبية، تُحسب من تاريخ الشحن. يظهر السعر الدقيق لولايتك قبل تأكيد الطلب.",
    columns: { zone: "المنطقة", home: "إلى المنزل", pickup: "نقطة الاستلام", days: "المدة" },
    zoneNames: {
      centre: "الجزائر العاصمة وضواحيها",
      north: "الشمال",
      highlands: "الهضاب العليا",
      south: "الجنوب",
      deepSouth: "الجنوب الكبير",
    },
    wilayas: "{n} ولاية",
    days: "من {a} إلى {b} أيام",
    free: "مجاني",
    stepsTitle: "مسار طلبك",
    steps: [
      { title: "الطلب", text: "عبر الإنترنت، بحساب أو دونه." },
      { title: "التأكيد", text: "نتّصل بك لتأكيده." },
      { title: "التحضير", text: "تغليف بعناية؛ الحواسيب تُركَّب وتُختبر." },
      { title: "الشحن", text: "يتولّى الناقل طردك." },
      { title: "التوصيل", text: "يتّصل بك عامل التوصيل قبل المرور." },
    ],
    track: "تتبّع طلبي",
  },
  returns: {
    lead: "المنتج لا يناسبك، أو وصل بعيب؟ لديك 7 أيام بعد الاستلام لإبلاغنا.",
    acceptedTitle: "يُقبل إرجاعه",
    accepted: [
      "إذا أُبلغ عنه خلال 7 أيام من الاستلام",
      "كاملاً في علبته الأصلية، مع ملحقاته والفاتورة",
      "غير مستعمل، إلا إذا كان به عيب",
    ],
    excludedTitle: "لا يُقبل إرجاعه",
    excluded: [
      "البرامج والتراخيص المفعّلة",
      "المواد المستهلكة المفتوحة: المعجون الحراري، الكوابل المقطوعة…",
      "المنتجات المتضرّرة بسبب سقوط أو سائل أو سوء استعمال",
    ],
    stepsTitle: "كيف تقوم بالإرجاع",
    steps: [
      { title: "اتصل بنا", text: "بالهاتف أو واتساب أو النموذج، مع رقم طلبك." },
      { title: "ننظّم الإرجاع", text: "نخبرك أين تودع المنتج، أو نرسل من يستلمه." },
      { title: "استبدال أو استرداد", text: "بعد الفحص، نستبدل المنتج أو نعيد لك المبلغ خلال 7 أيام." },
    ],
    damaged: "وصل الطرد متضرّراً؟ أبلغ عامل التوصيل واتصل بنا خلال 48 ساعة مع صور.",
  },
  warranty: {
    lead: "كل منتجاتنا جديدة وأصلية وتُباع بفاتورة. نتكفّل بإجراءات الضمان بدلاً منك.",
    plans: [
      {
        title: "القطع والملحقات",
        duration: "ضمان المُصنّع",
        text: "تتغيّر المدة حسب العلامة والمنتج — غالباً من سنة إلى 3 سنوات. وهي مذكورة في فاتورتك.",
      },
      {
        title: "الحواسيب المركّبة من APL TECH",
        duration: "سنتان",
        text: "على كامل التجميعة، بما في ذلك التركيب. محاور واحد مهما كانت القطعة المعنية.",
      },
    ],
    coveredTitle: "يشمل",
    covered: ["عيوب التصنيع", "الأعطال في الاستعمال العادي", "كل قطعة في حاسوب قمنا بتركيبه"],
    notCoveredTitle: "لا يشمل",
    notCovered: [
      "الكسر أو السقوط أو السوائل أو ارتفاع التيار",
      "التعديل أو الإصلاح من طرف آخر أو رفع الأداء خارج الحدود",
      "الاهتراء العادي: قواعد الفأرة، الأغلفة، الأزرار",
    ],
    howTitle: "كيف تستفيد من الضمان",
    how: "احتفظ بفاتورتك، فهي إثبات الشراء. اتصل بنا مع رقم طلبك ووصف للمشكلة: نخبرك كيف تسلّمنا المنتج ونبقيك على اطلاع حتى يعود إليك.",
  },
  faq: {
    lead: "الأسئلة التي تصلنا أكثر.",
    items: [
      {
        q: "هل يجب إنشاء حساب للطلب؟",
        a: "لا. يمكنك الطلب دون حساب وتتبّع طلبك برقمه وهاتفك. الحساب يفيد في إيجاد كل طلباتك في مكان واحد.",
      },
      { q: "كيف يتم التأكيد؟", a: "بعد طلبك، نتّصل بك لتأكيده قبل تحضيره. أبقِ هاتفك قريباً منك." },
      { q: "هل يمكنني الدفع بالبطاقة؟", a: "ليس حالياً: الدفع نقداً عند الاستلام." },
      { q: "هل المنتجات أصلية؟", a: "نعم. كل منتجاتنا جديدة وأصلية، وتُباع بفاتورة وضمان." },
      { q: "هل تركّبون الحواسيب؟", a: "نعم. كوّن تجميعتك في PC Builder: نتحقّق من التوافق، ونركّبها ونختبرها قبل الشحن." },
      { q: "أين أُدخل رمز التخفيض؟", a: "في سلّتك: يُطبَّق التخفيض فوراً ويبقى صالحاً حتى الطلب." },
      { q: "هل يمكنني تعديل طلبي أو إلغاؤه؟", a: "نعم، ما دام لم يُشحن. اتصل بنا مع رقم طلبك." },
    ],
  },
  more: {
    title: "سؤال آخر؟",
    text: "نجيب بالدارجة أو الفرنسية أو الإنجليزية، من السبت إلى الخميس.",
    cta: "اتصل بنا",
  },
};

const en: HelpContent = {
  crumb: "Help",
  title: "Delivery, returns and warranty",
  subtitle: "Everything that happens after you order, explained simply.",
  nav: { delivery: "Delivery", returns: "Returns", warranty: "Warranty", faq: "FAQ" },
  delivery: {
    lead: "We deliver to all 58 wilayas, to your door or a pickup point, and you pay when it arrives.",
    facts: [
      { title: "58 wilayas", text: "From Tlemcen to Tamanrasset, all over Algeria." },
      { title: "Home or pickup point", text: "You choose when you order." },
      { title: "Free from {amount}", text: "Counted on your order, after discounts." },
      { title: "Pay on delivery", text: "In cash, when your parcel arrives." },
    ],
    zonesTitle: "Fees and times by zone",
    zonesNote: "Times are estimates, counted from dispatch. The exact price for your wilaya is shown before you confirm.",
    columns: { zone: "Zone", home: "To your door", pickup: "Pickup point", days: "Time" },
    zoneNames: {
      centre: "Algiers and around",
      north: "North",
      highlands: "High plateaus",
      south: "South",
      deepSouth: "Deep south",
    },
    wilayas: "{n} wilayas",
    days: "{a} to {b} days",
    free: "Free",
    stepsTitle: "Your order's journey",
    steps: [
      { title: "Order", text: "Online, with or without an account." },
      { title: "Confirmation", text: "We call you to confirm it." },
      { title: "Preparation", text: "Packed with care; PCs are built and tested." },
      { title: "Dispatch", text: "The courier takes over." },
      { title: "Delivery", text: "The courier calls before coming by." },
    ],
    track: "Track my order",
  },
  returns: {
    lead: "Not right for you, or arrived faulty? You have 7 days after delivery to tell us.",
    acceptedTitle: "We take back",
    accepted: [
      "Items reported within 7 days of delivery",
      "Complete, in the original box, with accessories and invoice",
      "Unused — unless the item is faulty",
    ],
    excludedTitle: "We don't take back",
    excluded: [
      "Software and licences already activated",
      "Opened consumables: thermal paste, cut cables…",
      "Items damaged by a fall, liquid or misuse",
    ],
    stepsTitle: "How it works",
    steps: [
      { title: "Get in touch", text: "By phone, WhatsApp or the form, with your order number." },
      { title: "We arrange the return", text: "We tell you where to drop the item off, or have it collected." },
      { title: "Exchange or refund", text: "Once checked, we exchange the item or refund you within 7 days." },
    ],
    damaged: "Parcel damaged on arrival? Tell the courier and call us within 48 hours, with photos.",
  },
  warranty: {
    lead: "Every product we sell is new, genuine and comes with an invoice. We handle the warranty process for you.",
    plans: [
      {
        title: "Components and peripherals",
        duration: "Manufacturer warranty",
        text: "The length depends on the brand and product — usually 1 to 3 years. It's stated on your invoice.",
      },
      {
        title: "PCs built by APL TECH",
        duration: "2 years",
        text: "On the whole build, assembly included. One point of contact, whichever part is at fault.",
      },
    ],
    coveredTitle: "Covered",
    covered: ["Manufacturing defects", "Failures in normal use", "Every part of a PC we built"],
    notCoveredTitle: "Not covered",
    notCovered: [
      "Breakage, drops, liquid or power surges",
      "Modifications, third-party repairs or overclocking beyond tolerances",
      "Normal wear: mouse feet, coatings, keycaps",
    ],
    howTitle: "Making a claim",
    how: "Keep your invoice — it's your proof of purchase. Contact us with your order number and a description of the problem: we'll tell you how to get the item to us and keep you posted until it's back.",
  },
  faq: {
    lead: "The questions we get most often.",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No. You can order without one and track your order with its number and your phone. An account just keeps all your orders in one place.",
      },
      { q: "How does confirmation work?", a: "After you order, we call you to confirm before preparing it. Keep your phone nearby." },
      { q: "Can I pay by card?", a: "Not yet — payment is in cash, on delivery." },
      { q: "Are the products genuine?", a: "Yes. Everything we sell is new, original, and comes with an invoice and warranty." },
      { q: "Do you build PCs?", a: "Yes. Put your build together in the PC Builder: we check compatibility, assemble it and test it before it ships." },
      { q: "Where do I enter a promo code?", a: "In your cart — the discount applies straight away and holds until you order." },
      { q: "Can I change or cancel my order?", a: "Yes, as long as it hasn't shipped. Contact us with your order number." },
    ],
  },
  more: {
    title: "Another question?",
    text: "We answer in Darja, French or English, Saturday to Thursday.",
    cta: "Contact us",
  },
};

export const HELP: Record<Locale, HelpContent> = { fr, ar, en };
