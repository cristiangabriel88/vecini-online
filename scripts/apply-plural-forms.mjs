import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const roPath = resolve(__dirname, '../src/shared/locales/ro.json');
const enPath = resolve(__dirname, '../src/shared/locales/en.json');

const ro = JSON.parse(readFileSync(roPath, 'utf8'));
const en = JSON.parse(readFileSync(enPath, 'utf8'));

function set(obj, p, v) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = v;
}
function del(obj, p) {
  const parts = p.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) return;
    cur = cur[parts[i]];
  }
  delete cur[parts[parts.length - 1]];
}

// [roKey, {one,few,other}, enKey, {one,other}]
const conversions = [
  ['features.requestCount',
    {one:'{{count}} locatar', few:'{{count}} locatari', other:'{{count}} de locatari'},
    'features.requestCount',
    {one:'{{count}} resident', other:'{{count}} residents'}],
  ['announcements.deletedBulk',
    {one:'1 anunț șters.', few:'{{count}} anunțuri șterse.', other:'{{count}} de anunțuri șterse.'},
    'announcements.deletedBulk',
    {one:'1 announcement deleted.', other:'{{count}} announcements deleted.'}],
  ['announcements.deleteBulkTitle',
    {one:'Ștergi 1 anunț?', few:'Ștergi {{count}} anunțuri?', other:'Ștergi {{count}} de anunțuri?'},
    'announcements.deleteBulkTitle',
    {one:'Delete 1 announcement?', other:'Delete {{count}} announcements?'}],
  ['announcements.deleteBulkConfirm',
    {one:'Ștergi definitiv 1 anunț? Acțiunea nu poate fi anulată.', few:'Ștergi definitiv {{count}} anunțuri? Acțiunea nu poate fi anulată.', other:'Ștergi definitiv {{count}} de anunțuri? Acțiunea nu poate fi anulată.'},
    'announcements.deleteBulkConfirm',
    {one:'Permanently delete 1 announcement? This action cannot be undone.', other:'Permanently delete {{count}} announcements? This action cannot be undone.'}],
  ['announcements.deleteSelected',
    {one:'Șterge {{count}} selectat', few:'Șterge {{count}} selectate', other:'Șterge {{count}} de selectate'},
    'announcements.deleteSelected',
    {one:'Delete {{count}} selected', other:'Delete {{count}} selected'}],
  ['polls.votesCount',
    {one:'{{count}} vot', few:'{{count}} voturi', other:'{{count}} de voturi'},
    'polls.votesCount',
    {one:'{{count}} vote', other:'{{count}} votes'}],
  ['notifications.unreadCount',
    {one:'{{count}} necitit', few:'{{count}} necitite', other:'{{count}} necitite'},
    'notifications.unreadCount',
    {one:'{{count}} unread', other:'{{count}} unread'}],
  ['notifications.minutesAgo',
    {one:'acum {{count}} min', few:'acum {{count}} min', other:'acum {{count}} min'},
    'notifications.minutesAgo',
    {one:'{{count}} min ago', other:'{{count}} min ago'}],
  ['notifications.hoursAgo',
    {one:'acum {{count}} oră', few:'acum {{count}} ore', other:'acum {{count}} de ore'},
    'notifications.hoursAgo',
    {one:'{{count}} hr ago', other:'{{count}} hr ago'}],
  ['notifications.daysAgo',
    {one:'acum {{count}} zi', few:'acum {{count}} zile', other:'acum {{count}} de zile'},
    'notifications.daysAgo',
    {one:'{{count}} day ago', other:'{{count}} days ago'}],
  ['events.rsvpCount',
    {one:'{{count}} participant', few:'{{count}} participanți', other:'{{count}} de participanți'},
    'events.rsvpCount',
    {one:'{{count}} attending', other:'{{count}} attending'}],
  ['locator.expiresIn',
    {one:'Expiră în {{count}} zi', few:'Expiră în {{count}} zile', other:'Expiră în {{count}} de zile'},
    'locator.expiresIn',
    {one:'Expires in {{count}} day', other:'Expires in {{count}} days'}],
  ['surveys.responses',
    {one:'{{count}} răspuns', few:'{{count}} răspunsuri', other:'{{count}} de răspunsuri'},
    'surveys.responses',
    {one:'{{count}} response', other:'{{count}} responses'}],
  ['warranties.months',
    {one:'{{count}} lună garanție', few:'{{count}} luni garanție', other:'{{count}} de luni garanție'},
    'warranties.months',
    {one:'{{count}} month warranty', other:'{{count}} months warranty'}],
  ['alerts.sent',
    {one:'Alertă trimisă la {{count}} persoană.', few:'Alertă trimisă la {{count}} persoane.', other:'Alertă trimisă la {{count}} de persoane.'},
    'alerts.sent',
    {one:'Alert sent to {{count}} person.', other:'Alert sent to {{count}} people.'}],
  ['alerts.recipients',
    {one:'Această alertă va ajunge la {{count}} locatar.', few:'Această alertă va ajunge la {{count}} locatari.', other:'Această alertă va ajunge la {{count}} de locatari.'},
    'alerts.recipients',
    {one:'This alert will reach {{count}} resident.', other:'This alert will reach {{count}} residents.'}],
  ['apartments.personsTotal',
    {one:'{{count}} în total', few:'{{count}} în total', other:'{{count}} în total'},
    'apartments.personsTotal',
    {one:'{{count}} total', other:'{{count}} total'}],
  ['apartments.deleteSelected',
    {one:'Șterge selectate ({{count}})', few:'Șterge selectate ({{count}})', other:'Șterge selectate ({{count}})'},
    'apartments.deleteSelected',
    {one:'Delete selected ({{count}})', other:'Delete selected ({{count}})'}],
  ['apartments.codesGenerated',
    {one:'{{count}} cod generat (ex: {{code}})', few:'{{count}} coduri generate (ex: {{code}})', other:'{{count}} de coduri generate (ex: {{code}})'},
    'apartments.codesGenerated',
    {one:'{{count}} code generated (e.g. {{code}})', other:'{{count}} codes generated (e.g. {{code}})'}],
  ['apartments.generateInvitesConfirm',
    {one:'Trimite {{count}} invitație', few:'Trimite {{count}} invitații', other:'Trimite {{count}} de invitații'},
    'apartments.generateInvitesConfirm',
    {one:'Send {{count}} invitation', other:'Send {{count}} invitations'}],
  ['apartment.votesCast',
    {one:'Ai votat la {{count}} din {{total}} propuneri.', few:'Ai votat la {{count}} din {{total}} propuneri.', other:'Ai votat la {{count}} din {{total}} propuneri.'},
    'apartment.votesCast',
    {one:'You voted on {{count}} of {{total}} proposals.', other:'You voted on {{count}} of {{total}} proposals.'}],
  ['suppliers.alertSummary',
    {one:'{{count}} contract expirat sau care expiră în curând.', few:'{{count}} contracte expirate sau care expiră în curând.', other:'{{count}} de contracte expirate sau care expiră în curând.'},
    'suppliers.alertSummary',
    {one:'{{count}} contract expired or expiring soon.', other:'{{count}} contracts expired or expiring soon.'}],
  ['anonymous.pendingBanner',
    {one:'{{count}} mesaj așteaptă răspunsul comitetului.', few:'{{count}} mesaje așteaptă răspunsul comitetului.', other:'{{count}} de mesaje așteaptă răspunsul comitetului.'},
    'anonymous.pendingBanner',
    {one:'{{count}} message is awaiting a committee response.', other:'{{count}} messages are awaiting a committee response.'}],
  ['green.freeBanner',
    {one:'{{count}} sarcină caută încă un voluntar.', few:'{{count}} sarcini caută încă un voluntar.', other:'{{count}} de sarcini caută încă un voluntar.'},
    'green.freeBanner',
    {one:'{{count}} task still needs a volunteer.', other:'{{count}} tasks still need a volunteer.'}],
  ['contractors.stars',
    {one:'{{count}} stea', few:'{{count}} stele', other:'{{count}} de stele'},
    'contractors.stars',
    {one:'{{count}} star', other:'{{count}} stars'}],
  ['alarm.attentionBanner',
    {one:'{{count}} sistem necesită atenție (defect sau test depășit).', few:'{{count}} sisteme necesită atenție (defecte sau test depășit).', other:'{{count}} de sisteme necesită atenție (defecte sau test depășit).'},
    'alarm.attentionBanner',
    {one:'{{count}} system needs attention (faulty or overdue test).', other:'{{count}} systems need attention (faulty or overdue test).'}],
  ['discussions.messageCount',
    {one:'{{count}} mesaj', few:'{{count}} mesaje', other:'{{count}} de mesaje'},
    'discussions.messageCount',
    {one:'{{count}} message', other:'{{count}} messages'}],
  ['discussions.deleteBulkTitle',
    {one:'Ștergi {{count}} subiect?', few:'Ștergi {{count}} subiecte?', other:'Ștergi {{count}} de subiecte?'},
    'discussions.deleteBulkTitle',
    {one:'Delete {{count}} thread?', other:'Delete {{count}} threads?'}],
  ['discussions.deleteBulkConfirm',
    {one:'Ștergi definitiv {{count}} subiect și toate mesajele lui? Acțiunea nu poate fi anulată.', few:'Ștergi definitiv {{count}} subiecte și toate mesajele lor? Acțiunea nu poate fi anulată.', other:'Ștergi definitiv {{count}} de subiecte și toate mesajele lor? Acțiunea nu poate fi anulată.'},
    'discussions.deleteBulkConfirm',
    {one:'Permanently delete {{count}} thread and all its messages? This action cannot be undone.', other:'Permanently delete {{count}} threads and all their messages? This action cannot be undone.'}],
  ['discussions.deleteSelected',
    {one:'Șterge {{count}} selectat', few:'Șterge {{count}} selectate', other:'Șterge {{count}} de selectate'},
    'discussions.deleteSelected',
    {one:'Delete {{count}} selected', other:'Delete {{count}} selected'}],
  ['budget.voteCount',
    {one:'{{count}} vot', few:'{{count}} voturi', other:'{{count}} de voturi'},
    'budget.voteCount',
    {one:'{{count}} vote', other:'{{count}} votes'}],
  ['priorities.turnout',
    {one:'{{count}} apartament a votat', few:'{{count}} apartamente au votat', other:'{{count}} de apartamente au votat'},
    'priorities.turnout',
    {one:'{{count}} apartment ranked', other:'{{count}} apartments ranked'}],
  ['adminChat.messageCount',
    {one:'{{count}} mesaj', few:'{{count}} mesaje', other:'{{count}} de mesaje'},
    'adminChat.messageCount',
    {one:'{{count}} message', other:'{{count}} messages'}],
  ['adminChat.waiting',
    {one:'așteaptă răspuns de {{count}}h', few:'așteaptă răspuns de {{count}}h', other:'așteaptă răspuns de {{count}}h'},
    'adminChat.waiting',
    {one:'awaiting reply for {{count}}h', other:'awaiting reply for {{count}}h'}],
  ['adminChat.deleteBulkTitle',
    {one:'Ștergi {{count}} conversație?', few:'Ștergi {{count}} conversații?', other:'Ștergi {{count}} de conversații?'},
    'adminChat.deleteBulkTitle',
    {one:'Delete {{count}} conversation?', other:'Delete {{count}} conversations?'}],
  ['adminChat.deleteBulkConfirm',
    {one:'Ștergi definitiv {{count}} conversație? Acțiunea nu poate fi anulată.', few:'Ștergi definitiv {{count}} conversații? Acțiunea nu poate fi anulată.', other:'Ștergi definitiv {{count}} de conversații? Acțiunea nu poate fi anulată.'},
    'adminChat.deleteBulkConfirm',
    {one:'Permanently delete {{count}} conversation? This action cannot be undone.', other:'Permanently delete {{count}} conversations? This action cannot be undone.'}],
  ['adminChat.deleteSelected',
    {one:'Șterge {{count}} selectat', few:'Șterge {{count}} selectate', other:'Șterge {{count}} de selectate'},
    'adminChat.deleteSelected',
    {one:'Delete {{count}} selected', other:'Delete {{count}} selected'}],
  ['kids.totalKids',
    {one:'{{count}} copil în total în bloc', few:'{{count}} copii în total în bloc', other:'{{count}} de copii în total în bloc'},
    'kids.totalKids',
    {one:'{{count}} child in the building in total', other:'{{count}} children in the building in total'}],
  ['kids.going',
    {one:'{{count}} participant', few:'{{count}} participanți', other:'{{count}} de participanți'},
    'kids.going',
    {one:'{{count}} attending', other:'{{count}} attending'}],
  ['evacuation.petCount',
    {one:'{{count}} apartament cu animale', few:'{{count}} apartamente cu animale', other:'{{count}} de apartamente cu animale'},
    'evacuation.petCount',
    {one:'{{count}} apartment with pets', other:'{{count}} apartments with pets'}],
  ['gdpr.pendingBadge',
    {one:'{{count}} în așteptare', few:'{{count}} în așteptare', other:'{{count}} în așteptare'},
    'gdpr.pendingBadge',
    {one:'{{count}} pending', other:'{{count}} pending'}],
  ['breach.affected',
    {one:'{{count}} persoană afectată', few:'{{count}} persoane afectate', other:'{{count}} de persoane afectate'},
    'breach.affected',
    {one:'{{count}} person affected', other:'{{count}} people affected'}],
  ['audit.count',
    {one:'{{count}} înregistrare', few:'{{count}} înregistrări', other:'{{count}} de înregistrări'},
    'audit.count',
    {one:'{{count}} entry', other:'{{count}} entries'}],
  ['platform.home.overview.activeCount',
    {one:'{{count}} activă', few:'{{count}} active', other:'{{count}} active'},
    'platform.home.overview.activeCount',
    {one:'{{count}} active', other:'{{count}} active'}],
  ['platform.home.overview.moderateCount',
    {one:'{{count}} moderată', few:'{{count}} moderate', other:'{{count}} moderate'},
    'platform.home.overview.moderateCount',
    {one:'{{count}} moderate', other:'{{count}} moderate'}],
  ['platform.home.overview.dormantCount',
    {one:'{{count}} inactivă', few:'{{count}} inactive', other:'{{count}} inactive'},
    'platform.home.overview.dormantCount',
    {one:'{{count}} dormant', other:'{{count}} dormant'}],
  ['platform.home.overview.suspendedCount',
    {one:'{{count}} suspendată', few:'{{count}} suspendate', other:'{{count}} suspendate'},
    'platform.home.overview.suspendedCount',
    {one:'{{count}} suspended', other:'{{count}} suspended'}],
  ['platform.home.overview.overdueSubLabel',
    {one:'{{count}} restantă', few:'{{count}} restante', other:'{{count}} restante'},
    'platform.home.overview.overdueSubLabel',
    {one:'{{count}} overdue', other:'{{count}} overdue'}],
  ['platform.home.overview.unansweredSubLabel',
    {one:'{{count}} fără răspuns', few:'{{count}} fără răspuns', other:'{{count}} fără răspuns'},
    'platform.home.overview.unansweredSubLabel',
    {one:'{{count}} awaiting reply', other:'{{count}} awaiting reply'}],
  ['platform.subscriptions.activeCount',
    {one:'{{count}} activă', few:'{{count}} active', other:'{{count}} active'},
    'platform.subscriptions.activeCount',
    {one:'{{count}} active', other:'{{count}} active'}],
  ['platform.subscriptions.trialingCount',
    {one:'{{count}} probă', few:'{{count}} probă', other:'{{count}} de probă'},
    'platform.subscriptions.trialingCount',
    {one:'{{count}} trialing', other:'{{count}} trialing'}],
  ['platform.subscriptions.pastDueCount',
    {one:'{{count}} restantă', few:'{{count}} restante', other:'{{count}} restante'},
    'platform.subscriptions.pastDueCount',
    {one:'{{count}} past due', other:'{{count}} past due'}],
  ['platform.subscriptions.unpaidCount',
    {one:'{{count}} blocată', few:'{{count}} blocate', other:'{{count}} blocate'},
    'platform.subscriptions.unpaidCount',
    {one:'{{count}} blocked', other:'{{count}} blocked'}],
  ['platform.subscriptions.canceledCount',
    {one:'{{count}} anulată', few:'{{count}} anulate', other:'{{count}} anulate'},
    'platform.subscriptions.canceledCount',
    {one:'{{count}} canceled', other:'{{count}} canceled'}],
  ['platform.messenger.messageCount',
    {one:'{{count}} mesaj', few:'{{count}} mesaje', other:'{{count}} de mesaje'},
    'platform.messenger.messageCount',
    {one:'{{count}} message', other:'{{count}} messages'}],
  ['support.messageCount',
    {one:'{{count}} mesaj', few:'{{count}} mesaje', other:'{{count}} de mesaje'},
    'support.messageCount',
    {one:'{{count}} message', other:'{{count}} messages'}],
];

