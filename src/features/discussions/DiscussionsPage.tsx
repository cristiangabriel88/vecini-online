import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessagesSquare, Pencil, Plus, Pin, Trash2, Send } from 'lucide-react';
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
import { charsRemaining, isOverLength, DISCUSSION_MSG_MAX } from '@/shared/lib/contentGuard';
import { useAsociatieThreads, useDiscussionStore } from './discussionStore';
import {
  NEW_USER_HOURLY_LIMIT,
  canModerateDiscussion,
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
  deleteThread,
  hydrateThreads,
  postMessage,
  togglePin,
  updateMessage,
} from './discussionApi';
import { emitDiscussionReply } from '@/features/notifications/notificationFanout';
import { useWriteRetry } from '@/shared/lib/useWriteRetry';

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
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [pendingDeleteMessage, setPendingDeleteMessage] = useState<{ threadId: string; messageId: string } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const canModerate = canModerateDiscussion(role);
  const sendRetry = useWriteRetry('discussions.send');
  const threadRetry = useWriteRetry('discussions.addThread');

  // Bulk selection state (moderator only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (asociatieId) void hydrateThreads(asociatieId);
  }, [asociatieId]);

  const ordered = sortThreads(threads);

  const allSelected = ordered.length > 0 && selectedIds.size === ordered.length;
  const toggleThreadSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(ordered.map((t) => t.id)));

  const vetted = isVettedRole(role);

  const recentCount = () => {
    const key = `${asociatieId}:${author.id}`;
    return prunePostTimestamps(postTimestamps[key] ?? [], Date.now()).length;
  };

  const send = async (threadId: string) => {
    if (!asociatieId || !isValidMessage(reply) || sendRetry.pending) return;
    if (!canPost(recentCount(), vetted)) {
      toast.error(t('discussions.rateLimited', { limit: NEW_USER_HOURLY_LIMIT }));
      return;
    }
    const thread = threads.find((th) => th.id === threadId);
    const ok = await sendRetry.run(() => postMessage(asociatieId, threadId, reply, author));
    if (!ok) return;
    recordPost(asociatieId, author.id);
    if (thread) emitDiscussionReply(thread, author.id, author.name);
    setReply('');
  };

  const submitThread = async () => {
    if (!asociatieId || !isValidThread(title)) return;
    if (!canPost(recentCount(), vetted)) {
      toast.error(t('discussions.rateLimited', { limit: NEW_USER_HOURLY_LIMIT }));
      setNewOpen(false);
      return;
    }
    const ok = await threadRetry.run(() => addThread(asociatieId, { title, topic }));
    if (!ok) return;
    recordPost(asociatieId, author.id);
    toast.success(t('discussions.threadAdded'));
    setNewOpen(false);
    setTitle('');
    setTopic('');
  };

  const deleteOneThread = (threadId: string) => {
    setPendingDeleteThreadId(threadId);
  };

  const confirmDeleteThread = () => {
    if (!asociatieId || !pendingDeleteThreadId) return;
    deleteThread(asociatieId, pendingDeleteThreadId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(pendingDeleteThreadId);
      return next;
    });
    if (openId === pendingDeleteThreadId) setOpenId(null);
    toast.success(t('discussions.threadDeleted'));
    setPendingDeleteThreadId(null);
  };

  const deleteSelectedThreads = () => {
    setPendingBulkDelete(true);
  };

  const confirmDeleteSelected = () => {
    if (!asociatieId) return;
    const ids = [...selectedIds];
    ids.forEach((id) => deleteThread(asociatieId, id));
    if (openId && ids.includes(openId)) setOpenId(null);
    setSelectedIds(new Set());
    toast.success(t('discussions.threadDeleted'));
    setPendingBulkDelete(false);
  };

  const confirmDeleteMessage = () => {
    if (!asociatieId || !pendingDeleteMessage) return;
    deleteMessage(asociatieId, pendingDeleteMessage.threadId, pendingDeleteMessage.messageId);
    setPendingDeleteMessage(null);
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
          {canModerate && (
            <div className="flex items-center gap-3 py-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? t('discussions.deselectAll') : t('discussions.selectAll')}
                />
                <span>{allSelected ? t('discussions.deselectAll') : t('discussions.selectAll')}</span>
              </label>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-danger"
                  onClick={deleteSelectedThreads}
                  aria-label={t('discussions.deleteSelected', { count: selectedIds.size })}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('discussions.deleteSelected', { count: selectedIds.size })}
                </Button>
              )}
            </div>
          )}
          {ordered.map((th) => {
            const expanded = openId === th.id;
            return (
              <div key={th.id} className="flex items-start gap-3">
                {canModerate && (
                  <input
                    type="checkbox"
                    className="mt-4 h-4 w-4 shrink-0 cursor-pointer rounded border-border"
                    checked={selectedIds.has(th.id)}
                    onChange={() => toggleThreadSelect(th.id)}
                    aria-label={th.title}
                  />
                )}
                <Card className="min-w-0 flex-1 space-y-3 p-4">
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
                    <div className="flex items-center gap-1">
                      {th.pinned && <Badge tone="primary">{t('discussions.pinned')}</Badge>}
                      {canModerate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteOneThread(th.id)}
                          aria-label={t('discussions.deleteThread')}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      )}
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
                      {th.messages.map((m) => {
                        const canDeleteMsg = canModerate || m.author_user_id === author.id;
                        const isEditingMsg = editingMessageId === m.id;
                        return (
                          <div key={m.id} className="flex items-start justify-between gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{m.author_name}</span>{' '}
                              <span className="text-muted">{formatDateTime(m.created_at)}</span>
                              {isEditingMsg ? (
                                <div className="mt-1 flex gap-2">
                                  <Input
                                    value={editingBody}
                                    onChange={(e) => setEditingBody(e.target.value)}
                                    aria-label={t('discussions.editMessage')}
                                  />
                                  <Button
                                    size="sm"
                                    disabled={!isValidMessage(editingBody)}
                                    onClick={() => {
                                      if (asociatieId && isValidMessage(editingBody)) {
                                        updateMessage(asociatieId, th.id, m.id, editingBody.trim());
                                        toast.success(t('discussions.messageUpdated'));
                                        setEditingMessageId(null);
                                      }
                                    }}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)}>
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              ) : (
                                <p>{m.body}</p>
                              )}
                            </div>
                            {!isEditingMsg && (
                              <div className="flex shrink-0 items-center gap-1">
                                {m.author_user_id === author.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setEditingMessageId(m.id); setEditingBody(m.body); }}
                                    aria-label={t('discussions.editMessage')}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDeleteMsg && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPendingDeleteMessage({ threadId: th.id, messageId: m.id })}
                                    aria-label={t('discussions.deleteMessage')}
                                  >
                                    <Trash2 className="h-4 w-4 text-danger" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div>
                        <div className="flex gap-2">
                          <Input
                            value={reply}
                            onChange={(e) => { setReply(e.target.value); sendRetry.clearError(); }}
                            placeholder={t('discussions.replyPlaceholder')}
                            aria-label={t('discussions.replyPlaceholder')}
                            maxLength={DISCUSSION_MSG_MAX + 10}
                            error={isOverLength(reply, DISCUSSION_MSG_MAX) ? t('contentGuard.tooLong', { max: DISCUSSION_MSG_MAX }) : undefined}
                            hint={!isOverLength(reply, DISCUSSION_MSG_MAX) && charsRemaining(reply, DISCUSSION_MSG_MAX) <= 100 ? t('contentGuard.charsLeft', { count: Math.max(0, charsRemaining(reply, DISCUSSION_MSG_MAX)) }) : undefined}
                          />
                          <Button
                            onClick={() => void send(th.id)}
                            disabled={!asociatieId || !isValidMessage(reply) || sendRetry.pending}
                            aria-label={t('discussions.send')}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        {sendRetry.error && (
                          <p role="alert" className="mt-1 text-xs text-destructive" data-testid="send-error">
                            {t('common.writeError')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={newOpen}
        onClose={() => { setNewOpen(false); threadRetry.clearError(); }}
        title={t('discussions.newThread')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setNewOpen(false); threadRetry.clearError(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submitThread()} disabled={!asociatieId || !isValidThread(title) || threadRetry.pending}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('discussions.threadTitle')} value={title} onChange={(e) => { setTitle(e.target.value); threadRetry.clearError(); }} />
          <Input
            label={t('discussions.topic')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="#parcare"
          />
          {threadRetry.error && (
            <p role="alert" className="text-xs text-destructive" data-testid="thread-error">
              {t('common.writeError')}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={pendingDeleteThreadId !== null}
        onClose={() => setPendingDeleteThreadId(null)}
        title={t('discussions.deleteThread')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDeleteThreadId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteThread}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('discussions.deleteThreadConfirm')}</p>
      </Modal>

      <Modal
        open={pendingBulkDelete}
        onClose={() => setPendingBulkDelete(false)}
        title={t('discussions.deleteBulkTitle', { count: selectedIds.size })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingBulkDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteSelected}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('discussions.deleteBulkConfirm', { count: selectedIds.size })}</p>
      </Modal>

      <Modal
        open={pendingDeleteMessage !== null}
        onClose={() => setPendingDeleteMessage(null)}
        title={t('discussions.deleteMessage')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDeleteMessage(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteMessage}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('discussions.deleteMessageConfirm')}</p>
      </Modal>
    </div>
  );
}
