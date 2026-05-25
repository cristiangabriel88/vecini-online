import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Inbox, Plus, Send } from 'lucide-react';
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
import { DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import type { PrivateMessage, PrivateSender } from '@/shared/types/domain';
import { useAsociatieThreads } from './adminChatStore';
import { markRead, reply, startThread, toggleStatus, hydrateThreads } from './adminChatApi';
import {
  awaitingReply,
  isValidMessage,
  isValidSubject,
  sortThreads,
  threadParticipantLabel,
  unreadFor,
  waitingHours,
} from './adminChatLogic';

/**
 * F04 — private messaging, as a role-aware inbox. The administrator (and
 * președinte) gets an inbox of every resident's private thread and can open any
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstBody, setFirstBody] = useState('');
  const [apartmentId, setApartmentId] = useState('');

  useEffect(() => {
    if (currentAsociatieId) void hydrateThreads(currentAsociatieId);
  }, [currentAsociatieId]);

  const ordered = useMemo(() => {
    const visible = isAdminView
      ? allThreads
      : allThreads.filter((th) => th.resident_user_id === userId);
    return sortThreads(visible);
  }, [allThreads, isAdminView, userId]);

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

  const send = (threadId: string) => {
    if (!currentAsociatieId || !isValidMessage(replyBody)) return;
    reply(currentAsociatieId, threadId, viewer, viewer === 'admin' ? adminLabel : userName, replyBody);
    setReplyBody('');
  };

  const closeNew = () => {
    setNewOpen(false);
    setSubject('');
    setFirstBody('');
    setApartmentId('');
  };

  const pickedApartment = apartments.find((a) => a.id === apartmentId);
  const newValid =
    isValidSubject(subject) &&
    isValidMessage(firstBody) &&
    (!isAdminView || Boolean(pickedApartment));

  const submitThread = () => {
    if (!currentAsociatieId || !newValid) return;
    if (isAdminView) {
      if (!pickedApartment) return;
      const primary =
        pickedApartment.persons.find((p) => p.is_primary) ?? pickedApartment.persons[0];
      const created = startThread(currentAsociatieId, 'admin', {
        subject,
        body: firstBody,
        residentUserId: primary?.id ?? pickedApartment.id,
        residentName: primary?.name ?? apartmentShortLabel(pickedApartment),
        apartmentLabel: apartmentShortLabel(pickedApartment),
      });
      toast.success(t('adminChat.threadStartedToResident'));
      setSelectedId(created.id);
    } else {
      const created = startThread(currentAsociatieId, 'resident', {
        subject,
        body: firstBody,
        residentUserId: userId,
        residentName: userName,
      });
      toast.success(t('adminChat.threadStarted'));
      setSelectedId(created.id);
    }
    closeNew();
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
          onToggleStatus={() => currentAsociatieId && toggleStatus(currentAsociatieId, selected.id)}
          onBack={back}
        />
      ) : ordered.length === 0 ? (
        <EmptyState
          body={isAdminView ? t('adminChat.emptyAdmin') : t('adminChat.empty')}
          icon={<Inbox className="h-10 w-10" />}
        />
      ) : (
        <div className="space-y-3">
          {ordered.map((th) => {
            const waiting = awaitingReply(th);
            const hours = waitingHours(th);
            const unread = unreadFor(th, viewer);
            return (
              <Card key={th.id} className="p-0">
                <button
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
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
              </Card>
            );
          })}
        </div>
      )}

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
            <Select
              label={t('adminChat.selectApartment')}
              value={apartmentId}
              onChange={(e) => setApartmentId(e.target.value)}
            >
              <option value="">{t('adminChat.selectApartmentPlaceholder')}</option>
              {apartments.map((a) => {
                const primary = a.persons.find((p) => p.is_primary) ?? a.persons[0];
                return (
                  <option key={a.id} value={a.id}>
                    {apartmentShortLabel(a)}
                    {primary ? ` · ${primary.name}` : ''}
                  </option>
                );
              })}
            </Select>
          )}
          <Input
            label={t('adminChat.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('adminChat.subjectHint')}
          />
          <Textarea
            label={t('adminChat.message')}
            value={firstBody}
            onChange={(e) => setFirstBody(e.target.value)}
            placeholder={isAdminView ? t('adminChat.messageHintAdmin') : t('adminChat.messageHint')}
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
}: ConversationViewProps) {
  const { t } = useTranslation();
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <button className="flex items-center gap-2 text-sm text-muted" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('adminChat.backToInbox')}
        </button>
        <Badge tone={status === 'open' ? 'warning' : 'success'}>{t(`adminChat.status_${status}`)}</Badge>
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
