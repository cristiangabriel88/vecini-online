import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Select } from '@/shared/components/Select';
import i18n from '@/shared/lib/i18n';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div>
      <PageHeader title={t('nav.profile')} />
      <div className="space-y-4">
        <Card title={DEMO_ASOCIATIE.name}>
          <p className="text-muted">{DEMO_ASOCIATIE.address}</p>
          <p className="text-sm text-muted">
            CUI {DEMO_ASOCIATIE.cui} · {DEMO_ASOCIATIE.registration_number}
          </p>
        </Card>

        <Card>
          <Select
            label={t('chrome.language')}
            defaultValue={i18n.language.startsWith('en') ? 'en' : 'ro'}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
          >
            <option value="ro">Română</option>
            <option value="en">English</option>
          </Select>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted">
            <Globe className="h-4 w-4" /> {t('chrome.language')}
          </p>
        </Card>

        <Button
          variant="danger"
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
        >
          <LogOut className="h-4 w-4" /> {t('auth.logout')}
        </Button>
      </div>
    </div>
  );
}