// Apply conversions
for (const [roKey, roForms, enKey, enForms] of conversions) {
  set(ro, `${roKey}_one`, roForms.one);
  set(ro, `${roKey}_few`, roForms.few);
  set(ro, `${roKey}_other`, roForms.other);
  del(ro, roKey);

  set(en, `${enKey}_one`, enForms.one);
  set(en, `${enKey}_other`, enForms.other);
  del(en, enKey);
}

// Fix 3 missing _few in RO
set(ro, 'apartments.generateInvitesEligible_few', '{{count}} apartamente eligibile');
set(ro, 'apartments.generateInvitesSent_few', 'Trimise {{count}} invitații');
set(ro, 'apartments.generateInvitesFailed_few', '{{count}} invitații nu s-au putut trimite');

// Remove the stale bare priorities.turnout base key (already handled in conversions above)

writeFileSync(roPath, JSON.stringify(ro, null, 2) + '\n', 'utf8');
writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log(`Applied ${conversions.length} conversions + 3 missing _few fixes.`);

// Verify: count remaining non-plural count keys
function flatten(obj, p = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flatten(v, key));
    else acc[key] = v;
    return acc;
  }, {});
}
const suffixes = ['_one', '_few', '_other', '_zero', '_many', '_two'];
const isPl = k => suffixes.some(s => k.endsWith(s));
const ro2 = JSON.parse(readFileSync(roPath, 'utf8'));
const en2 = JSON.parse(readFileSync(enPath, 'utf8'));
const roBad = Object.entries(flatten(ro2)).filter(([k, v]) => !isPl(k) && String(v).includes('{{count}}'));
const enBad = Object.entries(flatten(en2)).filter(([k, v]) => !isPl(k) && String(v).includes('{{count}}'));
console.log(`Remaining non-plural count keys: RO=${roBad.length} EN=${enBad.length}`);
if (roBad.length) roBad.forEach(([k, v]) => console.log('  RO:', k, '=', v));
if (enBad.length) enBad.forEach(([k, v]) => console.log('  EN:', k, '=', v));
