import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { LogIn, Ticket } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { useAuthStore } from '@/shared/store/authStore';
import type { InviteStatus } from '@/features/invites/inviteLogic';

/**
 * Resident join-by-invite-code screen (T42). A user with no asociație enters the
 * code an admin issued; on a valid code the local store consumes it once, the
 * granted membership is created and the asociație becomes active, clearing the
 * `RequireAsociatie` gate. Invalid codes report a precise bilingual reason.
 */
export default function JoinAsociatiePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const joinByInvite = useAuthStore((s) => s.joinByInvite);

  const [code, setCode] = useState('');
  // Validation outcome of the last attempt for inline error copy (null = none).
  const [error, setError] = useState<Exclude<InviteStatus, 'ok'> | null>(null);

  const submit = () => {
    const result = joinByInvite(code);
    if (result.status === 'ok') {
      setError(null);
      toast.success(t('join.success'));
      navigate('/app');
      return;
    }
    setError(result.status);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">{t('join.title')}</h1>
        <p className="mt-1 text-muted">{t('join.subtitle')}</p>
      </div>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            label={t('join.codeLabel')}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="ABCD-2345"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase tracking-widest"
            hint={t('join.codeHint')}
            error={error ? t(`join.err_${error}`) : undefined}
          />
          <Button type="submit" disabled={!code.trim()} className="w-full">
            <LogIn className="h-4 w-4" /> {t('join.submit')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        {t('join.createPrompt')}{' '}
        <Link to="/onboarding" className="auth-link">
          <Ticket className="mr-1 inline h-3.5 w-3.5" />
          {t('join.createLink')}
        </Link>
      </p>
    </div>
  );
}
