import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { formatDateTime } from '@/shared/lib/format';
import { sanitizeHtml } from '@/shared/lib/sanitize';
import type { AnnouncementCategory } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { recordAudit } from '@/shared/store/auditStore';
import { useAnnouncementsStore, useAsociatieAnnouncements } from './announcementsStore';

const categoryTone: Record<AnnouncementCategory, 'urgent' | 'warning' | 'primary' | 'success'> = {
  urgent: 'urgent',
  important: 'warning',
  informativ: 'primary',
  eveniment: 'success',
};

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const authorUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const items = useAsociatieAnnouncements();
  const { reads, add, markRead } = useAnnouncementsStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('informativ');

  const submit = () => {
    if (!asociatieId || !title.trim() || !body.trim()) return;
    add(asociatieId, authorUserId, {
      title: title.trim(),
      body_html: `<p>${body.trim()}</p>`,
      category,
    });
    recordAudit({
      action: 'announcement.published',
      entity: 'announcement',
      entity_label: title.trim(),
      before: null,
      after: category,
    });
    toast.success(t('announcements.published'));
    setOpen(false);
    setTitle('');
    setBody('');
    setCategory('informativ');
  };

  return (
    <div>
      <PageHeader
        title={t('announcements.title')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('announcements.new')}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState body={t('announcements.empty')} />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{a.title}</h2>
                <Badge tone={categoryTone[a.category]}>{t(`announcements.category_${a.category}`)}</Badge>
              </div>
              <p className="mb-2 text-sm text-muted">
                {a.published_at ? formatDateTime(a.published_at) : ''}
              </p>
              <div
                className="prose prose-sm max-w-none text-text"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.body_html) }}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted">
                  {t('announcements.readBy', { read: reads[a.id] ? 1 : 0, total: 24 })}
                </span>
                <Button
                  variant={reads[a.id] ? 'ghost' : 'secondary'}
                  size="sm"
                  disabled={!!reads[a.id]}
                  onClick={() => markRead(a.id)}
                >
                  <Check className="h-4 w-4" />
                  {reads[a.id] ? t('announcements.markedRead') : t('announcements.markRead')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('announcements.compose')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!asociatieId || !title.trim() || !body.trim()}>
              {t('common.publish')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('announcements.announcementTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            label={t('announcements.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
          >
            <option value="urgent">{t('announcements.category_urgent')}</option>
            <option value="important">{t('announcements.category_important')}</option>
            <option value="informativ">{t('announcements.category_informativ')}</option>
            <option value="eveniment">{t('announcements.category_eveniment')}</option>
          </Select>
          <Textarea
            label={t('announcements.body')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
