import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, KeyRound } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useAuthStore } from '@/shared/store/authStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mapAuthError, validatePassword } from './authLogic';

/**
 * Reached from the password-reset email link. Supabase consumes the recovery
 * token in the URL (detectSessionInUrl) and emits PASSWORD_RECOVERY, which the
 * auth store records as `recovery`. Here the resident chooses a new password.
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recovery = useAuthStore((s) => s.recovery);
  const updatePassword = useAuthStore((s) => s.updatePassword);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordIssue = validatePassword(password);
  const showPasswordError = password.length > 0 && passwordIssue !== null;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSave = passwordIssue === null && password === confirmPassword;

  // Outside demo mode the link must have established a recovery session; without
  // it there is nothing to reset, so guide the resident back to request a new one.
  const noRecovery = isSupabaseConfigured && !recovery;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(t(`auth.err.${mapAuthError(error)}`));
        return;
      }
      toast.success(t('auth.resetDone'));
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4">
      <Atmosphere />
      <div className="mb-7 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-700) 100%)',
            boxShadow: 'var(--shadow-md), inset 0 1px 0 0 oklch(100% 0 0 / 0.2)',
          }}
        >
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="text-4xl text-text" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          vecini
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--primary)' }}>.online</em>
        </h1>
      </div>

      <Card className="w-full max-w-sm">
        {noRecovery ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">{t('auth.resetExpiredTitle')}</h2>
            <p className="text-sm text-muted">{t('auth.resetExpiredBody')}</p>
            <Link to="/">
              <Button variant="secondary" className="w-full">
                {t('auth.backToSignIn')}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-semibold">{t('auth.newPasswordTitle')}</h2>
            <p className="text-sm text-muted">{t('auth.newPasswordHint')}</p>
            <Input
              label={t('auth.newPassword')}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={t('auth.passwordHint')}
              error={showPasswordError ? t('auth.err.weakPassword') : undefined}
              required
            />
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={mismatch ? t('auth.err.passwordMismatch') : undefined}
              required
            />
            <Button type="submit" className="w-full" loading={loading} disabled={!canSave}>
              {t('auth.savePassword')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
