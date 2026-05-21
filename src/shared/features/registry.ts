/**
 * Central registry of every IntreVecini feature (F01–F65).
 * The admin can toggle each one per asociație; this registry is the single
 * source of truth for keys, titles, categories, and routing.
 */

export type FeatureKey = `F${string}`;

export type FeatureCategory =
  | 'communication'
  | 'governance'
  | 'maintenance'
  | 'spaces'
  | 'information'
  | 'projects'
  | 'safety'
  | 'community';

export type FeatureAudience = 'admin' | 'comitet' | 'proprietar' | 'chirias' | 'all';

export interface FeatureDef {
  key: FeatureKey;
  title: string;
  category: FeatureCategory;
  /** lucide-react icon name */
  icon: string;
  audience: FeatureAudience[];
  /** in-app route path (relative to /app), if the feature has a dedicated page */
  path?: string;
  /** short Romanian description for the feature-flag admin UI */
  description: string;
  /** whether a working UI page exists yet (vs. registered-only) */
  implemented: boolean;
}

export const FEATURE_CATEGORIES: Record<FeatureCategory, string> = {
  communication: 'Comunicare',
  governance: 'Guvernanță și vot',
  maintenance: 'Mentenanță și sesizări',
  spaces: 'Spații și resurse comune',
  information: 'Informații și evidențe',
  projects: 'Proiecte și lucrări mari',
  safety: 'Siguranță și conformitate',
  community: 'Viața comunității',
};

