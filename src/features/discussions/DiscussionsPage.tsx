import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessagesSquare, Plus, Pin, Trash2, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { useAsociatieThreads, useDiscussionStore } from './discussionStore';
import {
  NEW_USER_HOURLY_LIMIT,
  canPost,
  isValidMessage,
  isValidThread,
  isVettedRole,
  prunePostTimestamps,
  sortThreads,
} from './discussionLogic';
import {
  addThread,
  deleteMessage,
  hydrateThreads,
  postMessage,
  togglePin,
} from './discussionApi';

export default function DiscussionsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const profile = useAuthStore((s) => s.profile);
  const author = {
    id: profile?.id ?? DEMO_CURRENT_USER_ID,
    name: profile?.full_name ?? DEMO_CURRENT_USER_NAME,
  };
  const role = useAuthStore((s) => s.activeRole());
  const threads = useAsociatieThreads();
  const fetchError = useDiscussionStore((s) => s.fetchError);
  const postTimestamps = useDiscussionStore((s) => s.postTimestamps);
  const recordPost = useDiscussionStore((s) => s.recordPost);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateThreads(asociatieId);
  }, [asociatieId]);

  const ordered = sortThreads(threads);

  const vetted = isVettedRole(role);

  const recentCount = () => {
    const key = `${asociatieId}:${author.id}`;
    return prunePostTimestamps(postTimestamps[key] ?? [], Date.now()).length;
  };

  const send = (threadId: string) => {
    if (!asociatieId || !isValidMessage(reply)) return;
    if (!canPost(recentCount(), vetted)) {
      toast.error(t('discussions.rateLimited', { limit: NEW_USER_HOURLY_LIMIT }));
      return;
    }
    postMessage(asociatieId, threadId, reply, author);
    recordPost(asociatieId, author.id);
    setReply('');
  };

  const submitThread = () => {
    if (!asociatieId || !isValidThread(title)) return;
    if (!canPost(recentCount(), vetted)) {
      toast.error(t('discussions.rateLimited', { limit: NEW_USER_HOURLY_LIMIT }));
      setNewOpen(false);
      return;
    }
    addThread(asociatieId, { title, topic });
    recordPost(asociatieId, author.id);
    toast.success(t('discussions.threadAdded'));
    setNewOpen(false);
    setTitle('');
    setTopic('');
  };

  return (
    <div>
      <PageHeader
        title={t('discussions.title')}
        subtitle={t('discussions.subtitle')}
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> {t('discussions.newThread')}
          </Button>
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={() => { if (asociatieId) void hydrateThreads(asociatieId); }}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : ordered.length === 0 ? (
        <EmptyState body={t('discussions.empty')} icon={<MessagesSquare className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((th) => {
            const expanded = openId === th.id;
            return (
              <Card key={th.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="text-left"
                    onClick={() => setOpenId(expanded ? null : th.id)}
                  >
                    <p className="font-medium">{th.title}</p>
                    <p className="text-sm text-muted">
                      {th.topic} · {t('discussions.messageCount', { count: th.messages.length })}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    {th.pinned && <Badge tone="primary">{t('discussions.pinned')}</Badge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => asociatieId && togglePin(asociatieId, th.id)}
                      aria-label={th.pinned ? t('discussions.unpin') : t('discussions.pin')}
                    >
                      <Pin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {th.messages.map((m) => (
                      <div key={m.id} className="flex items-start justify-between gap-2 text-sm">
                        <div>
                          <span className="font-medium">{m.author_name}</span>{' '}
                          <span className="text-muted">{formatDateTime(m.created_at)}</span>
                          <p>{m.body}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => asociatieId && deleteMessage(asociatieId, th.id, m.id)}
                          aria-label={t('discussions.deleteMessage')}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder={t('discussions.replyPlaceholder')}
                        aria-label={t('discussions.replyPlaceholder')}
                      />
                      <Button
                        onClick={() => send(th.id)}
                        disabled={!asociatieId || !isValidMessage(reply)}
                        aria-label={t('discussions.send')}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('discussions.newThread')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitThread} disabled={!asociatieId || !isValidThread(title)}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('discussions.threadTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={t('discussions.topic')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="#parcare"
          />
        </div>
      </Modal>
    </div>
  );
}
