/**
 * The blog — articles in three languages, each with one image.
 *
 * ⚠ Starter articles written for the design: general buying advice and how
 * the shop works, nothing that names a price or a stock level. Add, edit or
 * remove them here; the pages read nothing else.
 */

import type { Locale } from "@/lib/locales";

export type Block = { type: "h"; text: string } | { type: "p"; text: string };

export type PostCategory = "guide" | "setup" | "shop";

export type Post = {
  slug: string;
  category: PostCategory;
  /** ISO date */
  date: string;
  readMinutes: number;
  image: { src: string; width: number; height: number };
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
  alt: Record<Locale, string>;
  body: Record<Locale, Block[]>;
};

const h = (text: string): Block => ({ type: "h", text });
const p = (text: string): Block => ({ type: "p", text });

export const POSTS: Post[] = [
  {
    slug: "choisir-sa-carte-graphique",
    category: "guide",
    date: "2026-09-10",
    readMinutes: 4,
    image: { src: "/products/gpu.jpg", width: 1500, height: 1000 },
    title: {
      fr: "Comment choisir sa carte graphique",
      ar: "كيف تختار بطاقتك الرسومية",
      en: "How to choose a graphics card",
    },
    excerpt: {
      fr: "Résolution, mémoire vidéo, alimentation : les trois questions à se poser avant d’acheter.",
      ar: "الدقة، ذاكرة الفيديو، مزوّد الطاقة: ثلاثة أسئلة قبل الشراء.",
      en: "Resolution, video memory, power supply: the three questions to ask before you buy.",
    },
    alt: {
      fr: "Deux cartes graphiques NVIDIA posées sur un fond sombre",
      ar: "بطاقتان رسوميتان من NVIDIA على خلفية داكنة",
      en: "Two NVIDIA graphics cards on a dark background",
    },
    body: {
      fr: [
        p("La carte graphique est la pièce qui compte le plus dans un PC de jeu, et celle où il est le plus facile de trop dépenser — ou pas assez. Tout part de ce que tu veux en faire."),
        h("Commence par ton écran"),
        p("En 1080p, une carte d’entrée ou de milieu de gamme suffit pour la plupart des jeux compétitifs à haut taux de rafraîchissement. En 1440p, vise le milieu de gamme supérieur. En 4K, seules les cartes haut de gamme tiennent un bon niveau de détail."),
        h("La mémoire vidéo compte"),
        p("Les jeux récents consomment de plus en plus de VRAM, surtout avec des textures en haute qualité. Au-delà du 1080p, 12 à 16 Go sont un bon repère pour jouer confortablement ces prochaines années."),
        h("Pense à l’alimentation et au boîtier"),
        p("Une carte puissante demande une alimentation à la hauteur et assez de place dans le boîtier. Vérifie la puissance recommandée par le fabricant et la longueur de la carte avant d’acheter."),
        h("Ne néglige pas le processeur"),
        p("Un processeur trop ancien peut brider une carte récente, surtout en 1080p où il travaille le plus. Mieux vaut un duo équilibré qu’une carte haut de gamme freinée par le reste de la machine."),
        p("Un doute ? Envoie-nous ta config actuelle : on te dit quelle carte elle peut accueillir."),
      ],
      ar: [
        p("البطاقة الرسومية هي أهم قطعة في حاسوب الألعاب، وهي أيضاً القطعة التي يسهل فيها إنفاق الكثير — أو القليل. كل شيء يبدأ بما تريد فعله بها."),
        h("ابدأ بشاشتك"),
        p("بدقة 1080p، تكفي بطاقة من الفئة الدنيا أو المتوسطة لمعظم الألعاب التنافسية بمعدل تحديث مرتفع. بدقة 1440p، اختر الفئة المتوسطة العليا. أما بدقة 4K، فلا تحافظ على مستوى تفاصيل جيد إلا البطاقات الراقية."),
        h("ذاكرة الفيديو مهمة"),
        p("تستهلك الألعاب الحديثة ذاكرة فيديو متزايدة، خاصة مع الإكساءات عالية الجودة. فوق 1080p، تُعدّ 12 إلى 16 جيغابايت مرجعاً جيداً للّعب براحة في السنوات القادمة."),
        h("فكّر في مزوّد الطاقة والصندوق"),
        p("البطاقة القوية تحتاج مزوّد طاقة مناسباً ومساحة كافية في الصندوق. تحقّق من القدرة التي يوصي بها المُصنّع ومن طول البطاقة قبل الشراء."),
        h("لا تُهمل المعالج"),
        p("قد يحدّ معالج قديم من أداء بطاقة حديثة، خاصة بدقة 1080p حيث يعمل أكثر. الأفضل ثنائي متوازن بدل بطاقة راقية تكبحها بقية القطع."),
        p("لديك شك؟ أرسل لنا تجميعتك الحالية: نخبرك بالبطاقة التي تناسبها."),
      ],
      en: [
        p("The graphics card is the part that matters most in a gaming PC, and the easiest one to overspend — or underspend — on. It all starts with what you want it to do."),
        h("Start with your monitor"),
        p("At 1080p, an entry-level or mid-range card is enough for most competitive games at high refresh rates. At 1440p, aim for upper mid-range. At 4K, only high-end cards hold a good level of detail."),
        h("Video memory matters"),
        p("Recent games use more and more VRAM, especially with high-quality textures. Above 1080p, 12 to 16 GB is a good benchmark to play comfortably for the next few years."),
        h("Think about the power supply and case"),
        p("A powerful card needs a power supply to match and enough room in the case. Check the manufacturer's recommended wattage and the card's length before you buy."),
        h("Don't overlook the processor"),
        p("An older processor can hold back a recent card, especially at 1080p where it works hardest. A balanced pair beats a high-end card slowed down by the rest of the machine."),
        p("Not sure? Send us your current build and we'll tell you which card it can take."),
      ],
    },
  },
  {
    slug: "ddr4-ou-ddr5",
    category: "guide",
    date: "2026-08-28",
    readMinutes: 3,
    image: { src: "/products/cpu.jpg", width: 1400, height: 1050 },
    title: {
      fr: "DDR4 ou DDR5 : laquelle choisir ?",
      ar: "DDR4 أم DDR5: أيّهما تختار؟",
      en: "DDR4 or DDR5: which should you pick?",
    },
    excerpt: {
      fr: "Ce n’est pas vraiment toi qui choisis : c’est ta carte mère. On t’explique.",
      ar: "لستَ أنت من يختار حقاً: بل لوحتك الأم. إليك الشرح.",
      en: "It isn't really your choice — it's your motherboard's. Here's why.",
    },
    alt: {
      fr: "Un processeur AMD Ryzen installé sur une carte mère",
      ar: "معالج AMD Ryzen مركّب على لوحة أم",
      en: "An AMD Ryzen processor seated on a motherboard",
    },
    body: {
      fr: [
        p("C’est la question qu’on nous pose le plus souvent en montant un PC. La réponse est simple : la mémoire se choisit en fonction de la carte mère, pas l’inverse."),
        h("Deux standards incompatibles"),
        p("La DDR4 et la DDR5 n’ont pas la même encoche : une barrette DDR5 ne rentre pas dans un emplacement DDR4, et inversement. Une carte mère accepte l’une ou l’autre, jamais les deux."),
        h("Ce que change la DDR5"),
        p("Elle offre davantage de bande passante, ce qui profite aux processeurs récents et à certains jeux. Les plateformes AMD AM5 fonctionnent uniquement en DDR5 ; chez Intel, selon la carte mère, on trouve l’une ou l’autre."),
        h("Notre conseil"),
        p("Pour une nouvelle config, pars sur la DDR5 : c’est le standard des plateformes actuelles. Pour mettre à niveau un PC en DDR4, reste en DDR4 et prends deux barrettes identiques pour profiter du dual channel."),
        p("Dans le PC Builder, la compatibilité de la mémoire est vérifiée automatiquement : impossible de mélanger les deux par erreur."),
      ],
      ar: [
        p("هذا هو السؤال الذي يُطرح علينا أكثر عند تركيب حاسوب. والجواب بسيط: الذاكرة تُختار حسب اللوحة الأم، وليس العكس."),
        h("معياران غير متوافقين"),
        p("لا تملك DDR4 وDDR5 نفس الشقّ: شريحة DDR5 لا تدخل في منفذ DDR4، والعكس صحيح. تقبل اللوحة الأم أحدهما، ولا تقبل الاثنين معاً أبداً."),
        h("ما الذي تغيّره DDR5"),
        p("توفّر عرض نطاق أكبر، وهو ما يفيد المعالجات الحديثة وبعض الألعاب. منصات AMD AM5 تعمل بـ DDR5 فقط؛ أما لدى Intel، فحسب اللوحة الأم تجد هذا أو ذاك."),
        h("نصيحتنا"),
        p("لتجميعة جديدة، اختر DDR5: إنها معيار المنصات الحالية. ولترقية حاسوب يعمل بـ DDR4، ابقَ على DDR4 وخذ شريحتين متطابقتين للاستفادة من القناة المزدوجة."),
        p("في PC Builder، يتم التحقّق من توافق الذاكرة تلقائياً: لا يمكن خلط النوعين عن طريق الخطأ."),
      ],
      en: [
        p("It's the question we get asked most when building a PC. The answer is simple: memory is chosen to match the motherboard, not the other way round."),
        h("Two incompatible standards"),
        p("DDR4 and DDR5 don't have the same notch: a DDR5 stick won't fit a DDR4 slot, and vice versa. A motherboard takes one or the other, never both."),
        h("What DDR5 changes"),
        p("It offers more bandwidth, which helps recent processors and some games. AMD's AM5 platform is DDR5 only; with Intel, depending on the motherboard, you'll find either."),
        h("Our advice"),
        p("For a new build, go DDR5 — it's the standard on current platforms. To upgrade a DDR4 PC, stay on DDR4 and take two identical sticks to get dual channel."),
        p("In the PC Builder, memory compatibility is checked automatically, so you can't mix the two by mistake."),
      ],
    },
  },
  {
    slug: "monter-son-pc-gamer",
    category: "guide",
    date: "2026-08-14",
    readMinutes: 5,
    image: { src: "/products/ai-builder.jpg", width: 1672, height: 941 },
    title: {
      fr: "Monter son PC gamer : 5 conseils avant de commencer",
      ar: "تركيب حاسوب الألعاب: 5 نصائح قبل البدء",
      en: "Building a gaming PC: 5 tips before you start",
    },
    excerpt: {
      fr: "Budget, compatibilité, alimentation, refroidissement : bien préparer son montage.",
      ar: "الميزانية، التوافق، مزوّد الطاقة، التبريد: حضّر تركيبك جيداً.",
      en: "Budget, compatibility, power, cooling: preparing your build properly.",
    },
    alt: {
      fr: "Un bras robotisé installe une carte graphique dans un boîtier éclairé en violet",
      ar: "ذراع آلية تركّب بطاقة رسومية داخل صندوق مضاء بالبنفسجي",
      en: "A robotic arm fitting a graphics card into a purple-lit case",
    },
    body: {
      fr: [
        p("Monter son PC est plus simple qu’il n’y paraît, à condition de bien préparer le terrain. Voici ce qu’on vérifie avant chaque montage."),
        h("1. Définis ton budget et ton usage"),
        p("Jeux compétitifs, jeux AAA, montage vidéo : l’usage décide où mettre l’argent. Pour le jeu, la carte graphique prend la plus grosse part du budget."),
        h("2. Vérifie la compatibilité"),
        p("Socket du processeur, type de mémoire, format de la carte mère, place dans le boîtier : chaque pièce doit aller avec les autres."),
        h("3. Ne lésine pas sur l’alimentation"),
        p("Une alimentation de qualité, avec une marge de puissance, protège toutes les autres pièces. C’est la dernière économie à faire."),
        h("4. Pense au refroidissement"),
        p("Un bon flux d’air — l’air frais entre par l’avant, l’air chaud sort par l’arrière — garde les composants au frais et le PC silencieux."),
        h("5. Prends ton temps"),
        p("Travaille sur une surface dégagée, touche une surface métallique avant de manipuler les pièces, et garde le manuel de la carte mère à portée de main."),
        p("Tu préfères qu’on s’en charge ? Compose ta config dans le PC Builder : on la monte, on la teste et on te la livre prête à jouer."),
      ],
      ar: [
        p("تركيب حاسوبك أبسط مما يبدو، بشرط أن تحضّر جيداً. إليك ما نتحقّق منه قبل كل تركيب."),
        h("1. حدّد ميزانيتك واستعمالك"),
        p("ألعاب تنافسية، ألعاب AAA، مونتاج فيديو: الاستعمال يحدّد أين تضع المال. في الألعاب، تأخذ البطاقة الرسومية الحصة الأكبر من الميزانية."),
        h("2. تحقّق من التوافق"),
        p("منفذ المعالج، نوع الذاكرة، مقاس اللوحة الأم، المساحة في الصندوق: يجب أن تتوافق كل قطعة مع البقية."),
        h("3. لا تبخل على مزوّد الطاقة"),
        p("مزوّد طاقة جيد، بهامش من القدرة، يحمي كل القطع الأخرى. إنه آخر ما يجب التوفير فيه."),
        h("4. فكّر في التبريد"),
        p("تدفّق هواء جيد — يدخل الهواء البارد من الأمام ويخرج الساخن من الخلف — يحافظ على برودة القطع وهدوء الحاسوب."),
        h("5. خذ وقتك"),
        p("اعمل على سطح خالٍ، والمس سطحاً معدنياً قبل لمس القطع، وأبقِ دليل اللوحة الأم في متناولك."),
        p("تفضّل أن نتكفّل بذلك؟ كوّن تجميعتك في PC Builder: نركّبها ونختبرها ونوصلها إليك جاهزة للّعب."),
      ],
      en: [
        p("Building your own PC is simpler than it looks, as long as you prepare properly. Here's what we check before every build."),
        h("1. Set your budget and use"),
        p("Competitive games, AAA titles, video editing: what you'll do decides where the money goes. For gaming, the graphics card takes the biggest share."),
        h("2. Check compatibility"),
        p("Processor socket, memory type, motherboard size, room in the case: every part has to work with the others."),
        h("3. Don't skimp on the power supply"),
        p("A quality power supply with some headroom protects every other part. It's the last place to save money."),
        h("4. Think about cooling"),
        p("Good airflow — cool air in at the front, warm air out at the back — keeps components cool and the PC quiet."),
        h("5. Take your time"),
        p("Work on a clear surface, touch something metal before handling parts, and keep the motherboard manual close by."),
        p("Rather we handled it? Put your build together in the PC Builder: we assemble it, test it and deliver it ready to play."),
      ],
    },
  },
  {
    slug: "setup-gaming-complet",
    category: "setup",
    date: "2026-07-30",
    readMinutes: 3,
    image: { src: "/products/setup.jpg", width: 1500, height: 1000 },
    title: {
      fr: "Un setup gaming complet : par quoi commencer ?",
      ar: "تجهيزات ألعاب كاملة: من أين تبدأ؟",
      en: "A complete gaming setup: where to start?",
    },
    excerpt: {
      fr: "Écran, souris, clavier, casque : ce qui fait vraiment la différence autour du PC.",
      ar: "الشاشة، الفأرة، لوحة المفاتيح، السماعة: ما يصنع الفرق حقاً حول الحاسوب.",
      en: "Monitor, mouse, keyboard, headset: what really makes a difference around the PC.",
    },
    alt: {
      fr: "Un joueur avec un casque devant son écran lors d’un tournoi",
      ar: "لاعب يضع سماعة أمام شاشته خلال بطولة",
      en: "A player wearing a headset in front of a monitor at a tournament",
    },
    body: {
      fr: [
        p("Le PC calcule les images, mais c’est l’écran, la souris, le clavier et le casque qui font l’expérience. Voici dans quel ordre les regarder."),
        h("L’écran d’abord"),
        p("Un PC puissant branché sur un écran 60 Hz gaspille une partie de ses performances. Pour les jeux compétitifs, un écran de 144 Hz ou plus fait une vraie différence."),
        h("La souris et le clavier"),
        p("Ce sont les deux pièces que tu touches le plus. Une souris légère au capteur précis, un clavier dont la frappe te plaît : choisis-les pour ta main, pas pour la fiche technique."),
        h("Le casque"),
        p("Entendre d’où viennent les pas est un avantage. Un casque confortable, avec un micro clair pour jouer en équipe, vaut mieux qu’un son trop spectaculaire."),
        h("Monter en gamme petit à petit"),
        p("Pas besoin de tout changer d’un coup : commence par l’élément qui te limite le plus aujourd’hui."),
      ],
      ar: [
        p("الحاسوب يحسب الصور، لكن الشاشة والفأرة ولوحة المفاتيح والسماعة هي التي تصنع التجربة. إليك بأي ترتيب تنظر إليها."),
        h("الشاشة أولاً"),
        p("حاسوب قوي موصول بشاشة 60 هرتز يضيّع جزءاً من أدائه. في الألعاب التنافسية، تُحدث شاشة 144 هرتز أو أكثر فرقاً حقيقياً."),
        h("الفأرة ولوحة المفاتيح"),
        p("هما القطعتان اللتان تلمسهما أكثر. فأرة خفيفة بمستشعر دقيق، ولوحة مفاتيح تعجبك ضغطتها: اخترهما ليدك، لا للمواصفات."),
        h("السماعة"),
        p("سماع مصدر الخطوات ميزة. سماعة مريحة بميكروفون واضح للّعب الجماعي أفضل من صوت مبالغ فيه."),
        h("ترقية تدريجية"),
        p("لا حاجة لتغيير كل شيء دفعة واحدة: ابدأ بالعنصر الذي يحدّك أكثر اليوم."),
      ],
      en: [
        p("The PC renders the frames, but the monitor, mouse, keyboard and headset make the experience. Here's the order to look at them in."),
        h("The monitor first"),
        p("A powerful PC plugged into a 60 Hz monitor wastes part of its performance. For competitive games, a 144 Hz or faster monitor makes a real difference."),
        h("Mouse and keyboard"),
        p("They're the two things you touch most. A light mouse with a precise sensor, a keyboard whose feel you like: choose them for your hand, not the spec sheet."),
        h("The headset"),
        p("Hearing where footsteps come from is an edge. A comfortable headset with a clear mic for team play beats overly dramatic sound."),
        h("Upgrade step by step"),
        p("No need to change everything at once — start with whatever holds you back most today."),
      ],
    },
  },
  {
    slug: "livraison-58-wilayas",
    category: "shop",
    date: "2026-07-15",
    readMinutes: 2,
    image: { src: "/products/delivery-dz.jpg", width: 1672, height: 941 },
    title: {
      fr: "Livraison dans les 58 wilayas : comment ça se passe ?",
      ar: "التوصيل إلى 58 ولاية: كيف يتم؟",
      en: "Delivery to all 58 wilayas: how does it work?",
    },
    excerpt: {
      fr: "De la confirmation par téléphone au paiement à la réception, étape par étape.",
      ar: "من التأكيد بالهاتف إلى الدفع عند الاستلام، خطوة بخطوة.",
      en: "From the confirmation call to paying on delivery, step by step.",
    },
    alt: {
      fr: "Une carte de l’Algérie illuminée, une camionnette de livraison et des colis",
      ar: "خريطة الجزائر مضاءة، وشاحنة توصيل وطرود",
      en: "A lit-up map of Algeria, a delivery van and parcels",
    },
    body: {
      fr: [
        p("D’Alger à Tamanrasset, on livre partout en Algérie. Voici ce qui se passe entre ta commande et l’arrivée de ton colis."),
        h("On t’appelle pour confirmer"),
        p("Après ta commande, on t’appelle pour la valider. C’est aussi le bon moment pour poser tes questions."),
        h("Préparation et expédition"),
        p("Ton colis est emballé avec soin — les PC sont montés et testés avant de partir — puis confié au transporteur."),
        h("Suis ton colis"),
        p("Avec ton numéro de commande et ton téléphone, tu vois chaque étape sur la page de suivi, sans avoir besoin de compte."),
        h("Tu paies à la réception"),
        p("À domicile ou en point de retrait, tu règles en espèces quand tu reçois ta commande. Et la livraison est offerte à partir de 100 000 DA."),
      ],
      ar: [
        p("من الجزائر العاصمة إلى تمنراست، نوصل إلى كل أنحاء الجزائر. إليك ما يحدث بين طلبك ووصول طردك."),
        h("نتّصل بك للتأكيد"),
        p("بعد طلبك، نتّصل بك لتأكيده. إنها أيضاً فرصة جيدة لطرح أسئلتك."),
        h("التحضير والشحن"),
        p("يُغلَّف طردك بعناية — تُركَّب الحواسيب وتُختبر قبل خروجها — ثم يُسلَّم إلى الناقل."),
        h("تتبّع طردك"),
        p("برقم طلبك وهاتفك، ترى كل مرحلة في صفحة التتبّع، دون حاجة إلى حساب."),
        h("تدفع عند الاستلام"),
        p("في المنزل أو في نقطة الاستلام، تدفع نقداً عندما تستلم طلبك. والتوصيل مجاني ابتداءً من 100 000 دج."),
      ],
      en: [
        p("From Algiers to Tamanrasset, we deliver all over Algeria. Here's what happens between your order and your parcel arriving."),
        h("We call to confirm"),
        p("After you order, we call you to confirm it. It's a good moment to ask any questions, too."),
        h("Packing and dispatch"),
        p("Your parcel is packed with care — PCs are built and tested before they leave — then handed to the courier."),
        h("Track your parcel"),
        p("With your order number and phone, you can follow every step on the tracking page, no account needed."),
        h("Pay on delivery"),
        p("At home or at a pickup point, you pay in cash when your order arrives. And delivery is free from 100,000 DA."),
      ],
    },
  },
];

export const getPost = (slug: string): Post | undefined => POSTS.find((post) => post.slug === slug);