export const FEATURES: FeatureDef[] = [
  // Category 1 — Communication
  { key: 'F01', title: 'Anunțuri oficiale', category: 'communication', icon: 'Megaphone', audience: ['all'], path: 'anunturi', description: 'Anunțuri oficiale cu confirmare de citire și difuzare țintită.', implemented: true },
  { key: 'F02', title: 'Canal de discuții moderat', category: 'communication', icon: 'MessagesSquare', audience: ['all'], path: 'discutii', description: 'Canal de discuții între locatari, moderat de comitet.', implemented: true },
  { key: 'F03', title: 'Alertă de bloc (urgență)', category: 'communication', icon: 'Siren', audience: ['all'], path: 'alerte', description: 'Difuzare de urgență care ignoră orele de liniște.', implemented: true },
  { key: 'F04', title: 'Mesagerie privată cu administratorul', category: 'communication', icon: 'MessageCircle', audience: ['proprietar', 'chirias', 'admin'], path: 'mesaje-admin', description: 'Canal privat între locatar și administrator.', implemented: false },
  { key: 'F05', title: 'Mesaj anonim către comitet', category: 'communication', icon: 'EyeOff', audience: ['all'], path: 'anonim', description: 'Mesaj către comitet cu identitate ascunsă.', implemented: true },
  { key: 'F06', title: 'Anunțuri vecini (locator)', category: 'communication', icon: 'StickyNote', audience: ['all'], path: 'locator', description: 'Anunțuri neoficiale între vecini, cu expirare la 14 zile.', implemented: true },
  { key: 'F07', title: 'Întrebări frecvente (FAQ)', category: 'communication', icon: 'HelpCircle', audience: ['all'], path: 'faq', description: 'Întrebări frecvente, căutabile, întreținute de administrator.', implemented: true },
  { key: 'F08', title: 'Calendar de evenimente', category: 'communication', icon: 'CalendarDays', audience: ['all'], path: 'evenimente', description: 'Calendar de evenimente cu RSVP și memento-uri.', implemented: true },

  // Category 2 — Governance & Voting
  { key: 'F09', title: 'Vot rapid pe propuneri', category: 'governance', icon: 'Vote', audience: ['proprietar', 'comitet', 'admin'], path: 'voturi', description: 'Voturi rapide pe propuneri, cu cvorum și majoritate configurabile.', implemented: true },
  { key: 'F10', title: 'AGA digitală', category: 'governance', icon: 'Gavel', audience: ['proprietar'], path: 'aga', description: 'Adunare Generală digitală conformă cu Legea 196/2018.', implemented: false },
  { key: 'F11', title: 'Procese verbale (arhivă)', category: 'governance', icon: 'FileSignature', audience: ['all'], path: 'procese-verbale', description: 'Arhivă căutabilă de procese verbale semnate.', implemented: true },
  { key: 'F12', title: 'Buget participativ', category: 'governance', icon: 'PiggyBank', audience: ['proprietar', 'admin'], path: 'buget', description: 'Fond discreționar votat de locatari.', implemented: false },
  { key: 'F13', title: 'Prioritizare proiecte mari', category: 'governance', icon: 'ListOrdered', audience: ['proprietar'], path: 'prioritati', description: 'Clasare prin tragere-și-plasare a proiectelor mari.', implemented: false },
  { key: 'F14', title: 'Cutie de idei', category: 'governance', icon: 'Lightbulb', audience: ['all'], path: 'idei', description: 'Sugestii deschise cu vot, promovate trimestrial.', implemented: true },
  { key: 'F15', title: 'Sondaje de opinie', category: 'governance', icon: 'BarChart3', audience: ['all'], path: 'sondaje', description: 'Sondaje neobligatorii, anonime implicit.', implemented: true },
  { key: 'F16', title: 'Petiții interne', category: 'governance', icon: 'ScrollText', audience: ['all'], path: 'petitii', description: 'Petiții cu strângere de semnături și prag de înaintare.', implemented: true },

  // Category 3 — Maintenance & Issues
  { key: 'F17', title: 'Sesizări cu foto', category: 'maintenance', icon: 'AlertCircle', audience: ['all'], path: 'sesizari', description: 'Raportarea problemelor cu fotografii și urmărirea statusului.', implemented: true },
  { key: 'F18', title: 'Istoric reparații', category: 'maintenance', icon: 'Wrench', audience: ['comitet', 'proprietar', 'admin'], path: 'istoric-reparatii', description: 'Jurnal căutabil al tuturor reparațiilor majore.', implemented: true },
  { key: 'F19', title: 'Calendar service-uri programate', category: 'maintenance', icon: 'CalendarClock', audience: ['all'], path: 'mentenanta', description: 'Mentenanță programată cu memento-uri automate.', implemented: true },
  { key: 'F20', title: 'Citire contoare', category: 'maintenance', icon: 'Gauge', audience: ['proprietar', 'admin'], path: 'contoare', description: 'Trimiterea lunară a indexurilor cu fotografie.', implemented: true },
  { key: 'F21', title: 'Sesizări recurente', category: 'maintenance', icon: 'Repeat', audience: ['comitet', 'admin'], path: 'sesizari-recurente', description: 'Detectarea automată a problemelor repetate.', implemented: false },
  { key: 'F22', title: 'Solicitare oferte (RFP)', category: 'maintenance', icon: 'FileSpreadsheet', audience: ['comitet', 'admin'], path: 'oferte', description: 'Solicitarea și compararea ofertelor de la contractori.', implemented: true },
  { key: 'F23', title: 'Vecin de gardă', category: 'maintenance', icon: 'ShieldCheck', audience: ['all'], path: 'garda', description: 'Voluntar de gardă în weekend, prin rotație.', implemented: true },
  { key: 'F24', title: 'Listă obiecte împrumutabile', category: 'maintenance', icon: 'Handshake', audience: ['all'], path: 'imprumut', description: 'Unelte și obiecte pe care vecinii le împrumută.', implemented: true },

  // Category 4 — Shared Spaces & Resources
  { key: 'F25', title: 'Rezervare spălătorie', category: 'spaces', icon: 'WashingMachine', audience: ['all'], path: 'spalatorie', description: 'Rezervarea sloturilor pentru spălătoria comună.', implemented: false },
  { key: 'F26', title: 'Rezervare lift pentru mutare', category: 'spaces', icon: 'Truck', audience: ['all'], path: 'lift-mutare', description: 'Rezervarea liftului pentru mutări.', implemented: false },
  { key: 'F27', title: 'Rezervare sală comună / terasă', category: 'spaces', icon: 'PartyPopper', audience: ['all'], path: 'sala', description: 'Rezervarea sălii comune sau a terasei.', implemented: false },
  { key: 'F28', title: 'Parcare', category: 'spaces', icon: 'Car', audience: ['all'], path: 'parcare', description: 'Registru locuri de parcare cu mesagerie anonimă.', implemented: true },
  { key: 'F29', title: 'Bicicletăria', category: 'spaces', icon: 'Bike', audience: ['all'], path: 'biciclete', description: 'Registru al bicicletelor din camera comună.', implemented: true },
  { key: 'F30', title: 'Boxa / dependinți', category: 'spaces', icon: 'Box', audience: ['all'], path: 'boxe', description: 'Registru al boxelor și dependințelor.', implemented: true },
  { key: 'F31', title: 'Plante / spații verzi', category: 'spaces', icon: 'Sprout', audience: ['all'], path: 'plante', description: 'Program de voluntariat pentru spațiile verzi.', implemented: true },
  { key: 'F32', title: 'Acces curierat (cod temporar)', category: 'spaces', icon: 'KeyRound', audience: ['all'], path: 'curier', description: 'Coduri temporare de interfon pentru curieri.', implemented: true },

  // Category 5 — Information & Records
  { key: 'F33', title: 'Document arhivă', category: 'information', icon: 'FileText', audience: ['all'], path: 'documente', description: 'Repertoriu de documente oficiale, căutabil.', implemented: true },
  { key: 'F34', title: 'Furnizori / contracte', category: 'information', icon: 'Building2', audience: ['comitet', 'admin'], path: 'furnizori', description: 'Catalog de furnizori cu alerte de expirare a contractelor.', implemented: true },
  { key: 'F35', title: 'Apartament info', category: 'information', icon: 'DoorOpen', audience: ['proprietar'], path: 'apartament-info', description: 'Pagina informativă a fiecărui apartament.', implemented: false },
  { key: 'F36', title: 'Locator directory', category: 'information', icon: 'Contact', audience: ['all'], path: 'vecini', description: 'Agendă de contacte ale locatarilor (opt-in).', implemented: true },
  { key: 'F37', title: 'Pet directory', category: 'information', icon: 'PawPrint', audience: ['all'], path: 'animale', description: 'Registru de animale de companie (opt-in).', implemented: true },
  { key: 'F38', title: 'Carte de aur (mulțumiri)', category: 'information', icon: 'Heart', audience: ['all'], path: 'multumiri', description: 'Perete public de mulțumiri între vecini.', implemented: true },
  { key: 'F39', title: 'Wiki bloc', category: 'information', icon: 'BookOpen', audience: ['all'], path: 'wiki', description: 'Wiki colaborativ cu cunoștințe locale.', implemented: true },
  { key: 'F40', title: 'Glosar de termeni', category: 'information', icon: 'BookA', audience: ['all'], path: 'glosar', description: 'Definiții pentru termenii din facturi și AGA.', implemented: true },

  // Category 6 — Projects & Major Works
  { key: 'F41', title: 'Project tracker', category: 'projects', icon: 'KanbanSquare', audience: ['all'], path: 'proiecte', description: 'Urmărirea lucrărilor majore: faze, buget, fotografii.', implemented: false },
  { key: 'F42', title: 'Project photo journal', category: 'projects', icon: 'Images', audience: ['all'], path: 'jurnal-foto', description: 'Jurnal foto al lucrărilor în desfășurare.', implemented: false },
  { key: 'F43', title: 'Contractor library', category: 'projects', icon: 'HardHat', audience: ['comitet', 'admin'], path: 'contractori', description: 'Bibliotecă de contractori verificați, cu rating.', implemented: true },
  { key: 'F44', title: 'Crowdfunding proiecte mici', category: 'projects', icon: 'HandCoins', audience: ['all'], path: 'crowdfund', description: 'Contribuții voluntare la proiecte mici.', implemented: true },
  { key: 'F45', title: 'Plan multianual de mentenanță', category: 'projects', icon: 'CalendarRange', audience: ['all'], path: 'plan-multianual', description: 'Plan de lucrări pe 5-10 ani.', implemented: true },
  { key: 'F46', title: 'Recomandări fond de reparații', category: 'projects', icon: 'Calculator', audience: ['all'], path: 'fond-reparatii', description: 'Calculator pentru rata fondului de reparații.', implemented: true },
  { key: 'F47', title: 'Energy efficiency tracker', category: 'projects', icon: 'Zap', audience: ['all'], path: 'energie', description: 'Urmărirea consumului energetic al blocului.', implemented: true },
  { key: 'F48', title: 'Garanție tracker', category: 'projects', icon: 'BadgeCheck', audience: ['comitet', 'admin'], path: 'garantii', description: 'Urmărirea garanțiilor echipamentelor instalate.', implemented: true },

  // Category 7 — Safety & Compliance
  { key: 'F49', title: 'Cod portari / vecini de încredere', category: 'safety', icon: 'Lock', audience: ['all'], path: 'cod-siguranta', description: 'Liste de vecini de încredere, stocate criptat.', implemented: false },
  { key: 'F50', title: 'Plan de evacuare', category: 'safety', icon: 'Map', audience: ['all'], path: 'evacuare', description: 'Planuri de evacuare cu marcaje pentru animale.', implemented: false },
  { key: 'F51', title: 'Verificări PSI', category: 'safety', icon: 'Flame', audience: ['comitet', 'admin'], path: 'psi', description: 'Urmărirea verificărilor PSI obligatorii.', implemented: true },
  { key: 'F52', title: 'Asigurare bloc', category: 'safety', icon: 'Umbrella', audience: ['comitet', 'admin'], path: 'asigurare', description: 'Urmărirea poliței de asigurare a blocului.', implemented: true },
  { key: 'F53', title: 'Registru de chei', category: 'safety', icon: 'KeySquare', audience: ['comitet', 'admin'], path: 'chei', description: 'Cine deține cheile spațiilor comune.', implemented: true },
  { key: 'F54', title: 'Vizitatori / străini observați', category: 'safety', icon: 'UserSearch', audience: ['all'], path: 'vizitatori', description: 'Jurnalizarea rapidă a vizitatorilor suspecți.', implemented: true },
  { key: 'F55', title: 'Sistem alarmă (status)', category: 'safety', icon: 'BellRing', audience: ['all'], path: 'alarma', description: 'Status al sistemului de alarmă / detecție.', implemented: true },
  { key: 'F56', title: 'Numere de urgență localizate', category: 'safety', icon: 'PhoneCall', audience: ['all'], path: 'urgenta', description: 'Numere de urgență personalizate pentru bloc.', implemented: true },

  // Category 8 — Community Life
  { key: 'F57', title: 'Marketplace intern', category: 'community', icon: 'ShoppingBag', audience: ['all'], path: 'marketplace', description: 'Vânzare/donare de obiecte între vecini.', implemented: true },
  { key: 'F58', title: 'Carpooling', category: 'community', icon: 'CarFront', audience: ['all'], path: 'carpool', description: 'Drumuri partajate între vecini (opt-in).', implemented: true },
  { key: 'F59', title: 'Babysitting / pet-sitting', category: 'community', icon: 'Baby', audience: ['all'], path: 'babysitting', description: 'Bord de babysitting și pet-sitting.', implemented: true },
  { key: 'F60', title: 'Skill exchange / barter', category: 'community', icon: 'Repeat2', audience: ['all'], path: 'barter', description: 'Schimb de servicii și abilități între vecini.', implemented: true },
  { key: 'F61', title: 'Grupuri de cumpărături comune', category: 'community', icon: 'ShoppingCart', audience: ['all'], path: 'cumparaturi', description: 'Coordonarea cumpărăturilor în grup.', implemented: true },
  { key: 'F62', title: 'Welcome kit for new residents', category: 'community', icon: 'Gift', audience: ['all'], path: 'welcome-kit', description: 'Mesaj de bun-venit pentru locatarii noi.', implemented: false },
  { key: 'F63', title: 'Aniversări (opt-in)', category: 'community', icon: 'Cake', audience: ['all'], path: 'aniversari', description: 'Felicitări de ziua de naștere (opt-in).', implemented: true },
  { key: 'F64', title: 'Activități copii și adolescenți', category: 'community', icon: 'ToyBrick', audience: ['all'], path: 'copii', description: 'Coordonarea activităților pentru copii.', implemented: false },
  { key: 'F65', title: 'Feedback platformă', category: 'community', icon: 'MessageSquarePlus', audience: ['all'], path: 'feedback', description: 'Feedback despre platforma IntreVecini.', implemented: true },
];

export const FEATURE_MAP: Record<string, FeatureDef> = Object.fromEntries(
  FEATURES.map((f) => [f.key, f]),
);

export function getFeature(key: string): FeatureDef | undefined {
  return FEATURE_MAP[key];
}

export function featuresByCategory(category: FeatureCategory): FeatureDef[] {
  return FEATURES.filter((f) => f.category === category);
}

/** Recommended starter set per DEPLOYMENT.md. */
export const RECOMMENDED_FEATURES: FeatureKey[] = [
  'F01', 'F03', 'F08', 'F09', 'F17', 'F19', 'F20', 'F33', 'F36', 'F56',
];
