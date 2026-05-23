import type { Lang, LegalDoc } from '@/features/legal/legalContent';
import {
  authorityDeadline,
  requiresSubjectNotification,
  type BreachNature,
  type BreachRecord,
} from './breachLogic';

/**
 * Breach-notification content (T22, GDPR art. 33/34).
 *
 * Generates the two notifications a controller may have to produce from a
 * recorded breach: the notification to the supervisory authority (ANSPDCP,
 * art. 33(3)) and, on a high risk, the communication to the affected residents
 * (art. 34(2)). Also exposes the documented breach-handling procedure as
 * structured bilingual content (like `dpaContent.ts` / `legalContent.ts`); the
 * full reference copy lives in `BREACH_PROCEDURE.md`.
 *
 * All generators are deterministic and backend-free so they are unit-testable
 * and work offline. The text is signature/submission-ready plain text — no PDF
 * engine in the client bundle (consistent with the AGA proces-verbal, T13).
 */

const ANSPDCP = {
  ro: 'Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)',
  en: 'the National Supervisory Authority for Personal Data Processing (ANSPDCP)',
} as const;

const NATURE_LABEL: Record<Lang, Record<BreachNature, string>> = {
  ro: {
    confidentiality: 'confidențialitate (divulgare neautorizată)',
    integrity: 'integritate (alterare neautorizată)',
    availability: 'disponibilitate (pierderea accesului)',
  },
  en: {
    confidentiality: 'confidentiality (unauthorised disclosure)',
    integrity: 'integrity (unauthorised alteration)',
    availability: 'availability (loss of access)',
  },
};

function natureList(lang: Lang, nature: BreachNature[]): string {
  return nature.map((n) => NATURE_LABEL[lang][n]).join(', ');
}

function controllerOrDefault(lang: Lang, controllerName: string): string {
  return controllerName.trim() || (lang === 'ro' ? 'Asociația de proprietari' : 'The homeowners association');
}

/**
 * The notification to the supervisory authority, art. 33(3): nature of the
 * breach and categories/approximate number of subjects and records; contact
 * point; likely consequences; measures taken or proposed.
 */
export function authorityNotification(lang: Lang, r: BreachRecord, controllerName: string): string {
  const controller = controllerOrDefault(lang, controllerName);
  const deadline = authorityDeadline(r.discovered_at);

  if (lang === 'en') {
    return [
      `PERSONAL DATA BREACH NOTIFICATION — Article 33 GDPR`,
      `To: ${ANSPDCP.en}`,
      ``,
      `Controller: ${controller}`,
      `Contact point: the association's committee / administrator (controller)`,
      `Processor: vecini.online`,
      ``,
      `1. Nature of the breach`,
      `   ${r.title}`,
      `   ${r.description}`,
      `   Type(s): ${natureList('en', r.nature)}`,
      `   Became aware: ${r.discovered_at}`,
      r.occurred_at ? `   Occurred: ${r.occurred_at}` : `   Occurred: unknown`,
      `   72-hour notification deadline: ${deadline}`,
      ``,
      `2. Categories and approximate number of data subjects and records`,
      `   Approximate number of data subjects affected: ${r.affected_count}`,
      `   Data categories: ${r.data_categories.join(', ') || 'see description'}`,
      ``,
      `3. Likely consequences`,
      `   ${r.consequences || 'See assessment.'}`,
      ``,
      `4. Measures taken or proposed`,
      `   ${r.measures || 'See assessment.'}`,
      ``,
      requiresSubjectNotification(r.risk)
        ? `5. The risk is assessed as HIGH; the affected data subjects are being informed under article 34.`
        : `5. The risk to the rights and freedoms of the data subjects is assessed as not high; article 34 communication to data subjects is not required.`,
    ].join('\n');
  }

  return [
    `NOTIFICARE PRIVIND ÎNCĂLCAREA SECURITĂȚII DATELOR — Articolul 33 GDPR`,
    `Către: ${ANSPDCP.ro}`,
    ``,
    `Operator: ${controller}`,
    `Punct de contact: comitetul / administratorul asociației (operatorul)`,
    `Persoană împuternicită: vecini.online`,
    ``,
    `1. Natura încălcării`,
    `   ${r.title}`,
    `   ${r.description}`,
    `   Tip(uri): ${natureList('ro', r.nature)}`,
    `   Luare la cunoștință: ${r.discovered_at}`,
    r.occurred_at ? `   Producere: ${r.occurred_at}` : `   Producere: necunoscută`,
    `   Termen de notificare de 72 de ore: ${deadline}`,
    ``,
    `2. Categoriile și numărul aproximativ de persoane vizate și de înregistrări`,
    `   Număr aproximativ de persoane vizate afectate: ${r.affected_count}`,
    `   Categorii de date: ${r.data_categories.join(', ') || 'a se vedea descrierea'}`,
    ``,
    `3. Consecințele probabile`,
    `   ${r.consequences || 'A se vedea evaluarea.'}`,
    ``,
    `4. Măsurile luate sau propuse`,
    `   ${r.measures || 'A se vedea evaluarea.'}`,
    ``,
    requiresSubjectNotification(r.risk)
      ? `5. Riscul este evaluat ca RIDICAT; persoanele vizate afectate sunt informate conform articolului 34.`
      : `5. Riscul pentru drepturile și libertățile persoanelor vizate nu este evaluat ca ridicat; comunicarea către persoanele vizate prevăzută la articolul 34 nu este necesară.`,
  ].join('\n');
}

/**
 * The communication to the affected residents, art. 34(2): clear and plain
 * language describing the nature of the breach, the contact point, the likely
 * consequences and the measures taken.
 */
