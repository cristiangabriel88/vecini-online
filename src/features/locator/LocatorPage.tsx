import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, StickyNote, Clock } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { formatDateLong } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import type { ResidentPost, ResidentPostCategory } from '@/shared/types/domain';
import { useLocatorStore } from './locatorStore';
import { hydrateLocator, createPost } from './locatorApi';
import { isExpired, daysLeft } from './locatorLogic';

const CATEGORIES: ResidentPostCategory[] = ['vand', 'caut', 'ofer', 'info'];
const tone: Record<ResidentPostCategory, 'success' | 'primary' | 'warning' | 'neutral'> = {
  vand: 'success',
  caut: 'warning',
  ofer: 'primary',
  info: 'neutral',
};

const PostCard = memo(function PostCard({ p }: { p: ResidentPost }) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{p.title}</h2>
        <Badge tone={tone[p.category]}>{t(`locator.category_${p.category}`)}</Badge>
      </div>
      <p className="mb-2 text-sm text-muted">
        {p.author_name} · {formatDateLong(p.created_at)}
      </p>
      <p className="mb-3 whitespace-pre-line text-text">{p.body}</p>
      <p className="flex items-center gap-1 text-sm text-muted">
        <Clock className="h-4 w-4" /> {t('locator.expiresIn', { count: daysLeft(p.expires_at) })}
      </p>
    </Card>
  );
});

function LocatorComposeModal({
  open,
  onClose,
  asociatieId,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  asociatieId: string;
  profile: { id?: string; full_name?: string | null } | null;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ResidentPostCategory>('vand');

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    const author = {
      id: profile?.id ?? DEMO_CURRENT_USER_ID,
      name: profile?.full_name ?? DEMO_CURRENT_USER_NAME,
    };
    createPost(asociatieId, author, { title: title.trim(), body: body.trim(), category });
    toast.success(t('locator.posted'));
    setTitle('');
    setBody('');
    setCategory('vand');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('locator.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !body.trim()}>
            {t('common.publish')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('locator.postTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Select
          label={t('locator.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value as ResidentPostCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`locator.category_${c}`)}
            </option>
          ))}
        </Select>
        <Textarea label={t('locator.body')} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
    </Modal>
  );
}

export default function LocatorPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId) ?? DEMO_ASOCIATIE.id;
  const profile = useAuthStore((s) => s.profile);
  const items = useLocatorStore((s) => s.items);
  const fetchError = useLocatorStore((s) => s.fetchError);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateLocator(asociatieId);
  }, [asociatieId]);

  const live = items
    .filter((p) => !isExpired(p.expires_at))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div>
      <PageHeader
        title={t('locator.title')}
        subtitle={t('locator.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('locator.new')}
          </Button>
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateLocator(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      ) : live.length === 0 ? (
        <EmptyState body={t('locator.empty')} icon={<StickyNote className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {live.map((p) => (
            <PostCard key={p.id} p={p} />
          ))}
        </div>
      )}

      <LocatorComposeModal
        open={open}
        onClose={() => setOpen(false)}
        asociatieId={asociatieId}
        profile={profile}
      />
    </div>
  );
}
