import type {
  Announcement,
  Apartment,
  Asociatie,
  Bike,
  BuildingEvent,
  EmergencyContact,
  FaqEntry,
  GlossaryEntry,
  Idea,
  LendingItem,
  MarketplaceListing,
  Meter,
  MeterReading,
  Pet,
  Poll,
  PollOption,
  RepairRecord,
  ResidentPost,
  Survey,
  SurveyTally,
  DirectoryEntry,
  ThankYou,
  Ticket,
  VisitorReport,
  Warranty,
} from '@/shared/types/domain';
import { RECOMMENDED_FEATURES } from '@/shared/features/registry';

export const DEMO_ASOCIATIE: Asociatie = {
  id: 'demo-asoc',
  name: 'Asociația de Proprietari Bloc 12, Scara A',
  slug: 'bloc-12-scara-a',
  address: 'Str. Aleea Teilor nr. 12, Sector 4, București',
  cui: '12345678',
  registration_number: '4521/2019',
  country: 'RO',
  locale: 'ro',
  timezone: 'Europe/Bucharest',
  currency: 'RON',
  branding: { primary_color: '#2563eb', welcome_message: 'Bine ai venit în comunitatea blocului nostru!' },
  settings: {},
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2026-05-01T08:00:00Z',
  deleted_at: null,
};

export const DEMO_FEATURES: Record<string, boolean> = Object.fromEntries(
  RECOMMENDED_FEATURES.map((k) => [k, true]),
);

export const DEMO_APARTMENTS: Apartment[] = [
  { id: 'ap-1', asociatie_id: 'demo-asoc', scara: 'A', etaj: 0, numar_apartament: '1', suprafata_utila: 54.2, cota_parte_indiviza: 0.041, numar_persoane: 2, proprietar_principal_name: 'Ionescu Maria', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-2', asociatie_id: 'demo-asoc', scara: 'A', etaj: 1, numar_apartament: '5', suprafata_utila: 63.8, cota_parte_indiviza: 0.048, numar_persoane: 3, proprietar_principal_name: 'Popescu Andrei', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-3', asociatie_id: 'demo-asoc', scara: 'A', etaj: 2, numar_apartament: '9', suprafata_utila: 71.0, cota_parte_indiviza: 0.054, numar_persoane: 4, proprietar_principal_name: 'Georgescu Elena', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-4', asociatie_id: 'demo-asoc', scara: 'A', etaj: 3, numar_apartament: '13', suprafata_utila: 54.2, cota_parte_indiviza: 0.041, numar_persoane: 1, proprietar_principal_name: 'Dumitrescu Vasile', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-5', asociatie_id: 'demo-asoc', scara: 'A', etaj: 4, numar_apartament: '17', suprafata_utila: 63.8, cota_parte_indiviza: 0.048, numar_persoane: 2, proprietar_principal_name: 'Stan Gabriela', is_active: true, notes: null, created_at: '', updated_at: '' },
];

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an-1', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Întrerupere apă caldă — 25 mai',
    body_html: '<p>Se va întrerupe apa caldă <strong>mâine între 09:00 și 14:00</strong> pentru lucrări la centrala termică. Vă mulțumim pentru înțelegere.</p>',
    category: 'important', audience: { type: 'all' },
    scheduled_at: null, published_at: '2026-05-20T10:00:00Z', expires_at: null,
    created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z',
  },
  {
    id: 'an-2', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Adunarea Generală anuală — 5 iunie, ora 18:00',
    body_html: '<p>Vă invităm la Adunarea Generală anuală care va avea loc în holul de la parter. Ordinea de zi va fi afișată la avizier și în aplicație.</p>',
    category: 'eveniment', audience: { type: 'all' },
    scheduled_at: null, published_at: '2026-05-18T09:00:00Z', expires_at: null,
    created_at: '2026-05-18T09:00:00Z', updated_at: '2026-05-18T09:00:00Z',
  },
  {
    id: 'an-3', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Curățenie generală pe casa scării',
    body_html: '<p>Sâmbătă, 24 mai, firma de curățenie va efectua spălarea generală a casei scării. Vă rugăm să nu lăsați obiecte pe holuri.</p>',
    category: 'informativ', audience: { type: 'scara', scari: ['A'] },
    scheduled_at: null, published_at: '2026-05-15T12:00:00Z', expires_at: null,
    created_at: '2026-05-15T12:00:00Z', updated_at: '2026-05-15T12:00:00Z',
  },
];

