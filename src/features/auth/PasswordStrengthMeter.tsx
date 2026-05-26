import { useTranslation } from 'react-i18next';
import type { PasswordAssessment } from './passwordPolicy';

/**
 * A compact strength meter + first-issue hint shown while choosing a password.
 * Shared by the sign-up form (`LoginPage`) and the account-creation-on-
 * redemption landing (`AccountSetupPage`, T124) so the policy is surfaced
 * identically wherever a password is set. The four segments fill to the
 * assessment's score and tint by strength; the line below shows the first
 * blocking issue, or the strength label when the password is acceptable.
 */
export function PasswordStrengthMeter({ assessment }: { assessment: PasswordAssessment }) {
  const { t } = useTranslation();
  const tone =
    assessment.strength === 'weak'
      ? 'var(--danger)'
      : assessment.strength === 'fair'
        ? 'var(--warning)'
        : 'var(--success, var(--primary))';
  const issue = assessment.issues[0];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i < assessment.score ? tone : 'var(--bg-sunken)' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: issue ? 'var(--danger)' : 'var(--text-muted)' }}>
        {issue
          ? t(`auth.pwd.${issue}`)
          : `${t('auth.pwd.strength')}: ${t(`auth.pwd.${assessment.strength}`)}`}
      </p>
    </div>
  );
}
