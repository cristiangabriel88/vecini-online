-- vecini.online — development seed data (realistic Romanian sample).
-- Loaded only via `npx supabase db seed` / `DEV_LOAD_SEED=true`. Not for prod.

insert into asociatii (id, name, slug, address, cui, registration_number, branding)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Asociația de Proprietari Bloc 12, Scara A',
  'bloc-12-scara-a',
  'Str. Aleea Teilor nr. 12, Sector 4, București',
  '12345678', '4521/2019',
  '{"primary_color":"#2563eb","welcome_message":"Bine ai venit în comunitatea blocului nostru!"}'
);

-- Recommended starter feature set enabled.
insert into asociatie_features (asociatie_id, feature_key, enabled)
select '00000000-0000-0000-0000-0000000000a1', key, true
from unnest(array['F01','F03','F08','F09','F17','F19','F20','F33','F36','F56']) as key;

insert into apartments (asociatie_id, scara, etaj, numar_apartament, suprafata_utila, cota_parte_indiviza, numar_persoane, proprietar_principal_name)
values
  ('00000000-0000-0000-0000-0000000000a1','A',0,'1',54.2,0.041,2,'Ionescu Maria'),
  ('00000000-0000-0000-0000-0000000000a1','A',1,'5',63.8,0.048,3,'Popescu Andrei'),
  ('00000000-0000-0000-0000-0000000000a1','A',2,'9',71.0,0.054,4,'Georgescu Elena'),
  ('00000000-0000-0000-0000-0000000000a1','A',3,'13',54.2,0.041,1,'Dumitrescu Vasile'),
  ('00000000-0000-0000-0000-0000000000a1','A',4,'17',63.8,0.048,2,'Stan Gabriela');

insert into announcements (asociatie_id, title, body_html, category, published_at)
values
  ('00000000-0000-0000-0000-0000000000a1','Întrerupere apă caldă — 25 mai',
   '<p>Se va întrerupe apa caldă <strong>mâine între 09:00 și 14:00</strong> pentru lucrări la centrala termică.</p>',
   'important', now()),
  ('00000000-0000-0000-0000-0000000000a1','Adunarea Generală anuală — 5 iunie, ora 18:00',
   '<p>Vă invităm la Adunarea Generală anuală în holul de la parter.</p>', 'eveniment', now());

insert into polls (id, asociatie_id, title, description, poll_type, quorum_percent, majority_rule, opens_at, closes_at, published_at)
values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1',
  'Înlocuirea interfonului audio cu unul video',
  'Cost estimat: 12.500 lei din fondul de reparații.', 'yes_no', 50, 'simple', now(), now() + interval '9 days', now());
insert into poll_options (poll_id, label, sort_order) values
  ('00000000-0000-0000-0000-0000000000b1','Pentru',0),
  ('00000000-0000-0000-0000-0000000000b1','Contra',1),
  ('00000000-0000-0000-0000-0000000000b1','Abținere',2);

insert into events (asociatie_id, title, description, location, category, starts_at, ends_at)
values
  ('00000000-0000-0000-0000-0000000000a1','Adunarea Generală anuală','Discutarea bugetului și a lucrărilor de anvelopare.','Holul de la parter','AGA', now() + interval '15 days', now() + interval '15 days' + interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000a1','Deratizare programată','Firma autorizată va efectua deratizarea spațiilor comune.','Subsol și spații comune','mentenanță', now() + interval '7 days', now() + interval '7 days' + interval '3 hours');

insert into emergency_contacts (asociatie_id, label, phone, category, sort_order)
values
  ('00000000-0000-0000-0000-0000000000a1','Urgențe (SNUAU)','112','general',0),
  ('00000000-0000-0000-0000-0000000000a1','Dispecerat lift','+40 21 555 0123','lift',1),
  ('00000000-0000-0000-0000-0000000000a1','Avarii apă (dispecerat local)','+40 21 555 0456','apa',2),
  ('00000000-0000-0000-0000-0000000000a1','Avarii gaz (Distrigaz)','+40 800 800 928','gaz',3),
  ('00000000-0000-0000-0000-0000000000a1','Administrator','+40 721 234 567','admin',4);
