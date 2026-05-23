/**
 * Long-form legal copy for the public policy pages (Privacy, Terms, Cookies).
 *
 * Kept here as structured bilingual content rather than in the i18n JSON: legal
 * prose is long, paragraph-structured and edited as a block, so a typed content
 * module is clearer and safer than hand-maintained arrays inside translation
 * files. The UI chrome around it (titles, buttons, the consent banner) stays in
 * i18n. See DECISIONS.md. This is informational template text for a Romanian
 * asociație de proprietari; an association should have it reviewed before going
 * live with real residents.
 */

export type Lang = 'ro' | 'en';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const LAST_UPDATED = '2026-05-22';

const updatedLabel = (lang: Lang) =>
  lang === 'ro' ? `Ultima actualizare: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED}`;

export function privacyPolicy(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Privacy Policy',
      updated: updatedLabel('en'),
      intro:
        'This policy explains how personal data is processed in vecini.online, the digital platform used by your homeowners association. It is written to meet Regulation (EU) 2016/679 (GDPR) and Romanian Law no. 190/2018.',
      sections: [
        {
          heading: 'Who is the data controller',
          paragraphs: [
            'Your homeowners association (asociația de proprietari) is the data controller for the personal data of its residents. It decides why and how that data is processed in order to run the building in line with Law no. 196/2018.',
            'vecini.online acts as a data processor (persoană împuternicită) under article 28 GDPR, processing data only on the documented instructions of the association under a data processing agreement.',
          ],
        },
        {
          heading: 'What data we process',
          paragraphs: [
            'Identification and contact data: name, apartment, stairwell and floor, e-mail, phone number.',
            'Building life data: meter readings, tickets and their photos, votes and assembly attendance, bookings, documents you upload, and messages you send through the platform.',
            'Optional data you choose to share: directory entries, car plate, date of birth for birthdays, pets, and any custom profile fields. These are processed only with your consent and only shown to the extent you allow.',
            'Technical data: session and authentication tokens, language and theme preferences, and, if you consent, analytics about how the app is used.',
          ],
        },
        {
          heading: 'Why we process it and on what legal basis',
          paragraphs: [
            'Performance of the relationship with the association and the building services it provides (art. 6(1)(b)).',
            'Compliance with the association’s legal obligations, in particular Law no. 196/2018 on homeowners associations (art. 6(1)(c)).',
            'Legitimate interests in keeping the building safe and well run, such as security alerts and audit logging (art. 6(1)(f)).',
            'Your consent for everything optional: non-essential cookies, optional notifications, the resident directory, birthdays and other opt-in features (art. 6(1)(a)). You can withdraw consent at any time without affecting prior processing.',
          ],
        },
        {
          heading: 'Who can see your data',
          paragraphs: [
            'Access is strictly limited by role and by association: residents see their association only, optional fields appear to neighbours only with your consent, and committee or administrator roles see what is needed to run the building.',
            'We do not sell personal data. Data may be shared with service providers that help operate the platform (hosting, e-mail and messaging delivery) strictly as processors, and with authorities where the law requires it.',
          ],
        },
        {
          heading: 'Where data is stored and for how long',
          paragraphs: [
            'Data is hosted on infrastructure within the European Union / European Economic Area. We do not transfer personal data outside the EEA without appropriate safeguards.',
            'Data is kept only as long as needed for the purpose, then deleted or anonymised. Records the association must keep by law (for example votes and financial decisions) are retained for the legally required period even after an account is deleted.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            'You have the right of access, rectification, erasure, restriction of processing, data portability, and objection, and the right to withdraw consent at any time (articles 15–22 GDPR).',
            'You can exercise most of these directly in the app (export and account deletion) or by contacting the association or the platform at the addresses below.',
            'You also have the right to lodge a complaint with the Romanian supervisory authority: Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, anspdcp@dataprotection.ro.',
          ],
        },
        {
          heading: 'Security',
          paragraphs: [
            'Access is protected by authentication and row-level security that isolates each association’s data. Stored content is sanitised against malicious code, and sensitive actions are logged. No system is perfectly secure, but we apply measures appropriate to the risk.',
          ],
        },
        {
          heading: 'Children',
          paragraphs: [
            'The platform is intended for adult residents. We do not collect data that identifies a child: information about children (for example age ranges for activities) is processed only in aggregate — counts per age group — and never identifies an individual child. This rule is enforced technically in our systems, not merely stated.',
            'Should any future feature ever need to process a minor’s identifying data, it would be handled only with the consent of a parent or legal representative, in line with art. 8 of Regulation (EU) 2016/679 (GDPR) and art. 8 of Law no. 190/2018.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'For privacy questions contact your association administrator through the in-app messaging, or write to the platform at privacy@vecini.online.',
          ],
        },
      ],
    };
  }
  return {
    title: 'Politica de confidențialitate',
    updated: updatedLabel('ro'),
    intro:
      'Această politică explică modul în care sunt prelucrate datele cu caracter personal în vecini.online, platforma digitală folosită de asociația ta de proprietari. Este redactată pentru a respecta Regulamentul (UE) 2016/679 (GDPR) și Legea nr. 190/2018.',
    sections: [
      {
        heading: 'Cine este operatorul de date',
        paragraphs: [
          'Asociația ta de proprietari este operatorul datelor cu caracter personal ale locatarilor. Ea stabilește de ce și cum sunt prelucrate aceste date pentru administrarea blocului, conform Legii nr. 196/2018.',
          'vecini.online acționează ca persoană împuternicită de operator (procesator) în sensul articolului 28 din GDPR și prelucrează datele numai pe baza instrucțiunilor documentate ale asociației, printr-un acord de prelucrare a datelor.',
        ],
      },
      {
        heading: 'Ce date prelucrăm',
        paragraphs: [
          'Date de identificare și de contact: nume, apartament, scară și etaj, e-mail, număr de telefon.',
          'Date despre viața blocului: indexuri contoare, sesizări și fotografiile lor, voturi și prezența la adunări, rezervări, documente încărcate și mesajele trimise prin platformă.',
          'Date opționale pe care alegi să le partajezi: prezența în agendă, numărul mașinii, data nașterii pentru aniversări, animalele de companie și orice câmpuri personalizate de profil. Acestea sunt prelucrate numai cu consimțământul tău și afișate doar în limita pe care o permiți.',
          'Date tehnice: token-uri de sesiune și autentificare, preferințele de limbă și temă și, dacă îți dai acordul, statistici despre modul de utilizare a aplicației.',
        ],
      },
      {
        heading: 'De ce le prelucrăm și în ce temei',
        paragraphs: [
          'Pentru derularea relației cu asociația și a serviciilor de administrare a blocului (art. 6 alin. (1) lit. b).',
          'Pentru respectarea obligațiilor legale ale asociației, în special Legea nr. 196/2018 privind asociațiile de proprietari (art. 6 alin. (1) lit. c).',
          'În interesul legitim de a menține blocul în siguranță și bine administrat, precum alertele de urgență și jurnalul de audit (art. 6 alin. (1) lit. f).',
          'Pe baza consimțământului tău pentru tot ce este opțional: module cookie neesențiale, notificări opționale, agenda locatarilor, aniversările și alte funcții cu înscriere voluntară (art. 6 alin. (1) lit. a). Îți poți retrage consimțământul oricând, fără a afecta prelucrările anterioare.',
        ],
      },
      {
        heading: 'Cine îți poate vedea datele',
        paragraphs: [
          'Accesul este strict limitat după rol și după asociație: locatarii văd doar asociația lor, câmpurile opționale apar vecinilor numai cu acordul tău, iar rolurile de comitet sau administrator văd ce este necesar pentru administrarea blocului.',
          'Nu vindem date cu caracter personal. Datele pot fi partajate cu furnizori care ajută la funcționarea platformei (găzduire, livrare de e-mail și mesaje) strict în calitate de persoane împuternicite, și cu autoritățile atunci când legea o cere.',
        ],
      },
      {
        heading: 'Unde sunt stocate datele și pentru cât timp',
        paragraphs: [
          'Datele sunt găzduite pe infrastructură din Uniunea Europeană / Spațiul Economic European. Nu transferăm date în afara SEE fără garanții adecvate.',
          'Datele sunt păstrate doar cât este necesar pentru scop, apoi sunt șterse sau anonimizate. Înregistrările pe care asociația trebuie să le păstreze prin lege (de exemplu voturi și decizii financiare) se păstrează pe durata cerută legal, chiar și după ștergerea contului.',
        ],
      },
      {
        heading: 'Drepturile tale',
        paragraphs: [
          'Ai dreptul de acces, de rectificare, de ștergere, de restricționare a prelucrării, de portabilitate a datelor și de opoziție, precum și dreptul de a-ți retrage consimțământul oricând (articolele 15–22 din GDPR).',
          'Poți exercita majoritatea direct în aplicație (export și ștergerea contului) sau contactând asociația ori platforma la adresele de mai jos.',
          'Ai și dreptul de a depune o plângere la autoritatea de supraveghere din România: Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, anspdcp@dataprotection.ro.',
        ],
      },
      {
        heading: 'Securitate',
        paragraphs: [
          'Accesul este protejat prin autentificare și prin securitate la nivel de rând care izolează datele fiecărei asociații. Conținutul stocat este curățat de cod malițios, iar acțiunile sensibile sunt înregistrate. Niciun sistem nu este perfect sigur, dar aplicăm măsuri adecvate riscului.',
        ],
      },
      {
        heading: 'Minori',
        paragraphs: [
          'Platforma este destinată locatarilor adulți. Nu colectăm date care identifică un copil: informațiile despre copii (de exemplu intervalele de vârstă pentru activități) sunt prelucrate doar agregat — numere pe grupe de vârstă — și nu identifică niciodată un copil anume. Această regulă este aplicată tehnic în sistemele noastre, nu doar declarată.',
          'Dacă vreo funcționalitate viitoare ar avea nevoie să prelucreze date care identifică un minor, acestea ar fi gestionate doar cu consimțământul unui părinte sau reprezentant legal, în acord cu art. 8 din Regulamentul (UE) 2016/679 (GDPR) și art. 8 din Legea nr. 190/2018.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Pentru întrebări legate de confidențialitate, contactează administratorul asociației prin mesageria din aplicație sau scrie platformei la privacy@vecini.online.',
        ],
      },
    ],
  };
}

