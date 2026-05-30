/**
 * Bilingual accessibility statement content for vecini.online.
 *
 * Structured as a LegalDoc so it renders through the shared LegalDocPage chrome.
 * Targets WCAG 2.1 Level AA / EN 301 549 v3 conformance.
 * Update the "prepared on" date and the known-limitations list when a new audit
 * cycle runs (at most annually).
 */

import type { LegalDoc, Lang } from './legalContent';

const PREPARED_DATE = '2026-05-30';
const REVIEW_DATE = '2027-05-30';

export function accessibilityStatement(lang: Lang): LegalDoc {
  if (lang === 'en') {
    return {
      title: 'Accessibility Statement',
      updated: `Prepared on ${PREPARED_DATE}. Next review by ${REVIEW_DATE}.`,
      intro:
        'vecini.online is committed to making its digital platform accessible to all residents, including people with disabilities. This statement explains the current accessibility status, known limitations, and how to report barriers or request assistance.',
      sections: [
        {
          heading: 'Conformance target',
          paragraphs: [
            'vecini.online aims to conform to the Web Content Accessibility Guidelines (WCAG) version 2.1, Level AA, and to the European standard EN 301 549 v3.2.1 "Accessibility requirements for ICT products and services". These standards define how digital content should be designed to be accessible to people with visual, auditory, motor and cognitive disabilities.',
            'Conformance status: this application is partially conformant with WCAG 2.1 Level AA. Partial conformance means that some parts of the content do not yet fully conform to the standard, as described below.',
          ],
        },
        {
          heading: 'Measures taken',
          paragraphs: [
            'Keyboard navigation: all interactive controls, forms and dialogs are operable using a keyboard alone. Modal dialogs trap focus while open and restore it to the trigger element on close. A visible skip link is the first element in the page, allowing keyboard users to jump past navigation directly to the main content.',
            'Screen-reader support: interactive elements carry ARIA roles, states and properties. Error messages are associated with their input fields via aria-describedby. Buttons show an aria-busy state while loading. Status messages use ARIA live regions where appropriate.',
            'Visual design: text meets the 4.5:1 contrast ratio requirement (Level AA) in both light and dark themes. The interface is fully responsive and remains usable at 400% zoom. Text can be resized without loss of content or functionality.',
            'Bilingual interface: all user-visible text is available in Romanian and English via the in-app language toggle.',
            'Testing: accessibility is checked at every development cycle using automated tooling and manual keyboard-and-screen-reader review. Issues found are prioritised and tracked.',
          ],
        },
        {
          heading: 'Known limitations',
          paragraphs: [
            'Complex data tables (for example in meter readings and budget views) expose column headers but do not yet include full row/column-span summaries for screen readers; this is noted for a future improvement cycle.',
            'Downloadable documents (process-verbal minutes, data-export files) are delivered as plain text or PDF. PDFs generated server-side are not tagged for accessibility; until this is resolved, the plain-text version contains equivalent information and can be read by assistive technology.',
            'Map or floor-plan views, where present, are rendered as non-interactive diagrams with an alternative text description. Interactive map exploration is not yet provided.',
            'Some animated transitions use CSS easing. Motion is not reduced automatically when the operating system prefers-reduced-motion preference is set; this will be addressed in an upcoming release.',
          ],
        },
        {
          heading: 'Feedback and contact',
          paragraphs: [
            'If you experience any accessibility barrier or need content in an accessible format, you can report it through the in-app Feedback form (Feedback in the navigation), or by writing to accessibility@vecini.online.',
            'We will acknowledge your message within 5 working days and aim to resolve the issue or provide a reasonable workaround within 30 days. If you are not satisfied with the response, you may escalate to the supervisory authority.',
          ],
        },
        {
          heading: 'Enforcement',
          paragraphs: [
            'If you are not satisfied with our response after contacting us, you may contact the Romanian Authority for Digitalization (Autoritatea pentru Digitalizarea României, ADR) or use the online dispute resolution procedure available at ec.europa.eu/consumers/odr (for cross-border issues).',
          ],
        },
        {
          heading: 'Technical information',
          paragraphs: [
            'This platform relies on the following technologies for conformance: HTML, CSS, JavaScript (React), ARIA, and SVG. These technologies are relied upon for conformance with WCAG 2.1 Level AA.',
            'The accessibility statement was prepared on the basis of a self-assessment audit conducted by the development team in May 2026, covering the authentication flow, main navigation, feature pages, form components and modal dialogs.',
          ],
        },
      ],
    };
  }

  return {
    title: 'Declarație de accesibilitate',
    updated: `Elaborată la data de ${PREPARED_DATE}. Revizuire planificată pana la ${REVIEW_DATE}.`,
    intro:
      'vecini.online se angajează să facă platforma sa digitală accesibilă tuturor locatarilor, inclusiv persoanelor cu dizabilități. Această declarație explică situația actuală a accesibilității, limitările cunoscute și modul de raportare a barierelor sau de solicitare a asistenței.',
    sections: [
      {
        heading: 'Obiectiv de conformitate',
        paragraphs: [
          'vecini.online urmărește să respecte Ghidul pentru accesibilitatea conținutului web (WCAG) versiunea 2.1, Nivelul AA, și standardul european EN 301 549 v3.2.1 „Cerințe de accesibilitate pentru produse și servicii TIC". Aceste standarde definesc modul în care conținutul digital trebuie proiectat pentru a fi accesibil persoanelor cu dizabilități vizuale, auditive, motorii și cognitive.',
          'Stadiul conformității: această aplicație este parțial conformă cu WCAG 2.1 Nivelul AA. Conformitatea parțială înseamnă că unele părți ale conținutului nu îndeplinesc integral standardul, după cum este descris mai jos.',
        ],
      },
      {
        heading: 'Măsuri implementate',
        paragraphs: [
          'Navigare cu tastatura: toate comenzile interactive, formularele și dialogurile pot fi operate exclusiv cu tastatura. Dialogurile modale captează focusul cât sunt deschise și îl restaurează pe elementul declanșator la închidere. Un link de salt vizibil este primul element din pagină, permițând utilizatorilor de tastatură să treacă direct la conținutul principal.',
          'Suport pentru cititoare de ecran: elementele interactive au roluri, stări și proprietăți ARIA corespunzătoare. Mesajele de eroare sunt asociate câmpurilor de intrare prin aria-describedby. Butoanele afișează starea aria-busy în timpul încărcării. Mesajele de stare folosesc regiuni ARIA live acolo unde este necesar.',
          'Design vizual: textul respectă raportul de contrast de 4,5:1 (Nivelul AA) atât în tema deschisă, cât și în tema întunecată. Interfața este complet responsivă și rămâne utilizabilă la 400% zoom. Textul poate fi redimensionat fără pierderi de conținut sau funcționalitate.',
          'Interfață bilingvă: tot textul vizibil utilizatorilor este disponibil în română și engleză prin comutatorul de limbă din aplicație.',
          'Testare: accesibilitatea este verificată la fiecare ciclu de dezvoltare, cu instrumente automate și revizuire manuală cu tastatură și cititor de ecran. Problemele identificate sunt prioritizate și urmărite.',
        ],
      },
      {
        heading: 'Limitări cunoscute',
        paragraphs: [
          'Tabelele de date complexe (de exemplu în vizualizările de contoare și buget) expun antetele de coloane, dar nu includ încă rezumate complete de rând/coloană pentru cititoarele de ecran; aceasta este notată pentru un viitor ciclu de îmbunătățire.',
          'Documentele descărcabile (procese-verbale, fișiere de export de date) sunt furnizate ca text simplu sau PDF. PDF-urile generate pe server nu sunt etichetate pentru accesibilitate; până la rezolvare, versiunea în text simplu conține informații echivalente și poate fi citită de tehnologia asistivă.',
          'Vizualizările de tip hartă sau plan al etajului, acolo unde există, sunt redate ca diagrame neinteractive cu o descriere alternativă. Explorarea interactivă a hărții nu este încă disponibilă.',
          'Unele tranziții animate folosesc tranziții CSS. Mișcarea nu este redusă automat când preferința prefers-reduced-motion a sistemului de operare este activată; aceasta va fi abordată într-o versiune viitoare.',
        ],
      },
      {
        heading: 'Feedback și contact',
        paragraphs: [
          'Dacă întâmpinați o barieră de accesibilitate sau aveți nevoie de conținut într-un format accesibil, puteți raporta prin formularul de Feedback din aplicație (secțiunea Feedback din navigare) sau scriind la accessibility@vecini.online.',
          'Vom confirma mesajul dumneavoastră în termen de 5 zile lucrătoare și ne propunem să rezolvăm problema sau să furnizăm o soluție alternativă rezonabilă în termen de 30 de zile. Dacă nu sunteți mulțumit de răspuns, puteți escalada la autoritatea competentă.',
        ],
      },
      {
        heading: 'Aplicarea normelor',
        paragraphs: [
          'Dacă nu sunteți mulțumit de răspunsul nostru după ce ne-ați contactat, puteți contacta Autoritatea pentru Digitalizarea României (ADR) sau puteți folosi procedura de soluționare online a litigiilor disponibilă la ec.europa.eu/consumers/odr (pentru probleme transfrontaliere).',
        ],
      },
      {
        heading: 'Informații tehnice',
        paragraphs: [
          'Această platformă se bazează pe următoarele tehnologii pentru conformitate: HTML, CSS, JavaScript (React), ARIA și SVG. Aceste tehnologii sunt invocate pentru conformitatea cu WCAG 2.1 Nivelul AA.',
          'Declarația de accesibilitate a fost elaborată pe baza unui audit de autoevaluare realizat de echipa de dezvoltare în mai 2026, acoperind fluxul de autentificare, navigarea principală, paginile de funcționalități, componentele de formular și dialogurile modale.',
        ],
      },
    ],
  };
}