export const DEMO_POLL_OPTIONS: PollOption[] = [
  { id: 'po-1', poll_id: 'poll-1', label: 'Pentru', sort_order: 0 },
  { id: 'po-2', poll_id: 'poll-1', label: 'Contra', sort_order: 1 },
  { id: 'po-3', poll_id: 'poll-1', label: 'Abținere', sort_order: 2 },
];

export const DEMO_POLLS: Poll[] = [
  {
    id: 'poll-1', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Înlocuirea interfonului audio cu unul video',
    description: 'Comitetul propune înlocuirea interfonului audio cu unul video. Cost estimat: 12.500 lei din fondul de reparații.',
    poll_type: 'yes_no', weighted: false, quorum_percent: 50, majority_rule: 'simple',
    opens_at: '2026-05-19T00:00:00Z', closes_at: '2026-05-28T23:59:00Z', audience: { type: 'all' },
    created_at: '2026-05-19T00:00:00Z', published_at: '2026-05-19T00:00:00Z', closed_at: null,
  },
];

export const DEMO_VOTE_COUNTS: Record<string, number> = { 'po-1': 18, 'po-2': 4, 'po-3': 3 };

export const DEMO_TICKETS: Ticket[] = [
  {
    id: 't-1', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-3',
    title: 'Bec ars pe casa scării, etajul 4', description: 'Becul de pe palierul etajului 4 nu mai funcționează de două zile.',
    category: 'iluminat', severity: 'low', location_scara: 'A', location_etaj: 4, location_description: 'Palier etaj 4',
    status: 'in_lucru', assigned_to_user_id: 'u-admin', sla_due_at: '2026-05-23T18:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-19T15:30:00Z', updated_at: '2026-05-20T09:00:00Z',
  },
  {
    id: 't-2', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-1',
    title: 'Infiltrație în garaj', description: 'Apare apă pe peretele din dreapta intrării în garaj după ploaie.',
    category: 'apa', severity: 'high', location_scara: 'A', location_etaj: -1, location_description: 'Garaj subsol',
    status: 'primit', assigned_to_user_id: null, sla_due_at: '2026-05-22T12:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-21T08:15:00Z', updated_at: '2026-05-21T08:15:00Z',
  },
];

export const DEMO_EVENTS: BuildingEvent[] = [
  { id: 'ev-1', asociatie_id: 'demo-asoc', title: 'Adunarea Generală anuală', description: 'Discutarea bugetului și a lucrărilor de anvelopare.', location: 'Holul de la parter', starts_at: '2026-06-05T18:00:00Z', ends_at: '2026-06-05T20:00:00Z', category: 'AGA', created_by: 'u-admin', created_at: '2026-05-18T09:00:00Z' },
  { id: 'ev-2', asociatie_id: 'demo-asoc', title: 'Deratizare programată', description: 'Firma autorizată va efectua deratizarea spațiilor comune.', location: 'Subsol și spații comune', starts_at: '2026-05-28T09:00:00Z', ends_at: '2026-05-28T12:00:00Z', category: 'mentenanță', created_by: 'u-admin', created_at: '2026-05-15T09:00:00Z' },
];