export function termsOfService(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Terms and Conditions',
      updated: updatedLabel('en'),
      intro:
        'These terms govern your use of vecini.online. By using the platform you agree to them. The service is provided to homeowners associations and their residents in Romania.',
      sections: [
        {
          heading: 'The service',
          paragraphs: [
            'vecini.online is a platform that helps a homeowners association communicate and manage building life: announcements, votes and assemblies, tickets, documents, bookings and community features. The association decides which features are enabled.',
          ],
        },
        {
          heading: 'Accounts and eligibility',
          paragraphs: [
            'You must be a resident, owner or authorised member of an association that uses the platform. You are responsible for keeping your credentials safe and for activity under your account.',
          ],
        },
        {
          heading: 'Acceptable use',
          paragraphs: [
            'Use the platform lawfully and respectfully. Do not post unlawful, defamatory or harassing content, do not upload others’ personal data without a basis, and do not attempt to access data outside your association or disrupt the service.',
          ],
        },
        {
          heading: 'Content you provide',
          paragraphs: [
            'You keep your rights in what you post and grant the association and the platform the limited right to display and store it as needed to run the service. You are responsible for the lawfulness of what you upload.',
          ],
        },
        {
          heading: 'Roles and responsibility',
          paragraphs: [
            'The association is the data controller and is responsible for its decisions; vecini.online provides the tooling as a processor. The platform is provided as is, and to the extent permitted by law we are not liable for indirect or consequential loss.',
          ],
        },
        {
          heading: 'Governing law and disputes',
          paragraphs: [
            'These terms are governed by Romanian law. Consumer residents may use the National Authority for Consumer Protection (ANPC) and the EU Online Dispute Resolution platform at ec.europa.eu/consumers/odr. Disputes that cannot be resolved amicably fall under the competent Romanian courts.',
          ],
        },
        {
          heading: 'Consumer rights',
          paragraphs: [
            'If you pay for the service as a consumer, you also have the protections of Romanian and EU consumer law: clear pre-contractual information, a 14-day right of withdrawal for distance contracts, refunds where it applies, and access to the National Authority for Consumer Protection (ANPC) and the EU online dispute resolution platform.',
            'These are set out in full on our Consumer Protection Information page, available from the legal links in the footer and the privacy settings.',
          ],
        },
        {
          heading: 'Changes',
          paragraphs: [
            'We may update these terms; material changes are announced in the app. Continued use after a change means you accept the updated terms.',
          ],
        },
      ],
    };
  }
  return {
    title: 'Termeni și condiții',
    updated: updatedLabel('ro'),
    intro:
      'Acești termeni reglementează utilizarea vecini.online. Prin folosirea platformei ești de acord cu ei. Serviciul este oferit asociațiilor de proprietari și locatarilor acestora din România.',
    sections: [
      {
        heading: 'Serviciul',
        paragraphs: [
          'vecini.online este o platformă care ajută asociația de proprietari să comunice și să administreze viața blocului: anunțuri, voturi și adunări, sesizări, documente, rezervări și funcții comunitare. Asociația decide ce funcții sunt active.',
        ],
      },
      {
        heading: 'Conturi și eligibilitate',
        paragraphs: [
          'Trebuie să fii locatar, proprietar sau membru autorizat al unei asociații care folosește platforma. Ești responsabil pentru păstrarea în siguranță a datelor de autentificare și pentru activitatea din contul tău.',
        ],
      },
      {
        heading: 'Utilizare acceptabilă',
        paragraphs: [
          'Folosește platforma legal și respectuos. Nu publica conținut ilegal, defăimător sau de hărțuire, nu încărca date personale ale altora fără un temei și nu încerca să accesezi date din afara asociației tale ori să perturbi serviciul.',
        ],
      },
      {
        heading: 'Conținutul pe care îl oferi',
        paragraphs: [
          'Îți păstrezi drepturile asupra a ceea ce publici și acorzi asociației și platformei dreptul limitat de a-l afișa și stoca, cât este necesar pentru funcționarea serviciului. Ești responsabil pentru legalitatea a ceea ce încarci.',
        ],
      },
      {
        heading: 'Roluri și răspundere',
        paragraphs: [
          'Asociația este operatorul de date și răspunde pentru deciziile sale; vecini.online oferă instrumentele în calitate de persoană împuternicită. Platforma este oferită „ca atare”, iar în limita permisă de lege nu răspundem pentru prejudicii indirecte sau pe cale de consecință.',
        ],
      },
      {
        heading: 'Legea aplicabilă și litigiile',
        paragraphs: [
          'Acești termeni sunt guvernați de legea română. Locatarii consumatori pot apela la Autoritatea Națională pentru Protecția Consumatorilor (ANPC) și la platforma europeană de soluționare online a litigiilor (SOL) de la ec.europa.eu/consumers/odr. Litigiile care nu pot fi rezolvate amiabil sunt de competența instanțelor române.',
        ],
      },
      {
        heading: 'Drepturile consumatorilor',
        paragraphs: [
          'Dacă plătești serviciul în calitate de consumator, beneficiezi și de protecția legislației române și europene privind consumatorii: informare precontractuală clară, dreptul de retragere în 14 zile pentru contractele la distanță, rambursare acolo unde se aplică și acces la Autoritatea Națională pentru Protecția Consumatorilor (ANPC) și la platforma europeană de soluționare online a litigiilor.',
          'Acestea sunt detaliate complet în pagina Informații pentru protecția consumatorilor, accesibilă din linkurile legale din subsol și din setările de confidențialitate.',
        ],
      },
      {
        heading: 'Modificări',
        paragraphs: [
          'Putem actualiza acești termeni; modificările importante sunt anunțate în aplicație. Continuarea utilizării după o modificare înseamnă că accepți termenii actualizați.',
        ],
      },
    ],
  };
}

