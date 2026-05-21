import type {
  Announcement,
  Apartment,
  Asociatie,
  BuildingEvent,
  EmergencyContact,
  Poll,
  PollOption,
  Ticket,
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
