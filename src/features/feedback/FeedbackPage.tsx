import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessageSquarePlus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useFeedbackStore, useAsociatieFeedback } from './feedbackStore';
import { hydrateFeedback, addFeedbackLive } from './feedbackApi';
import { FEEDBACK_SENTIMENTS, isValidFeedback, sortedFeedback } from './feedbackLogic';
import type { FeedbackSentiment } from '@/shared/types/domain';

const SENTIMENT_TONE: Record<FeedbackSentiment, 'primary' | 'warning' | 'success'> = {
  idee: 'primary',
  problema: 'warning',
  lauda: 'success',
};

export default function FeedbackPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useFeedbackStore((s) => s.fetchError);
  const items = useAsociatieFeedback();
  const { userId } = useMyIdentity();
  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState<FeedbackSentiment>('idee');
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateFeedback(asociatieId);
  }, [asociatieId]);

  const valid = isValidFeedback(body);
  const ordered = sortedFeedback(items);

  const submit = () => {
    if (!valid) return;
    const item = {
      id: `fb-${Date.now()}`,
      asociatie_id: anonymous ? null : (asociatieId ?? null),
      user_id: anonymous ? null : (userId ?? null),
      anonymous,
      body: body.trim(),
      sentiment,
      created_at: new Date().toISOString(),
    };
    addFeedbackLive(asociatieId ?? 'demo-asoc', item);
    toast.success(t('feedback.sent'));
    setBody('');
    setSentiment('idee');
    setAnonymous(false);
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateFeedback(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('feedback.title')} subtitle={t('feedback.subtitle')} />

      <Card className="mb-6 space-y-4 p-4">
        <Select
          label={t('feedback.sentiment')}
          value={sentiment}
          onChange={(e) => setSentiment(e.target.value as FeedbackSentiment)}
        >
          {FEEDBACK_SENTIMENTS.map((s) => (
            <option key={s} value={s}>
              {t(`feedback.sentiment_${s}`)}
            </option>
          ))}
        </Select>
        <Textarea
          label={t('feedback.body')}
          placeholder={t('feedback.bodyHint')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Switch checked={anonymous} onChange={setAnonymous} label={t('feedback.anonymous')} />
          <span className="text-sm text-text">{t('feedback.anonymous')}</span>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!valid}>
            {t('feedback.send')}
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 text-lg font-semibold">{t('feedback.recent')}</h2>
      {ordered.length === 0 ? (
        <EmptyState body={t('feedback.empty')} icon={<MessageSquarePlus className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((f) => (
            <Card key={f.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-text">{f.body}</p>
                <Badge tone={SENTIMENT_TONE[f.sentiment]}>{t(`feedback.sentiment_${f.sentiment}`)}</Badge>
              </div>
              <p className="text-sm text-muted">
                {f.anonymous ? t('feedback.byAnonymous') : t('feedback.byYou')} · {formatDateTime(f.created_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
