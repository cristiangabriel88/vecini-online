import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import i18n from '@/shared/lib/i18n';
import { DEMO_APARTMENTS } from '@/shared/demo/demoData';
import type { Locale } from '@/shared/types/domain';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { fileToAvatar } from '@/features/profile/avatarImage';
import {
  AVATAR_MAX_BYTES,
  type ProfileData,
  completeness,
  initials,
  isAcceptedImageType,
  validateStandard,
} from '@/features/profile/profileLogic';

/**
 * The second phase of the welcome flow: a compact, optional profile capture that
 * mirrors `ProfilePage`. It reuses the same store, validation and completeness
 * metric, autosaving every change, and lets the resident finish or skip into the
 * app at any point (both paths mark the welcome seen via `onComplete`).
 */
export function WelcomeProfile({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { userId, email } = useMyIdentity();
  const get = useProfileStore((s) => s.get);
  const save = useProfileStore((s) => s.save);

  const [profile, setProfile] = useState<ProfileData>(() => get(userId, email));
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = validateStandard(profile);
  const pct = completeness(profile);
  const greetingName = profile.displayName.trim() || profile.fullName.trim().split(/\s+/)[0];

  /** Autosave: persist every change immediately, exactly like the profile page. */
  function update(patch: Partial<ProfileData>) {
    const next = { ...profile, ...patch };
    setProfile(next);
    save(next);
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAcceptedImageType(file.type)) {
      window.alert(t('profile.photoBadType'));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      window.alert(t('profile.photoTooLarge'));
      return;
    }
    try {
      update({ avatarDataUrl: await fileToAvatar(file) });
    } catch {
      window.alert(t('profile.photoBadType'));
    }
  }

  function selectApartment(apartmentId: string) {
    const apt = DEMO_APARTMENTS.find((a) => a.id === apartmentId);
    update({
      apartmentId: apartmentId || null,
      ...(apt ? { scara: apt.scara ?? '', etaj: apt.etaj != null ? String(apt.etaj) : '' } : {}),
    });
  }

  function changeLanguage(locale: Locale) {
    update({ locale });
    void i18n.changeLanguage(locale);
  }

  return (
    <div className="welcome-profile">
      <div className="welcome__top" style={{ padding: 0 }}>
        <span className="welcome__brand">
          <span className="welcome__brand-dot" aria-hidden="true" />
          vecini.online
        </span>
      </div>

      <div className="welcome-profile__head">
        <h1 className="welcome-profile__greeting">
          {greetingName
            ? t('welcome.greeting', { name: greetingName })
            : t('welcome.greetingNoName')}
        </h1>
        <p className="welcome-profile__subtitle">{t('welcome.profileSubtitle')}</p>
      </div>

      <div className="welcome-profile__avatar-row">
        {profile.avatarDataUrl ? (
          <img
            src={profile.avatarDataUrl}
            alt={profile.fullName || t('nav.profile')}
            className="welcome-profile__avatar"
          />
        ) : (
          <div className="welcome-profile__avatar-fallback" aria-hidden="true">
            {initials(profile.fullName || profile.displayName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="welcome-profile__meter-label">
            <span>{t('profile.completeness', { percent: pct })}</span>
          </div>
          <div
            className="welcome-profile__meter"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('profile.completeness', { percent: pct })}
          >
            <div className="welcome-profile__meter-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickPhoto}
            />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> {t('profile.changePhoto')}
            </Button>
          </div>
        </div>
      </div>

      <div className="welcome-profile__grid">
        <div className="welcome-profile__full">
          <Input
            label={t('profile.fullName')}
            value={profile.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
          />
        </div>
        <Input
          label={t('profile.displayName')}
          hint={t('profile.displayNameHint')}
          value={profile.displayName}
          onChange={(e) => update({ displayName: e.target.value })}
        />
        <Input
          label={t('profile.phone')}
          type="tel"
          value={profile.phone}
          error={errors.phone ? t(`profile.err.${errors.phone}`) : undefined}
          onChange={(e) => update({ phone: e.target.value })}
        />
        <div className="welcome-profile__full">
          <Select
            label={t('profile.apartment')}
            value={profile.apartmentId ?? ''}
            onChange={(e) => selectApartment(e.target.value)}
          >
            <option value="">{t('profile.apartmentNone')}</option>
            {DEMO_APARTMENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {t('profile.apartmentOption', {
                  numar: a.numar_apartament,
                  scara: a.scara ?? '-',
                  etaj: a.etaj ?? '-',
                })}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label={t('profile.carPlate')}
          hint={t('profile.carPlateHint')}
          value={profile.carPlate}
          error={errors.carPlate ? t(`profile.err.${errors.carPlate}`) : undefined}
          onChange={(e) => update({ carPlate: e.target.value })}
        />
        <Input
          label={t('profile.dateOfBirth')}
          type="date"
          value={profile.dateOfBirth}
          error={errors.dateOfBirth ? t(`profile.err.${errors.dateOfBirth}`) : undefined}
          onChange={(e) => update({ dateOfBirth: e.target.value })}
        />
        <div className="welcome-profile__full">
          <Select
            label={t('profile.language')}
            value={profile.locale}
            onChange={(e) => changeLanguage(e.target.value as Locale)}
          >
            <option value="ro">Română</option>
            <option value="en">English</option>
          </Select>
        </div>
      </div>

      <div className="welcome-profile__footer">
        <Button variant="ghost" onClick={onComplete}>
          {t('welcome.skipForNow')}
        </Button>
        <Button onClick={onComplete}>
          <Check className="h-4 w-4" /> {t('welcome.finish')}
        </Button>
      </div>
    </div>
  );
}
