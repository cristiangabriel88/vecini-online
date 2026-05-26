import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, Globe, Moon, Sun } from 'lucide-react';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useThemeStore } from '@/shared/store/themeStore';
import type { LegalDoc, Lang } from './legalContent';

/** Shared chrome + prose renderer for the public legal pages. */
export function LegalDocPage({ build }: { build: (lang: Lang) => LegalDoc }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  const doc = build(lang);
  const toggleLang = () => void i18n.changeLanguage(lang === 'en' ? 'ro' : 'en');
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="relative z-[1] min-h-screen">
      <Atmosphere />
      <header className="legal-topbar">
        <Link to="/" className="legal-topbar__brand" aria-label="vecini.online">
          <span className="legal-topbar__logo" aria-hidden="true">
            <Building2 size={16} />
          </span>
          <span className="legal-topbar__word">
            vecini<em>.online</em>
          </span>
        </Link>
        <div className="legal-topbar__actions">
          <button
            type="button"
            className="iconbtn"
            onClick={toggleTheme}
            aria-label={t('chrome.toggleTheme')}
            title={t('chrome.toggleTheme')}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="iconbtn" onClick={toggleLang} aria-label={t('chrome.language')}>
            <Globe size={18} />
            <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3, textTransform: 'uppercase' }}>{lang}</span>
          </button>
          <Link to="/" className="legal-back">
            <ArrowLeft size={15} />
            <span>{t('legal.back')}</span>
          </Link>
        </div>
      </header>

      <main className="legal-page">
        <article className="legal-doc">
          <h1 className="legal-doc__title">{doc.title}</h1>
          <p className="legal-doc__updated">{doc.updated}</p>
          <p className="legal-doc__intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading} className="legal-doc__section">
              <h2 className="legal-doc__heading">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="legal-doc__p">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
