import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Inbox, Plus, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { apartmentHasLinkedResident, pickAdminThreadResident } from '@/features/admin/apartmentsLogic';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { canPostNow, charsRemaining, isOverLength, PRIVATE_RATE_LIMIT } from '@/shared/lib/contentGuard';
import type { PrivateMessage, PrivateSender } from '@/shared/types/domain';
import { useAdminChatStore, useAsociatieThreads } from './adminChatStore';
import { deleteThreads, markRead, reply, startThread, toggleStatus, hydrateThreads } from './adminChatApi';
import {
  awaitingReply,
  isValidMessage,
  isValidSubject,
  sortThreads,
  threadParticipantLabel,
  unreadFor,
  waitingHours,
  PRIVATE_SUBJECT_MAX,
  PRIVATE_BODY_MAX,
} from './adminChatLogic';

/**
 * F04 - private messaging, as a role-aware inbox. The administrator (and
 * presedinte) gets an inbox of every resident's private thread and can open any
 * one to reply or start a new conversation toward a chosen apartment. A resident
 * sees only their own conversations with the administrator. Either party opens a
 * thread to read and continue it; opening marks the other side's messages read.
 */
export default function AdminChatPage() {
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const memberships = useAuthStore((s) => s.memberships);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole)();

  const isAdminView = role === 'admin' || role === 'presedinte';
  const viewer: PrivateSender = isAdminView ? 'admin' : 'resident';

  const userId =
    profile?.id ??
    memberships.find((m) => m.asociatie_id === currentAsociatieId && m.ended_at === null)?.user_id ??
    DEMO_CURRENT_USER_ID;
  const userName = profile?.full_name ?? DEMO_CURRENT_USER_NAME;
  const adminLabel = t('adminChat.administrator');

  const allThreads = useAsociatieThreads();
  const apartments = useAsociatieApartments();
  const postTimestamps = useAdminChatStore((s) => s.postTimestamps);
  const recordPost = useAdminChatStore((s) => s.recordPost);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstBody, setFirstBody] = useState('');
  const [apartmentId, setApartmentId] = useState('');

  // Bulk selection state (admin only)
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  useEffect(() => {
    if (currentAsociatieId) void hydrateThreads(currentAsociatieId);
  }, [currentAsociatieId]);

  const ordered = useMemo(() => {
    const visible = isAdminView
      ? allThreads
      : allThreads.filter((th) => th.resident_user_id === userId);
    return sortThreads(visible);
  }, [allThreads, isAdminView, userId]);

  const allSelected = ordered.length > 0 && selectedThreadIds.size === ordered.length;
  const toggleThreadSelect = (id: string) =>
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedThreadIds(allSelected ? new Set() : new Set(ordered.map((t) => t.id)));

  const selected = selectedId ? ordered.find((th) => th.id === selectedId) ?? null : null;

  const open = (id: string) => {
    if (!currentAsociatieId) return;
    setSelectedId(id);
    setReplyBody('');
    markRead(currentAsociatieId, id, viewer);
  };

  const back = () => {
    setSelectedId(null);
    setReplyBody('');
  };

  const onWriteError = () => toast.error(t('adminChat.writeFailed'));

  const send = (threadId: string) => {
    if (!currentAsociatieId || !isValidMessage(replyBody)) return;
    if (!canPostNow(postTimestamps[`${currentAsociatieId}:${userId}`] ?? [], PRIVATE_RATE_LIMIT)) {
      toast.error(t('contentGuard.rateLimited', { limit: PRIVATE_RATE_LIMIT }));
      return;
    }
    reply(currentAsociatieId, threadId, viewer, viewer === 'admin' ? adminLabel : userName, replyBody, onWriteError);
    recordPost(currentAsociatieId, userId);
    setReplyBody('');
  };

  const closeNew = () => {
    setNewOpen(false);
    setSubject('');
    setFirstBody('');
    setApartmentId('');
  };

  const pickedApartment = apartments.find((a) => a.id === apartmentId);
  const pickedResident = pickedApartment ? pickAdminThreadResident(pickedApartment) : null;
  const pickedRequiresLink = isSupabaseConfigured && pickedResident?.pending === true;
  const newValid =
    isValidSubject(subject) &&
    isValidMessage(firstBody) &&
    (!isAdminView || (Boolean(pickedApartment) && pickedResident !== null && !pickedRequiresLink));

  const submitThread = () => {
    if (!currentAsociatieId || !newValid) return;
    if (!canPostNow(postTimestamps[`${currentAsociatieId}:${userId}`] ?? [], PRIVATE_RATE_LIMIT)) {
      toast.error(t('contentGuard.rateLimited', { limit: PRIVATE_RATE_LIMIT }));
      closeNew();
      return;
    }
    if (isAdminView) {
      if (!pickedApartment || !pickedResident) return;
      if (pickedRequiresLink) {
        toast.error(t('adminChat.noLinkedResident'));
        return;
      }
      const created = startThread(currentAsociatieId, 'admin', {
        subject,
        body: firstBody,
        residentUserId: pickedResident.userId,
        residentName: pickedResident.name || apartmentShortLabel(pickedApartment),
        apartmentLabel: apartmentShortLabel(pickedApartment),
      }, onWriteError);
      toast.success(t('adminChat.threadStartedToResident'));
      setSelectedId(created.id);
    } else {
      const created = startThread(currentAsociatieId, 'resident', {
        subject,
        body: firstBody,
        residentUserId: userId,
        residentName: userName,
      }, onWriteError);
      toast.success(t('adminChat.threadStarted'));
      setSelectedId(created.id);
    }
    recordPost(currentAsociatieId, userId);
    closeNew();
  };

  const deleteSelected = () => {
    setPendingBulkDelete(true);
  };

  const confirmDeleteSelected = () => {
    if (!currentAsociatieId) return;
    const ids = [...selectedThreadIds];
    deleteThreads(currentAsociatieId, ids);
    if (selectedId && ids.includes(selectedId)) setSelectedId(null);
    setSelectedThreadIds(new Set());
    toast.success(t('adminChat.threadDeleted'));
    setPendingBulkDelete(false);
  };

  const deleteOne = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDeleteOne = () => {
    if (!currentAsociatieId || !pendingDeleteId) return;
    deleteThreads(currentAsociatieId, [pendingDeleteId]);
    if (selectedId === pendingDeleteId) setSelectedId(null);
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      next.delete(pendingDeleteId);
      return next;
    });
    toast.success(t('adminChat.threadDeleted'));
    setPendingDeleteId(null);
  };

  return (
    <div>
      <PageHeader
        title={isAdminView ? t('adminChat.inboxTitle') : t('adminChat.title')}
        subtitle={isAdminView ? t('adminChat.inboxSubtitle') : t('adminChat.subtitle')}
        action={
          !selected && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />{' '}
              {isAdminView ? t('adminChat.newToResident') : t('adminChat.newThread')}
            </Button>
          )
        }
      />

      {selected ? (
        <ConversationView
          subject={selected.subject}
          participant={threadParticipantLabel(selected, viewer, adminLabel)}
          status={selected.status}
          viewer={viewer}
          adminLabel={adminLabel}
          messages={selected.messages}
          replyBody={replyBody}
          onReplyChange={setReplyBody}
          onSend={() => send(selected.id)}
          onToggleStatus={() => currentAsociatieId && toggleStatus(currentAsociatieId, selected.id, onWriteError)}
          onBack={back}
          onDelete={isAdminView ? () => deleteOne(selected.id) : undefined}
        />
      ) : ordered.length === 0 ? (
        <EmptyState
          body={isAdminView ? t('adminChat.emptyAdmin') : t('adminChat.empty')}
          icon={<Inbox className="h-10 w-10" />}
        />
      ) : (
        <div className="space-y-3">
          {isAdminView && (
            <div className="flex items-center gap-3 py-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={allSelected ? t('adminChat.deselectAll') : t('adminChat.selectAll')}
                />
                <span>{allSelected ? t('adminChat.deselectAll') : t('adminChat.selectAll')}</span>
              </label>
              {selectedThreadIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-danger"
                  onClick={deleteSelected}
                  aria-label={t('adminChat.deleteSelected', { count: selectedThreadIds.size })}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('adminChat.deleteSelected', { count: selectedThreadIds.size })}
                </Button>
              )}
            </div>
          )}
          {ordered.map((th) => {
            const waiting = awaitingReply(th);
            const hours = waitingHours(th);
            const unread = unreadFor(th, viewer);
            return (
              <div key={th.id} className="flex items-center gap-3">
                {isAdminView && (
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-border"
                    checked={selectedThreadIds.has(th.id)}
                    onChange={() => toggleThreadSelect(th.id)}
                    aria-label={th.subject}
                  />
                )}
                <Card className="min-w-0 flex-1 p-0">
                  <div className="flex items-center gap-0">
                    <button
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 p-4 text-left"
                      onClick={() => open(th.id)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted">
                          {threadParticipantLabel(th, viewer, adminLabel)}
                        </p>
                        <p className="truncate font-medium">{th.subject}</p>
                        <p className="text-sm text-muted">
                          {t('adminChat.messageCount', { count: th.messages.length })}
                          {isAdminView && waiting && ` · ${t('adminChat.waiting', { count: hours })}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {unread > 0 && <Badge tone="primary">{unread}</Badge>}
                        <Badge tone={th.status === 'open' ? 'warning' : 'success'}>
                          {t(`adminChat.status_${th.status}`)}
                        </Badge>
                      </div>
                    </button>
                    {isAdminView && (
                      <div className="pr-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteOne(th.id)}
                          aria-label={t('adminChat.deleteThread')}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title={t('adminChat.deleteThread')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDeleteOne}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('adminChat.deleteThreadConfirm')}</p>
      </Modal>

      <Modal
        open={pendingBulkDelete}
        onClose={() => setPendingBulkDelete(false)}
        title={t('adminChat.deleteBulkTitle', { count: selectedThreadIds.size })}
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
        <p>{t('adminChat.deleteBulkConfirm', { count: selectedThreadIds.size })}</p>
      </Modal>

      <Modal
        open={newOpen}
        onClose={closeNew}
        title={isAdminView ? t('adminChat.newToResident') : t('adminChat.newThread')}
        footer={
          <>
            <Button variant="ghost" onClick={closeNew}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitThread} disabled={!newValid}>
              {t('common.send')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {isAdminView ? t('adminChat.adminPrivacyNote') : t('adminChat.privacyNote')}
          </p>
          {isAdminView && (
            <>
              <Select
                label={t('adminChat.selectApartment')}
                value={apartmentId}
                onChange={(e) => setApartmentId(e.target.value)}
              >
                <option value="">{t('adminChat.selectApartmentPlaceholder')}</option>
                {apartments.map((a) => {
                  const primary = a.persons.find((p) => p.is_primary) ?? a.persons[0];
                  const linked = apartmentHasLinkedResident(a);
                  return (
                    <option key={a.id} value={a.id}>
                      {apartmentShortLabel(a)}
                      {primary ? ` · ${primary.name}` : ''}
                      {linked ? '' : ` · ${t('adminChat.apartmentUnlinked')}`}
                    </option>
                  );
                })}
              </Select>
              {pickedResident?.pending && (
                <p className="text-xs text-warning">{t('adminChat.noLinkedResident')}</p>
              )}
            </>
          )}
          <Input
            label={t('adminChat.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('adminChat.subjectHint')}
            maxLength={PRIVATE_SUBJECT_MAX + 10}
            error={isOverLength(subject, PRIVATE_SUBJECT_MAX) ? t('contentGuard.tooLong', { max: PRIVATE_SUBJECT_MAX }) : undefined}
            hint={!isOverLength(subject, PRIVATE_SUBJECT_MAX) && charsRemaining(subject, PRIVATE_SUBJECT_MAX) <= 20 ? t('contentGuard.charsLeft', { count: Math.max(0, charsRemaining(subject, PRIVATE_SUBJECT_MAX)) }) : undefined}
          />
          <Textarea
            label={t('adminChat.message')}
            value={firstBody}
            onChange={(e) => setFirstBody(e.target.value)}
            placeholder={isAdminView ? t('adminChat.messageHintAdmin') : t('adminChat.messageHint')}
            maxLength={PRIVATE_BODY_MAX + 10}
            error={isOverLength(firstBody, PRIVATE_BODY_MAX) ? t('contentGuard.tooLong', { max: PRIVATE_BODY_MAX }) : undefined}
            hint={!isOverLength(firstBody, PRIVATE_BODY_MAX) && charsRemaining(firstBody, PRIVATE_BODY_MAX) <= 100 ? t('contentGuard.charsLeft', { count: Math.max(0, charsRemaining(firstBody, PRIVATE_BODY_MAX)) }) : undefined}
          />
        </div>
      </Modal>
    </div>
  );
}

interface ConversationViewProps {
  subject: string;
  participant: string;
  status: 'open' | 'resolved';
  viewer: PrivateSender;
  adminLabel: string;
  messages: PrivateMessage[];
  replyBody: string;
  onReplyChange: (value: string) => void;
  onSend: () => void;
  onToggleStatus: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

function ConversationView({
  subject,
  participant,
  status,
  viewer,
  adminLabel,
  messages,
  replyBody,
  onReplyChange,
  onSend,
  onToggleStatus,
  onBack,
  onDelete,
}: ConversationViewProps) {
  const { t } = useTranslation();
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <button className="flex items-center gap-2 text-sm text-muted" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('adminChat.backToInbox')}
        </button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label={t('adminChat.deleteThread')}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          )}
          <Badge tone={status === 'open' ? 'warning' : 'success'}>{t(`adminChat.status_${status}`)}</Badge>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted">{participant}</p>
        <p className="font-medium">{subject}</p>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        {messages.map((m) => {
          const mine = m.sender === viewer;
          const author = mine
            ? t('adminChat.you')
            : m.sender === 'admin'
              ? adminLabel
              : m.sender_name;
          return (
            <div
              key={m.id}
              className={mine ? 'ml-8 rounded-lg bg-primary/10 p-2' : 'mr-8 rounded-lg bg-surface-2 p-2'}
            >
              <p className="text-xs text-muted">
                {author} · {formatDateTime(m.created_at)}
              </p>
              <p className="whitespace-pre-line text-sm">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={replyBody}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder={t('adminChat.replyPlaceholder')}
          aria-label={t('adminChat.replyPlaceholder')}
          maxLength={PRIVATE_BODY_MAX + 10}
          error={isOverLength(replyBody, PRIVATE_BODY_MAX) ? t('contentGuard.tooLong', { max: PRIVATE_BODY_MAX }) : undefined}
        />
        <Button onClick={onSend} disabled={!isValidMessage(replyBody)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={onToggleStatus}>
        {status === 'open' ? t('adminChat.markResolved') : t('adminChat.reopen')}
      </Button>
    </Card>
  );
}
