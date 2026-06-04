import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lightbulb, ChevronUp, Plus, Star } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { formatDateLong } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId } from '@/features/polls/pollLogic';
import type { IdeaStatus } from '@/shared/types/domain';
import { useIdeasStore, useAsociatieIdeas } from './ideasStore';
import { hydrateIdeas, submitIdea, castIdeaVote } from './ideasApi';
import { rankIdeas, IDEA_STATUS_TONE, isPromoted, newIdea } from './ideaLogic';

function IdeaComposeModal({
  open,
  onClose,
  asociatieId,
  authorUserId,
  authorName,
}: {
  open: boolean;
  onClose: () => void;
  asociatieId: string;
  authorUserId: string;
  authorName: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    const idea = newIdea(
      { title: title.trim(), body: body.trim() },
      asociatieId,
      authorUserId,
      authorName,
    );
    submitIdea(asociatieId, idea, authorUserId);
    toast.success(t('ideas.submitted'));
    setTitle('');
    setBody('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('ideas.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !body.trim()}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('ideas.ideaTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label={t('ideas.body')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function IdeasPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const authorUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const authorName = useAuthStore((s) => s.profile?.full_name) ?? 'Locatar';
  const fetchError = useIdeasStore((s) => s.fetchError);
  const myVotes = useIdeasStore((s) => s.myVotes);
  const catalog = useAsociatieIdeas();
  const apartments = useAsociatieApartments();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateIdeas(asociatieId);
  }, [asociatieId]);

  if (fetchError) {
    return (
      <div>
        <PageHeader title={t('ideas.title')} />
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateIdeas(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const ranked = rankIdeas(catalog.items);
  const apartmentId = findVoterApartmentId(apartments, authorUserId);

  return (
    <div>
      <PageHeader
        title={t('ideas.title')}
        subtitle={t('ideas.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('ideas.new')}
          </Button>
        }
      />

      {ranked.length === 0 ? (
        <EmptyState body={t('ideas.empty')} icon={<Lightbulb className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ranked.map((i) => {
            const voted = !!myVotes[i.id];
            const promoted = isPromoted(i, catalog.items);
            return (
              <Card key={i.id}>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (asociatieId) castIdeaVote(asociatieId, i.id, apartmentId);
                    }}
                    aria-pressed={voted}
                    aria-label={t('ideas.vote')}
                    className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors ${
                      voted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted hover:bg-surface-2'
                    }`}
                  >
                    <ChevronUp className="h-5 w-5" />
                    <span className="text-base font-semibold">{i.votes}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">{i.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        {promoted && (
                          <Badge tone="primary">
                            <Star className="h-3 w-3" />
                            {t('ideas.promoted')}
                          </Badge>
                        )}
                        <Badge tone={IDEA_STATUS_TONE[i.status as IdeaStatus]}>
                          {t(`ideas.status_${i.status}`)}
                        </Badge>
                      </div>
                    </div>
                    <p className="mb-1 text-sm text-muted">
                      {i.author_name ? `${i.author_name} · ` : ''}
                      {formatDateLong(i.created_at)}
                    </p>
                    <p className="whitespace-pre-line text-text">{i.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <IdeaComposeModal
        open={open}
        onClose={() => setOpen(false)}
        asociatieId={asociatieId ?? ''}
        authorUserId={authorUserId}
        authorName={authorName}
      />
    </div>
  );
}
