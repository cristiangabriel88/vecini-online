import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lightbulb, ChevronUp, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { Input, Textarea } from '@/shared/components/Input';
import { formatDateLong } from '@/shared/lib/format';
import type { IdeaStatus } from '@/shared/types/domain';
import { useIdeasStore } from './ideasStore';
import { rankIdeas, IDEA_STATUS_TONE } from './ideaLogic';

export default function IdeasPage() {
  const { t } = useTranslation();
  const { items, myVotes, add, toggleVote } = useIdeasStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const ranked = rankIdeas(items);

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    add({ title: title.trim(), body: body.trim() });
    toast.success(t('ideas.submitted'));
    setOpen(false);
    setTitle('');
    setBody('');
  };

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
            return (
              <Card key={i.id}>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleVote(i.id)}
                    aria-pressed={voted}
                    aria-label={t('ideas.vote')}
                    className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors ${
                      voted ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:bg-surface-2'
                    }`}
                  >
                    <ChevronUp className="h-5 w-5" />
                    <span className="text-base font-semibold">{i.votes}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">{i.title}</h2>
                      <Badge tone={IDEA_STATUS_TONE[i.status as IdeaStatus]}>
                        {t(`ideas.status_${i.status}`)}
                      </Badge>
                    </div>
                    <p className="mb-1 text-sm text-muted">
                      {i.author_name} · {formatDateLong(i.created_at)}
                    </p>
                    <p className="whitespace-pre-line text-text">{i.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('ideas.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!title.trim() || !body.trim()}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('ideas.ideaTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label={t('ideas.body')} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
