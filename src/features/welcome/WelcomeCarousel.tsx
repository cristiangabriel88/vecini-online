import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  HandHeart,
  Megaphone,
  MessageCircle,
  Package,
  ShieldCheck,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';

type Icon = ComponentType<{ className?: string }>;

interface Slide {
  /** Translation key suffix under the `welcome` namespace. */
  key: string;
  core: Icon;
  chips: [Icon, Icon, Icon];
}

/**
 * The three presentation slides. Copy lives in i18n (`welcome.slide{n}Title` /
 * `welcome.slide{n}Body`); each slide pairs a central motif icon with three
 * orbiting feature chips drawn from that theme.
 */
const SLIDES: Slide[] = [
  { key: 'slide1', core: Megaphone, chips: [MessageCircle, CalendarDays, Bell] },
  { key: 'slide2', core: Vote, chips: [FileText, Wallet, BarChart3] },
  { key: 'slide3', core: Users, chips: [HandHeart, Package, ShieldCheck] },
];

export function WelcomeCarousel({
  onSkip,
  onGetStarted,
}: {
  onSkip: () => void;
  onGetStarted: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const last = SLIDES.length - 1;
  const pointerStartX = useRef<number | null>(null);

  const goTo = (next: number) => setStep(Math.max(0, Math.min(last, next)));
  const next = () => (step === last ? onGetStarted() : goTo(step + 1));
  const back = () => goTo(step - 1);

  // Arrow-key navigation across the slides.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goTo(step + 1);
      else if (e.key === 'ArrowLeft') goTo(step - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Pointer-swipe: a horizontal drag past the threshold flips one slide.
  function onPointerDown(e: React.PointerEvent) {
    pointerStartX.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = pointerStartX.current;
    pointerStartX.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) < 48) return;
    goTo(dx < 0 ? step + 1 : step - 1);
  }

  return (
    <div className="welcome-carousel">
      <div className="welcome__top">
        <span className="welcome__brand">
          <span className="welcome__brand-dot" aria-hidden="true" />
          vecini.online
        </span>
        <button className="welcome__skip" onClick={onSkip}>
          {t('welcome.skip')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        className="welcome-carousel__viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        aria-roledescription="carousel"
        aria-label={t('welcome.carouselLabel')}
      >
        <div
          className="welcome-carousel__track"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {SLIDES.map((slide, i) => {
            const Core = slide.core;
            const [ChipA, ChipB, ChipC] = slide.chips;
            return (
              <section
                key={slide.key}
                className={`welcome-slide${i === step ? ' welcome-slide--active' : ''}`}
                aria-hidden={i !== step}
                aria-roledescription="slide"
                aria-label={t('welcome.slideOf', { current: i + 1, total: SLIDES.length })}
              >
                <div className="welcome-motif" aria-hidden="true">
                  <span className="welcome-motif__halo" />
                  <span className="welcome-motif__chip welcome-motif__chip--a">
                    <ChipA className="h-5 w-5" />
                  </span>
                  <span className="welcome-motif__chip welcome-motif__chip--b">
                    <ChipB className="h-5 w-5" />
                  </span>
                  <span className="welcome-motif__chip welcome-motif__chip--c">
                    <ChipC className="h-5 w-5" />
                  </span>
                  <span className="welcome-motif__core">
                    <Core className="h-9 w-9" />
                  </span>
                </div>
                <h1 className="welcome-slide__title">{t(`welcome.${slide.key}Title`)}</h1>
                <p className="welcome-slide__body">{t(`welcome.${slide.key}Body`)}</p>
              </section>
            );
          })}
        </div>
      </div>

      <div className="welcome-carousel__footer">
        <div className="welcome-dots" role="tablist" aria-label={t('welcome.carouselLabel')}>
          {SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              role="tab"
              aria-selected={i === step}
              aria-label={t('welcome.slideOf', { current: i + 1, total: SLIDES.length })}
              className={`welcome-dots__dot${i === step ? ' welcome-dots__dot--active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <div className="welcome-carousel__nav">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={back}>
              <ChevronLeft className="h-4 w-4" /> {t('welcome.back')}
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {step === last ? t('welcome.start') : t('welcome.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