export function consumerRights(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Consumer Protection Information',
      updated: updatedLabel('en'),
      intro:
        'When a resident or association takes a paid plan of vecini.online at a distance, the contract is governed by Romanian and EU consumer-protection law. This page sets out the mandatory pre-contractual information, your right of withdrawal, refunds, and how to resolve a complaint, including the National Authority for Consumer Protection (ANPC) and the EU online dispute resolution platform.',
      sections: [
        {
          heading: 'Who provides the service',
          paragraphs: [
            'vecini.online is operated as a software-as-a-service platform for homeowners associations in Romania. The provider can be reached at support@vecini.online for any question about a plan, an order or this information.',
            'Your homeowners association remains the data controller for residents’ personal data; this page concerns the consumer relationship for any paid plan, separate from how data is processed (see the Privacy Policy).',
          ],
        },
        {
          heading: 'Pre-contractual information',
          paragraphs: [
            'Before you are bound by any paid plan, you receive, in Romanian and in clear language, the main characteristics of the service, the identity and contact details of the provider, the total price including taxes, the billing period and the duration, the conditions for renewal and cancellation, and the accepted means of payment.',
            'This information is provided on a durable medium (in the app and by e-mail) before the order is confirmed, in line with Government Emergency Ordinance no. 34/2014 on consumer rights in distance and off-premises contracts (transposing Directive 2011/83/EU).',
          ],
        },
        {
          heading: 'Right of withdrawal (14 days)',
          paragraphs: [
            'As a consumer who concludes a distance contract, you have the right to withdraw within 14 days, without giving any reason and without penalty, under OUG no. 34/2014.',
            'To withdraw, send a clear statement of your decision (for example by e-mail to support@vecini.online) before the 14-day period ends. It is enough that you send the statement before the deadline.',
            'If you asked for the service to start during the withdrawal period, you may owe an amount proportionate to what was provided up to the moment you withdraw. Where the service is fully performed with your prior express consent and your acknowledgement that you lose the right of withdrawal once it is fully performed, the right no longer applies.',
          ],
        },
        {
          heading: 'Refunds',
          paragraphs: [
            'Where the right of withdrawal applies, we reimburse all payments received from you within 14 days of being informed of your decision, using the same means of payment you used, unless you expressly agree otherwise; you are not charged any fee for the reimbursement.',
            'We may withhold an amount proportionate to the service already provided at your request before you withdrew.',
          ],
        },
        {
          heading: 'Complaints and the ANPC',
          paragraphs: [
            'Please first contact your association administrator through the in-app messaging, or the provider at support@vecini.online. We aim to resolve complaints promptly.',
            'If a complaint is not resolved, you may address the Autoritatea Națională pentru Protecția Consumatorilor (ANPC): B-dul Aviatorilor nr. 72, Sector 1, 011865 București; website www.anpc.ro, where the online complaint form is available.',
          ],
        },
        {
          heading: 'Online and alternative dispute resolution (SOL / SAL)',
          paragraphs: [
            'For disputes arising from an online contract you may use the European Online Dispute Resolution (ODR) platform at ec.europa.eu/consumers/odr.',
            'You may also turn to an alternative dispute resolution (SAL) body under Government Ordinance no. 38/2015, including the ANPC’s SAL structure. Recourse to these procedures does not remove your right to bring the matter before the competent Romanian courts.',
          ],
        },
        {
          heading: 'Getting help',
          paragraphs: [
            'For any question about your rights as a consumer, message your association administrator in the app or write to the provider at support@vecini.online.',
          ],
        },
      ],
    };
  }
  return {
    title: 'Informații pentru protecția consumatorilor',
    updated: updatedLabel('ro'),
    intro:
      'Când un locatar sau o asociație contractează la distanță un plan plătit al vecini.online, contractul este guvernat de legislația română și europeană privind protecția consumatorilor. Această pagină prezintă informațiile precontractuale obligatorii, dreptul de retragere, rambursarea și modul de soluționare a unei reclamații, inclusiv Autoritatea Națională pentru Protecția Consumatorilor (ANPC) și platforma europeană de soluționare online a litigiilor.',
    sections: [
      {
        heading: 'Cine oferă serviciul',
        paragraphs: [
          'vecini.online este o platformă de tip software-as-a-service pentru asociațiile de proprietari din România. Furnizorul poate fi contactat la support@vecini.online pentru orice întrebare legată de un plan, o comandă sau aceste informații.',
          'Asociația ta de proprietari rămâne operatorul datelor cu caracter personal ale locatarilor; această pagină privește relația de consum pentru orice plan plătit, separat de modul în care sunt prelucrate datele (vezi Politica de confidențialitate).',
        ],
      },
      {
        heading: 'Informare precontractuală',
        paragraphs: [
          'Înainte de a fi obligat printr-un plan plătit, primești, în limba română și într-un limbaj clar, principalele caracteristici ale serviciului, identitatea și datele de contact ale furnizorului, prețul total cu taxe incluse, perioada de facturare și durata, condițiile de reînnoire și de încetare, precum și mijloacele de plată acceptate.',
          'Aceste informații sunt furnizate pe un suport durabil (în aplicație și prin e-mail) înainte de confirmarea comenzii, conform Ordonanței de urgență a Guvernului nr. 34/2014 privind drepturile consumatorilor în contractele la distanță și în afara spațiilor comerciale (transpune Directiva 2011/83/UE).',
        ],
      },
      {
        heading: 'Dreptul de retragere (14 zile)',
        paragraphs: [
          'În calitate de consumator care încheie un contract la distanță, ai dreptul de a te retrage în termen de 14 zile, fără a fi nevoit să justifici decizia și fără penalități, conform OUG nr. 34/2014.',
          'Pentru a te retrage, trimite o declarație clară a deciziei tale (de exemplu prin e-mail la support@vecini.online) înainte de expirarea termenului de 14 zile. Este suficient să trimiți declarația înainte de termen.',
          'Dacă ai cerut ca serviciul să înceapă în perioada de retragere, este posibil să datorezi o sumă proporțională cu ceea ce a fost prestat până în momentul retragerii. Atunci când serviciul este executat integral cu acordul tău expres prealabil și cu recunoașterea faptului că pierzi dreptul de retragere odată ce este executat integral, dreptul nu se mai aplică.',
        ],
      },
      {
        heading: 'Rambursare',
        paragraphs: [
          'Acolo unde se aplică dreptul de retragere, îți rambursăm toate plățile primite în termen de 14 zile de la informarea cu privire la decizia ta, folosind același mijloc de plată pe care l-ai folosit, cu excepția cazului în care ești de acord altfel; nu îți percepem niciun comision pentru rambursare.',
          'Putem reține o sumă proporțională cu serviciul deja prestat la cererea ta înainte de retragere.',
        ],
      },
      {
        heading: 'Reclamații și ANPC',
        paragraphs: [
          'Te rugăm să contactezi mai întâi administratorul asociației prin mesageria din aplicație sau furnizorul la support@vecini.online. Urmărim soluționarea promptă a reclamațiilor.',
          'Dacă o reclamație nu este soluționată, te poți adresa Autorității Naționale pentru Protecția Consumatorilor (ANPC): B-dul Aviatorilor nr. 72, Sector 1, 011865 București; website www.anpc.ro, unde este disponibil formularul de reclamație online.',
        ],
      },
      {
        heading: 'Soluționarea online și alternativă a litigiilor (SOL / SAL)',
        paragraphs: [
          'Pentru litigiile rezultate dintr-un contract online poți folosi platforma europeană de soluționare online a litigiilor (SOL) de la ec.europa.eu/consumers/odr.',
          'Te poți adresa și unei entități de soluționare alternativă a litigiilor (SAL) conform Ordonanței Guvernului nr. 38/2015, inclusiv structurii SAL din cadrul ANPC. Recurgerea la aceste proceduri nu îți înlătură dreptul de a sesiza instanțele române competente.',
        ],
      },
      {
        heading: 'Cum ceri ajutor',
        paragraphs: [
          'Pentru orice întrebare despre drepturile tale de consumator, scrie administratorului asociației în aplicație sau furnizorului la support@vecini.online.',
        ],
      },
    ],
  };
}

