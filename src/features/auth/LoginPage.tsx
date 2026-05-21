import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { useAuthStore } from '@/shared/store/authStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const enterDemo = useAuthStore((s) => s.enterDemo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(t('auth.invalidCredentials'));
      return;
    }
    navigate('/app');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-primary">IntreVecini</h1>
        <p className="text-muted">{t('common.tagline')}</p>
      </div>

      <Card className="w-full max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-lg font-semibold">{t('auth.loginTitle')}</h2>
          {!isSupabaseConfigured && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              {t('auth.demoMode')}
            </p>
          )}
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            {t('auth.login')}
          </Button>
        </form>

        {!isSupabaseConfigured && (
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => {
              enterDemo();
              navigate('/app');
            }}
          >
            Intră în modul demonstrativ
          </Button>
        )}
      </Card>
    </div>
  );
}
