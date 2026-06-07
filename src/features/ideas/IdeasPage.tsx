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
import { canPostNow, charsRemaining, isOverLength, IDEA_RATE_LIMIT } from '@/shared/lib/contentGuard';
import type { IdeaStatus } from '@/shared/types/domain';
import { useIdeasStore, useAsociatieIdeas } from './ideasStore';
import { hydrateIdeas, submitIdea, castIdeaVote } from './ideasApi';
import {
  rankIdeas,
  IDEA_STATUS_TONE,
  isPromoted,
  newIdea,
  isValidIdeaTitle,
  isValidIdeaBody,
  IDEA_TITLE_MAX,
  IDEA_BODY_MAX,
} from './ideaLogic';

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
  const postTimestamps = useIdeasStore((s) => s.postTimestamps);
  const recordPost = useIdeasStore((s) => s.recordPost);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const titleOver = isOverLength(title, IDEA_TITLE_MAX);
  const bodyOver = isOverLength(body, IDEA_BODY_MAX);
  const titleLeft = charsRemaining(title, IDEA_TITLE_MAX);
  const bodyLeft = charsRemaining(body, IDEA_BODY_MAX);

  const valid = isValidIdeaTitle(title) && isValidIdeaBody(body);

  const submit = () => {
    if (!valid) return;
    if (!canPostNow(postTimestamps[`${asociatieId}:${authorUserId}`] ?? [], IDEA_RATE_LIMIT)) {
      toast.error(t('contentGuard.rateLimited', { limit: IDEA_RATE_LIMIT }));
      return;
    }
    const idea = newIdea(
      { title: title.trim(), body: body.trim() },
      asociatieId,
      authorUserId,
      authorName,
    );
    submitIdea(asociatieId, idea, authorUserId);
    recordPost(asociatieId, authorUserId);
    toast.success(t('ideas.submitted'));
    setTitle('');
    setBody('');
    onClose();
  };

  const titleHint = titleLeft <= 20 ? t('contentGuard.charsLeft', { count: Math.max(0, titleLeft) }) : undefined;
  const bodyHint = bodyLeft <= 100 ? t('contentGuard.charsLeft', { count: Math.max(0, bodyLeft) }) : undefined;

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
          <Button onClick={submit} disabled={!valid}>
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
          maxLength={IDEA_TITLE_MAX + 10}
          error={titleOver ? t('contentGuard.tooLong', { max: IDEA_TITLE_MAX }) : undefined}
          hint={!titleOver ? titleHint : undefined}
        />
        <Textarea
          label={t('ideas.body')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={IDEA_BODY_MAX + 10}
          error={bodyOver ? t('contentGuard.tooLong', { max: IDEA_BODY_MAX }) : undefined}
          hint={!bodyOver ? bodyHint : undefined}
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