export function subjectNotice(lang: Lang, r: BreachRecord, controllerName: string): string {
  const controller = controllerOrDefault(lang, controllerName);

  if (lang === 'en') {
    return [
      `NOTICE TO RESIDENTS — personal data breach`,
      ``,
      `Dear resident,`,
      ``,
      `${controller}, as data controller, informs you of a personal data breach that may concern your data, in accordance with article 34 GDPR.`,
      ``,
      `What happened: ${r.title}`,
      `${r.description}`,
      ``,
      `Likely consequences: ${r.consequences || 'We are assessing the impact and will update you.'}`,
      ``,
      `What we are doing: ${r.measures || 'We have taken measures to contain the breach and prevent recurrence.'}`,
      ``,
      `What you can do: stay alert to unexpected messages, do not share access codes, and contact the committee / administrator with any questions.`,
      ``,
      `Contact: the association's committee / administrator.`,
    ].join('\n');
  }

  return [
    `INFORMARE CĂTRE LOCATARI — încălcarea securității datelor personale`,
    ``,
    `Stimate locatar,`,
    ``,
    `${controller}, în calitate de operator de date, vă informează despre o încălcare a securității datelor cu caracter personal care v-ar putea privi datele, conform articolului 34 GDPR.`,
    ``,
    `Ce s-a întâmplat: ${r.title}`,
    `${r.description}`,
    ``,
    `Consecințe probabile: ${r.consequences || 'Evaluăm impactul și vă vom informa cu detalii suplimentare.'}`,
    ``,
    `Ce facem: ${r.measures || 'Am luat măsuri pentru limitarea incidentului și prevenirea repetării lui.'}`,
    ``,
    `Ce puteți face: fiți atenți la mesaje neașteptate, nu comunicați coduri de acces și adresați-vă comitetului / administratorului pentru orice întrebare.`,
    ``,
    `Contact: comitetul / administratorul asociației.`,
  ].join('\n');
}

/** Documented breach-handling procedure shown in-app (full copy in BREACH_PROCEDURE.md). */
export function breachProcedure(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Personal data breach procedure',
      updated: 'Articles 33 & 34 GDPR',
      intro:
        'Steps the association (controller) follows when a personal data breach is suspected or confirmed. The 72-hour clock starts the moment the controller becomes aware.',
      sections: [
        {
          heading: '1. Detect and contain',
          paragraphs: [
            'Record the breach here as soon as it is suspected, with what happened, when you became aware and which data may be involved.',
            'Take immediate measures to contain it (revoke access, reset credentials, restore from backup).',
          ],
        },
        {
          heading: '2. Assess the risk',
          paragraphs: [
            'Classify the risk to residents from the data involved, its sensitivity and volume, and whether individuals can be identified.',
            'If the data was unintelligible (e.g. encrypted) the risk may be neutralised.',
          ],
        },
        {
          heading: '3. Notify the authority (within 72 hours)',
          paragraphs: [
            'Unless the breach is unlikely to result in a risk, notify ANSPDCP within 72 hours of becoming aware, using the generated article 33 notification.',
            'If you cannot notify within 72 hours, the notification must state the reasons for the delay.',
          ],
        },
        {
          heading: '4. Inform the residents (high risk)',
          paragraphs: [
            'Where the breach is likely to result in a high risk to residents, inform them without undue delay using the generated article 34 notice, in clear and plain language.',
          ],
        },
        {
          heading: '5. Document everything',
          paragraphs: [
            'Every breach is logged here, including those that did not require notification, so the association can demonstrate compliance (art. 33(5)). The log is append-only.',
          ],
        },
      ],
    };
  }

  return {
    title: 'Procedura în caz de încălcare a securității datelor',
    updated: 'Articolele 33 și 34 GDPR',
    intro:
      'Pașii pe care asociația (operatorul) îi urmează atunci când se suspectează sau se confirmă o încălcare a securității datelor personale. Termenul de 72 de ore începe în momentul în care operatorul ia cunoștință.',
    sections: [
      {
        heading: '1. Detectare și limitare',
        paragraphs: [
          'Înregistrează incidentul aici de îndată ce este suspectat, cu ce s-a întâmplat, când ai luat la cunoștință și ce date pot fi implicate.',
          'Ia măsuri imediate de limitare (revocă accesul, resetează parolele, restaurează din copia de rezervă).',
        ],
      },
      {
        heading: '2. Evaluarea riscului',
        paragraphs: [
          'Clasifică riscul pentru locatari în funcție de datele implicate, de sensibilitatea și volumul lor și de posibilitatea identificării persoanelor.',
          'Dacă datele erau neinteligibile (de exemplu criptate), riscul poate fi neutralizat.',
        ],
      },
      {
        heading: '3. Notificarea autorității (în 72 de ore)',
        paragraphs: [
          'Cu excepția cazului în care încălcarea este puțin probabil să genereze un risc, notifică ANSPDCP în 72 de ore de la luarea la cunoștință, folosind notificarea generată conform articolului 33.',
          'Dacă notificarea nu se poate face în 72 de ore, aceasta trebuie să includă motivele întârzierii.',
        ],
      },
      {
        heading: '4. Informarea locatarilor (risc ridicat)',
        paragraphs: [
          'Atunci când încălcarea este susceptibilă să genereze un risc ridicat pentru locatari, informează-i fără întârzieri nejustificate, folosind informarea generată conform articolului 34, într-un limbaj clar și simplu.',
        ],
      },
      {
        heading: '5. Documentează totul',
        paragraphs: [
          'Fiecare incident este înregistrat aici, inclusiv cele care nu au necesitat notificare, pentru ca asociația să poată demonstra conformitatea (art. 33 alin. (5)). Jurnalul este de tip „doar adăugare”.',
        ],
      },
    ],
  };
}