export const DEMO_EMERGENCY: EmergencyContact[] = [
  { id: 'em-1', asociatie_id: 'demo-asoc', label: 'Urgențe (SNUAU)', phone: '112', category: 'general', sort_order: 0 },
  { id: 'em-2', asociatie_id: 'demo-asoc', label: 'Dispecerat lift', phone: '+40 21 555 0123', category: 'lift', sort_order: 1 },
  { id: 'em-3', asociatie_id: 'demo-asoc', label: 'Avarii apă (dispecerat local)', phone: '+40 21 555 0456', category: 'apa', sort_order: 2 },
  { id: 'em-4', asociatie_id: 'demo-asoc', label: 'Avarii gaz (Distrigaz)', phone: '+40 800 800 928', category: 'gaz', sort_order: 3 },
  { id: 'em-5', asociatie_id: 'demo-asoc', label: 'Administrator', phone: '+40 721 234 567', category: 'admin', sort_order: 4 },
  { id: 'em-6', asociatie_id: 'demo-asoc', label: 'Președinte comitet', phone: '+40 722 345 678', category: 'comitet', sort_order: 5 },
];

// F06 — Anunțuri vecini (locator). Expiries are kept in the future relative to
// the seeded "now" (2026-05) so the demo always shows live posts.
export const DEMO_RESIDENT_POSTS: ResidentPost[] = [
  { id: 'rp-1', asociatie_id: 'demo-asoc', author_user_id: 'u-res', author_name: 'Popescu Andrei', category: 'vand', title: 'Vând bicicletă copii 20"', body: 'Bicicletă în stare bună, folosită un sezon. 250 lei, negociabil. Sun la interfon ap. 5.', photo_path: null, expires_at: '2026-06-02T10:00:00Z', created_at: '2026-05-19T10:00:00Z' },
  { id: 'rp-2', asociatie_id: 'demo-asoc', author_user_id: 'u-res2', author_name: 'Georgescu Elena', category: 'caut', title: 'Caut o pisică pierdută (tărcată)', body: 'A fugit pisica noastră tărcată, răspunde la „Miru”. Dacă o vedeți pe casa scării, vă rog sunați la ap. 9.', photo_path: null, expires_at: '2026-05-31T08:00:00Z', created_at: '2026-05-17T08:00:00Z' },
  { id: 'rp-3', asociatie_id: 'demo-asoc', author_user_id: 'u-res3', author_name: 'Stan Gabriela', category: 'info', title: 'Vine bunica săptămâna viitoare', body: 'Posibil să se audă geamuri trântite la et. 4. Vă rog să aveți răbdare, e în vizită câteva zile.', photo_path: null, expires_at: '2026-05-30T18:00:00Z', created_at: '2026-05-16T18:00:00Z' },
];

// F07 — Întrebări frecvente (FAQ).
export const DEMO_FAQ: FaqEntry[] = [
  { id: 'faq-1', asociatie_id: 'demo-asoc', category: 'Utilități', question: 'Când vine apa caldă după întreruperi?', answer: 'După reluarea furnizării, apa caldă ajunge la etajele superioare în 20–40 de minute. Lăsați robinetul deschis până se elimină aerul din instalație.', sort_order: 0, helpful_count: 12, not_helpful_count: 1 },
  { id: 'faq-2', asociatie_id: 'demo-asoc', category: 'Contoare', question: 'Cum citesc corect contorul de apă?', answer: 'Citiți doar cifrele negre (mc), ignorând cifrele roșii (litri). Trimiteți indexul între 1 și 5 ale lunii din secțiunea „Citire contoare”.', sort_order: 1, helpful_count: 9, not_helpful_count: 0 },
  { id: 'faq-3', asociatie_id: 'demo-asoc', category: 'Plăți', question: 'Ce este fondul de rulment?', answer: 'Este o sumă de garanție pe care o depune fiecare apartament, folosită de asociație pentru a acoperi facturile până la încasarea cotelor lunare.', sort_order: 2, helpful_count: 7, not_helpful_count: 2 },
];