export function cookiePolicy(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Cookie Policy',
      updated: updatedLabel('en'),
      intro:
        'vecini.online uses cookies and local storage. Non-essential ones are used only with your consent, which you can change at any time from the privacy settings.',
      sections: [
        {
          heading: 'Strictly necessary',
          paragraphs: [
            'Required for the app to work: authentication and session, security, and basic preferences such as language and theme. These cannot be turned off and do not require consent.',
          ],
        },
        {
          heading: 'Preferences',
          paragraphs: [
            'Remember optional choices such as your customised home layout and routine community notifications. Used only with your consent.',
          ],
        },
        {
          heading: 'Analytics',
          paragraphs: [
            'Help us understand, in aggregate, how the app is used so we can improve it. Used only with your consent and never to identify you personally.',
          ],
        },
        {
          heading: 'Marketing',
          paragraphs: [
            'Used for optional platform news and tips. Off by default and only enabled with your consent.',
          ],
        },
        {
          heading: 'Managing your choices',
          paragraphs: [
            'Open the cookie banner or the privacy settings in the app to accept all, reject non-essential, or choose per category. Withdrawing consent does not affect processing already carried out.',
          ],
        },
      ],
    };
  }
  return {
    title: 'Politica privind modulele cookie',
    updated: updatedLabel('ro'),
    intro:
      'vecini.online folosește module cookie și stocare locală. Cele neesențiale sunt folosite numai cu consimțământul tău, pe care îl poți schimba oricând din setările de confidențialitate.',
    sections: [
      {
        heading: 'Strict necesare',
        paragraphs: [
          'Necesare pentru funcționarea aplicației: autentificare și sesiune, securitate și preferințe de bază precum limba și tema. Acestea nu pot fi dezactivate și nu necesită consimțământ.',
        ],
      },
      {
        heading: 'Preferințe',
        paragraphs: [
          'Rețin alegeri opționale, precum aranjarea personalizată a ecranului principal și notificările comunitare uzuale. Folosite numai cu consimțământul tău.',
        ],
      },
      {
        heading: 'Statistici',
        paragraphs: [
          'Ne ajută să înțelegem, în mod agregat, cum este folosită aplicația, ca să o îmbunătățim. Folosite numai cu consimțământul tău și niciodată pentru a te identifica personal.',
        ],
      },
      {
        heading: 'Marketing',
        paragraphs: [
          'Folosite pentru noutăți și sfaturi opționale despre platformă. Dezactivate implicit și activate doar cu consimțământul tău.',
        ],
      },
      {
        heading: 'Gestionarea alegerilor',
        paragraphs: [
          'Deschide bannerul de cookie-uri sau setările de confidențialitate din aplicație pentru a accepta tot, a respinge ce nu este esențial sau a alege pe categorii. Retragerea consimțământului nu afectează prelucrările deja efectuate.',
        ],
      },
    ],
  };
}
