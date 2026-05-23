import type { Lang, LegalDoc } from './legalContent';

/**
 * Data Processing Agreement template (GDPR art. 28).
 *
 * The asociația de proprietari is the **controller** and vecini.online is the
 * **processor**. Art. 28 requires this relationship to be governed by a contract
 * setting out the subject-matter, duration, nature and purpose of the
 * processing, the categories of data and data subjects, and the processor's
 * obligations. This is an informational template surface for the asociație; it
 * should be reviewed before being relied on with real residents. The controller
 * name is interpolated so the asociație sees its own agreement.
 *
 * Kept as structured bilingual content (like `legalContent.ts`) rather than in
 * the i18n JSON: legal prose is long and paragraph-structured. See DECISIONS.md.
 */

const LAST_UPDATED = '2026-05-23';

const updatedLabel = (lang: Lang) =>
  lang === 'ro' ? `Ultima actualizare: ${LAST_UPDATED}` : `Last updated: ${LAST_UPDATED}`;

/** Build the DPA template for the given language and controller (asociație) name. */
export function dpaTemplate(lang: Lang, controllerName: string): LegalDoc {
  const controller = controllerName.trim() || (lang === 'ro' ? 'Asociația de proprietari' : 'The homeowners association');

  if (lang === 'en') {
    return {
      title: 'Data Processing Agreement',
      updated: updatedLabel('en'),
      intro: `This agreement governs the processing of personal data by vecini.online (the "Processor") on behalf of ${controller} (the "Controller"), under article 28 of Regulation (EU) 2016/679 (GDPR). It is a template to be reviewed and adopted by the association.`,
      sections: [
        {
          heading: '1. Parties and roles',
          paragraphs: [
            `The Controller is ${controller}, the homeowners association that decides the purposes and means of processing in order to run the building under Law no. 196/2018.`,
            'The Processor is vecini.online, which processes personal data only on the documented instructions of the Controller and does not determine the purposes of the processing.',
          ],
        },
        {
          heading: '2. Subject-matter and duration',
          paragraphs: [
            'The subject-matter is the personal data of the association’s residents processed through the enabled features of the platform.',
            'This agreement lasts for as long as the Processor provides the service to the Controller and is terminated when the association stops using the platform.',
          ],
        },
        {
          heading: '3. Nature and purpose of processing',
          paragraphs: [
            'The nature of the processing is collection, storage, organisation, display and deletion of data within the platform. The purpose is to operate the communication, governance, maintenance and community features the association has enabled.',
            'The detailed, per-feature record of processing activities (article 30) is generated for the association and available alongside this agreement.',
          ],
        },
        {
          heading: '4. Categories of data and data subjects',
          paragraphs: [
            'Data subjects: residents, owners and tenants of the association, and committee or administrator roles.',
            'Categories of data: identification and contact data, apartment data, content the residents submit, optional opt-in data, and technical/usage data, as detailed in the record of processing activities.',
          ],
        },
        {
          heading: '5. Obligations of the Processor (art. 28(3))',
          paragraphs: [
            'Process personal data only on the Controller’s documented instructions, including for transfers, unless required by law.',
            'Ensure persons authorised to process the data are bound by confidentiality.',
            'Implement appropriate technical and organisational security measures (art. 32), including row-level isolation per association, authentication, input sanitisation and audit logging.',
            'Engage another processor (sub-processor) only with the Controller’s authorisation and under equivalent obligations.',
            'Assist the Controller, taking into account the nature of the processing, in responding to data-subject rights requests and in meeting its obligations under articles 32 to 36.',
            'Notify the Controller without undue delay after becoming aware of a personal-data breach.',
            'At the Controller’s choice, delete or return all personal data at the end of the service and delete existing copies, unless retention is required by law.',
            'Make available the information necessary to demonstrate compliance and allow for and contribute to audits.',
          ],
        },
        {
          heading: '6. Sub-processors',
          paragraphs: [
            'The Processor uses infrastructure and delivery sub-processors (hosting, e-mail and messaging) strictly to provide the service. A current list is made available on request, and the Controller is informed of intended changes so it may object.',
          ],
        },
        {
          heading: '7. International transfers',
          paragraphs: [
            'Personal data is hosted within the European Union / European Economic Area. No transfer outside the EEA is made without an appropriate safeguard under Chapter V GDPR.',
          ],
        },
        {
          heading: '8. Data-subject rights and breaches',
          paragraphs: [
            'The platform provides self-service export and an erasure-request workflow so the Controller can meet articles 15 to 22, and a breach-recording tool to support the article 33/34 notification duties.',
          ],
        },
        {
          heading: '9. Return and deletion on termination',
          paragraphs: [
            'On termination the Controller may export all data; the Processor then deletes it, except records the association must retain by law (for example votes and financial decisions), which are kept for the legally required period and then deleted.',
          ],
        },
      ],
    };
  }

  return {
    title: 'Acord de prelucrare a datelor',
    updated: updatedLabel('ro'),
    intro: `Acest acord reglementează prelucrarea datelor cu caracter personal de către vecini.online („Persoana împuternicită”) în numele ${controller} („Operatorul”), în temeiul articolului 28 din Regulamentul (UE) 2016/679 (GDPR). Este un model care urmează să fie revizuit și adoptat de asociație.`,
    sections: [
      {
        heading: '1. Părțile și rolurile',
        paragraphs: [
          `Operatorul este ${controller}, asociația de proprietari care stabilește scopurile și mijloacele prelucrării pentru administrarea blocului, conform Legii nr. 196/2018.`,
          'Persoana împuternicită este vecini.online, care prelucrează datele cu caracter personal numai pe baza instrucțiunilor documentate ale Operatorului și nu stabilește scopurile prelucrării.',
        ],
      },
      {
        heading: '2. Obiectul și durata',
        paragraphs: [
          'Obiectul îl constituie datele cu caracter personal ale locatarilor asociației, prelucrate prin funcțiile active ale platformei.',
          'Acordul durează cât timp Persoana împuternicită furnizează serviciul Operatorului și încetează la momentul la care asociația nu mai folosește platforma.',
        ],
      },
      {
        heading: '3. Natura și scopul prelucrării',
        paragraphs: [
          'Natura prelucrării constă în colectarea, stocarea, organizarea, afișarea și ștergerea datelor în cadrul platformei. Scopul este operarea funcțiilor de comunicare, guvernanță, mentenanță și comunitate pe care asociația le-a activat.',
          'Registrul detaliat al activităților de prelucrare (articolul 30), pe fiecare funcție, este generat pentru asociație și disponibil alături de acest acord.',
        ],
      },
      {
        heading: '4. Categoriile de date și persoanele vizate',
        paragraphs: [
          'Persoane vizate: locatarii, proprietarii și chiriașii asociației, precum și rolurile de comitet sau administrator.',
          'Categorii de date: date de identificare și de contact, date despre apartament, conținutul trimis de locatari, date opționale cu înscriere voluntară și date tehnice/de utilizare, detaliate în registrul activităților de prelucrare.',
        ],
      },
      {
        heading: '5. Obligațiile Persoanei împuternicite (art. 28 alin. (3))',
        paragraphs: [
          'Prelucrează datele numai pe baza instrucțiunilor documentate ale Operatorului, inclusiv pentru transferuri, cu excepția cazului în care legea o cere.',
          'Se asigură că persoanele autorizate să prelucreze datele s-au angajat să respecte confidențialitatea.',
          'Implementează măsuri tehnice și organizatorice de securitate adecvate (art. 32), inclusiv izolarea la nivel de rând pe fiecare asociație, autentificarea, curățarea conținutului și jurnalizarea acțiunilor.',
          'Recurge la o altă persoană împuternicită (subcontractant) numai cu autorizarea Operatorului și sub obligații echivalente.',
          'Sprijină Operatorul, ținând seama de natura prelucrării, în soluționarea cererilor privind drepturile persoanelor vizate și în îndeplinirea obligațiilor prevăzute la articolele 32-36.',
          'Notifică Operatorul fără întârzieri nejustificate după ce ia cunoștință de o încălcare a securității datelor.',
          'La alegerea Operatorului, șterge sau returnează toate datele la încetarea serviciului și șterge copiile existente, cu excepția cazului în care legea impune păstrarea.',
          'Pune la dispoziție informațiile necesare pentru a demonstra conformitatea și permite și contribuie la audituri.',
        ],
      },
      {
        heading: '6. Subcontractanți',
        paragraphs: [
          'Persoana împuternicită folosește subcontractanți de infrastructură și de livrare (găzduire, e-mail și mesagerie) strict pentru furnizarea serviciului. O listă actualizată este pusă la dispoziție la cerere, iar Operatorul este informat despre modificările intenționate, pentru a putea obiecta.',
        ],
      },
      {
        heading: '7. Transferuri internaționale',
        paragraphs: [
          'Datele cu caracter personal sunt găzduite în Uniunea Europeană / Spațiul Economic European. Niciun transfer în afara SEE nu se face fără o garanție adecvată în temeiul Capitolului V din GDPR.',
        ],
      },
      {
        heading: '8. Drepturile persoanelor vizate și incidentele',
        paragraphs: [
          'Platforma oferă export în regim de autoservire și un flux de cereri de ștergere, astfel încât Operatorul să respecte articolele 15-22, precum și un instrument de înregistrare a incidentelor pentru a sprijini obligațiile de notificare de la articolele 33/34.',
        ],
      },
      {
        heading: '9. Returnarea și ștergerea la încetare',
        paragraphs: [
          'La încetare, Operatorul poate exporta toate datele; Persoana împuternicită le șterge apoi, cu excepția înregistrărilor pe care asociația trebuie să le păstreze prin lege (de exemplu voturi și decizii financiare), care se păstrează pe durata cerută legal și apoi se șterg.',
        ],
      },
    ],
  };
}

/** Flatten the DPA document to plain text for download (signature-ready). */
export function dpaToText(doc: LegalDoc): string {
  const lines: string[] = [doc.title, doc.updated, '', doc.intro, ''];
  for (const section of doc.sections) {
    lines.push(section.heading);
    for (const p of section.paragraphs) lines.push(`  - ${p}`);
    lines.push('');
  }
  return lines.join('\n');
}