// F14 — Cutie de idei.
export const DEMO_IDEAS: Idea[] = [
  { id: 'idea-1', asociatie_id: 'demo-asoc', author_user_id: 'u-res', author_name: 'Popescu Andrei', title: 'Bancă nouă în fața blocului', body: 'O bancă la intrare ar ajuta vârstnicii să se odihnească. Cost estimativ 600 lei.', status: 'in_discutie', votes: 14, created_at: '2026-05-12T09:00:00Z' },
  { id: 'idea-2', asociatie_id: 'demo-asoc', author_user_id: 'u-res2', author_name: 'Georgescu Elena', title: 'Suport de biciclete la intrare', body: 'Un rastel ar elibera holul de la parter de biciclete.', status: 'aprobat', votes: 21, created_at: '2026-05-08T09:00:00Z' },
  { id: 'idea-3', asociatie_id: 'demo-asoc', author_user_id: 'u-res3', author_name: 'Stan Gabriela', title: 'Senzori de mișcare pe casa scării', body: 'Ar reduce consumul de curent la iluminatul comun.', status: 'implementat', votes: 30, created_at: '2026-04-20T09:00:00Z' },
];

// F18 — Istoric reparații.
export const DEMO_REPAIRS: RepairRecord[] = [
  { id: 'rr-1', asociatie_id: 'demo-asoc', system: 'apa', title: 'Înlocuire pompă hidrofor', description: 'Pompa principală de presiune a fost înlocuită cu un model Grundfos. Garanție 2 ani.', contractor: 'HidroServ SRL', cost: 4200, warranty_until: '2027-09-15', performed_at: '2025-09-15', created_at: '2025-09-16T10:00:00Z' },
  { id: 'rr-2', asociatie_id: 'demo-asoc', system: 'lift', title: 'Revizie generală lift + cabluri', description: 'Schimbare cabluri de tracțiune și verificare ISCIR.', contractor: 'Lift Expert', cost: 6800, warranty_until: '2026-06-10', performed_at: '2025-06-10', created_at: '2025-06-11T10:00:00Z' },
  { id: 'rr-3', asociatie_id: 'demo-asoc', system: 'electric', title: 'Refacere tablou electric parter', description: 'Înlocuire siguranțe și refacere legături în tabloul de la parter.', contractor: 'ElectroFix', cost: 1500, warranty_until: '2024-11-01', performed_at: '2023-11-01', created_at: '2023-11-02T10:00:00Z' },
];

// F20 — Citire contoare. Meters belong to the demo resident's apartment (ap-2).
export const DEMO_METERS: Meter[] = [
  { id: 'mt-1', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'apa_rece', serial: 'AR-882140', last_value: 312 },
  { id: 'mt-2', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'apa_calda', serial: 'AC-771203', last_value: 188 },
  { id: 'mt-3', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'gaz', serial: 'GZ-440019', last_value: 1043 },
];

export const DEMO_METER_READINGS: MeterReading[] = [
  { id: 'mrd-1', asociatie_id: 'demo-asoc', meter_id: 'mt-1', value: 312, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
  { id: 'mrd-2', asociatie_id: 'demo-asoc', meter_id: 'mt-2', value: 188, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
  { id: 'mrd-3', asociatie_id: 'demo-asoc', meter_id: 'mt-3', value: 1043, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
];

// F36 — Locator directory (opt-in).
export const DEMO_DIRECTORY: DirectoryEntry[] = [
  { id: 'dir-1', asociatie_id: 'demo-asoc', user_id: 'u-res', name: 'Popescu Andrei', apartment: 'Ap. 5', phone: '+40 721 111 222', email: 'andrei.popescu@example.ro', show_name: true, show_apartment: true, show_phone: true, show_email: false },
  { id: 'dir-2', asociatie_id: 'demo-asoc', user_id: 'u-res2', name: 'Georgescu Elena', apartment: 'Ap. 9', phone: '+40 722 333 444', email: 'elena.g@example.ro', show_name: true, show_apartment: true, show_phone: false, show_email: true },
  { id: 'dir-3', asociatie_id: 'demo-asoc', user_id: 'u-res3', name: 'Stan Gabriela', apartment: 'Ap. 17', phone: '+40 723 555 666', email: 'gabriela.stan@example.ro', show_name: true, show_apartment: false, show_phone: false, show_email: false },
];

// The current demo user's own directory entry (used by the consent toggles).
export const DEMO_MY_DIRECTORY: DirectoryEntry = DEMO_DIRECTORY[0];

// F38 — Carte de aur (mulțumiri).
export const DEMO_THANK_YOUS: ThankYou[] = [
  { id: 'ty-1', asociatie_id: 'demo-asoc', from_user_id: 'u-res2', from_name: 'Georgescu Elena', to_apartment: 'Ap. 13', message: 'Mulțumesc lui Andrei de la 13 care a urcat sacii cu pământ ai bunicii. Mare ajutor!', created_at: '2026-05-18T16:00:00Z' },
  { id: 'ty-2', asociatie_id: 'demo-asoc', from_user_id: 'u-res3', from_name: 'Stan Gabriela', to_apartment: 'Ap. 1', message: 'Mulțumiri doamnei Maria de la 1 pentru că a udat florile de pe casa scării toată vara.', created_at: '2026-05-10T11:00:00Z' },
];

// F15 — Sondaje de opinie. Tally is keyed by option label.
export const DEMO_SURVEYS: Survey[] = [
  { id: 'sv-1', asociatie_id: 'demo-asoc', title: 'Ce culoare să aibă noua fațadă?', options: ['Crem', 'Gri deschis', 'Teracotă'], anonymous: true, closes_at: '2026-06-15T23:59:00Z', created_at: '2026-05-14T09:00:00Z' },
  { id: 'sv-2', asociatie_id: 'demo-asoc', title: 'La ce oră preferi curățenia generală pe casa scării?', options: ['Dimineața', 'După-amiaza', 'În weekend'], anonymous: true, closes_at: null, created_at: '2026-05-10T09:00:00Z' },
];

export const DEMO_SURVEY_TALLIES: Record<string, SurveyTally> = {
  'sv-1': { Crem: 6, 'Gri deschis': 11, Teracotă: 3 },
  'sv-2': { Dimineața: 4, 'După-amiaza': 2, 'În weekend': 14 },
};

// F24 — Listă obiecte împrumutabile.
export const DEMO_LENDING_ITEMS: LendingItem[] = [
  { id: 'li-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', name: 'Bormașină Bosch', category: 'unelte', photo_path: null, available: true, created_at: '2026-05-12T09:00:00Z' },
  { id: 'li-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', name: 'Scară aluminiu 3m', category: 'unelte', photo_path: null, available: false, created_at: '2026-05-08T09:00:00Z' },
  { id: 'li-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Stan Gabriela', name: 'Set cabluri pornire auto', category: 'auto', photo_path: null, available: true, created_at: '2026-05-04T09:00:00Z' },
];

// F29 — Bicicletăria.
export const DEMO_BIKES: Bike[] = [
  { id: 'bk-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', description: 'Mountain bike negru, Cube', serial: 'CB-2291', photo_path: null, abandoned: false, created_at: '2026-04-20T09:00:00Z' },
  { id: 'bk-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', description: 'Bicicletă de oraș albă, coș împletit', serial: null, photo_path: null, abandoned: false, created_at: '2026-04-15T09:00:00Z' },
  { id: 'bk-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Necunoscut', description: 'Bicicletă copii roșie, ruginită, fără roată față', serial: null, photo_path: null, abandoned: true, created_at: '2025-11-01T09:00:00Z' },
];

// F37 — Pet directory (opt-in).
export const DEMO_PETS: Pet[] = [
  { id: 'pet-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', name: 'Rex', species: 'caine', photo_path: null, emergency_contact: '+40 721 111 222', lost: false, created_at: '2026-03-01T09:00:00Z' },
  { id: 'pet-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', name: 'Miru', species: 'pisica', photo_path: null, emergency_contact: '+40 722 333 444', lost: true, created_at: '2026-02-10T09:00:00Z' },
  { id: 'pet-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Stan Gabriela', name: 'Coco', species: 'papagal', photo_path: null, emergency_contact: null, lost: false, created_at: '2026-01-20T09:00:00Z' },
];

// F48 — Garanție tracker. Expiries straddle "now" (2026-05) so the dashboard
// shows active, expiring-soon and expired assets.
export const DEMO_WARRANTIES: Warranty[] = [
  { id: 'wr-1', asociatie_id: 'demo-asoc', asset: 'Hidrofor Grundfos', purchased_at: '2025-09-15', warranty_months: 24, expires_at: '2027-09-15', document_path: null },
  { id: 'wr-2', asociatie_id: 'demo-asoc', asset: 'Centrală termică comună', purchased_at: '2024-06-01', warranty_months: 24, expires_at: '2026-06-01', document_path: null },
  { id: 'wr-3', asociatie_id: 'demo-asoc', asset: 'Pompă circulație încălzire', purchased_at: '2022-04-01', warranty_months: 24, expires_at: '2024-04-01', document_path: null },
];

// F54 — Vizitatori / străini observați.
export const DEMO_VISITOR_REPORTS: VisitorReport[] = [
  { id: 'vr-1', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', reporter_name: 'Popescu Andrei', note: 'Persoană necunoscută a sunat la mai multe interfoane, ora 21:30. Spunea că e curier dar nu avea colete.', photo_path: null, status: 'nou', created_at: '2026-05-20T21:35:00Z' },
  { id: 'vr-2', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res2', reporter_name: 'Georgescu Elena', note: 'Mașină parcată în fața intrării toată ziua, fără localnic cunoscut.', photo_path: null, status: 'cunoscut', created_at: '2026-05-18T14:00:00Z' },
];

// F57 — Marketplace intern. Expiries kept ahead of the seeded "now".
export const DEMO_MARKETPLACE: MarketplaceListing[] = [
  { id: 'ml-1', asociatie_id: 'demo-asoc', seller_user_id: 'u-res', seller_name: 'Popescu Andrei', category: 'mobilă', title: 'Canapea extensibilă 3 locuri', description: 'Stare foarte bună, gri, ridicare din ap. 5. Preț negociabil.', price: 600, photo_path: null, expires_at: '2026-06-03T09:00:00Z', created_at: '2026-05-20T09:00:00Z' },
  { id: 'ml-2', asociatie_id: 'demo-asoc', seller_user_id: 'u-res2', seller_name: 'Georgescu Elena', category: 'electrocasnice', title: 'Mașină de spălat Arctic', description: 'Funcțională, 6 kg, o donez pentru ridicare.', price: 0, photo_path: null, expires_at: '2026-05-31T09:00:00Z', created_at: '2026-05-17T09:00:00Z' },
  { id: 'ml-3', asociatie_id: 'demo-asoc', seller_user_id: 'u-res3', seller_name: 'Stan Gabriela', category: 'copii', title: 'Haine copii 2-3 ani (lot)', description: 'Lot de ~20 piese, fete, stare bună.', price: 80, photo_path: null, expires_at: '2026-05-30T09:00:00Z', created_at: '2026-05-16T09:00:00Z' },
];

// F40 — Glosar de termeni.
export const DEMO_GLOSSARY: GlossaryEntry[] = [
  { id: 'gl-1', asociatie_id: 'demo-asoc', term: 'Cotă-parte indiviză', definition: 'Procentul din proprietatea comună (scări, acoperiș, fațadă) care revine fiecărui apartament, calculat de regulă în funcție de suprafața utilă. Determină ponderea la votul ponderat și la repartizarea unor cheltuieli.' },
  { id: 'gl-2', asociatie_id: 'demo-asoc', term: 'Fond de rulment', definition: 'Sumă de garanție depusă de fiecare apartament, folosită de asociație pentru a plăti facturile curente până la încasarea cotelor de întreținere.' },
  { id: 'gl-3', asociatie_id: 'demo-asoc', term: 'Fond de reparații', definition: 'Sumă acumulată lunar pentru lucrări majore viitoare (acoperiș, fațadă, instalații). Se constituie prin hotărâre a Adunării Generale.' },
  { id: 'gl-4', asociatie_id: 'demo-asoc', term: 'Cenzor', definition: 'Persoana sau firma care verifică gestiunea financiară a asociației și prezintă un raport Adunării Generale.' },
  { id: 'gl-5', asociatie_id: 'demo-asoc', term: 'Comitet executiv', definition: 'Organul ales de proprietari care administrează curent asociația între Adunările Generale, format din președinte și membri.' },
];
