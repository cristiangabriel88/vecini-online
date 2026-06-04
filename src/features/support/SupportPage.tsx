import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Inbox, Plus, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import type { SupportMessage } from '@/shared/types/domain';
import { useAsociatieSupportThreads, useSupportStore } from './supportStore';
import { isValidMessage, isValidSubject, sortThreads, unreadFor, awaitingReply } from './supportLogic';

/**
 * T99 -- admin-side "Contact platformă" surface. Managers (admin/presedinte/comitet)
 * can open support threads with the platform team and see replies.
 * Demo-complete; live-ready behind isSupabaseConfigured (live hydration in platformApi.ts).
 */
export default function SupportPage() {
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);

  const userId = profile?.id ?? DEMO_CURRENT_USER_ID;
  const userName = profile?.full_name ?? DEMO_CURRENT_USER_NAME;

  const allThreads = useAsociatieSupportThreads();
  const reply = useSupportStore((s) => s.reply);
  const markRead = useSupportStore((s) => s.markRead);
  const toggleStatus = useSupportStore((s) => s.toggleStatus);
  const startThread = useSupportStore((s) => s.startThread);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstBody, setFirstBody] = useState('');

  const ordered = useMemo(() => sortThreads(allThreads), [allThreads]);
  const selected = selectedId ? ordered.find((t) => t.id === selectedId) ?? null : null;

  const open = (id: string) => {
    setSelectedId(id);
    setReplyBody('');
    markRead(id, 'admin');
  };

  const back = () => {
    setSelectedId(null);
    setReplyBody('');
  };

  const send = (threadId: string) => {
    if (!isValidMessage(replyBody)) return;
    reply(threadId, 'admin', userName, replyBody);
    setReplyBody('');
  };

  const closeNew = () => {
    setNewOpen(false);
    setSubject('');
    setFirstBody('');
  };

  const submitThread = () => {
    if (!currentAsociatieId || !isValidSubject(subject) || !isValidMessage(firstBody)) return;
    const created = startThread(
      currentAsociatieId,
      profile?.full_name ?? currentAsociatieId,
      userId,
      userName,
      subject,
      firstBody,
    );
    toast.success(t('support.threadStarted'));
    setSelectedId(created.id);
    closeNew();
  };

  return (
    <div>
      <PageHeader
        title={t('support.title')}
        subtitle={t('support.subtitle')}
        action={
          !selected && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> {t('support.newThread')}
            </Button>
          )
        }
      />

      {selected ? (
        <ConversationView
          subject={selected.subject}
          status={selected.status}
          messages={selected.messages}
          replyBody={replyBody}
          onReplyChange={setReplyBody}
          onSend={() => send(selected.id)}
          onToggleStatus={() => toggleStatus(selected.id)}
          onBack={back}
        />
      ) : ordered.length === 0 ? (
        <EmptyState body={t('support.empty')} icon={<Inbox className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((th) => {
            const unread = unreadFor(th, 'admin');
            const waiting = awaitingReply(th, 'superadmin');
            return (
              <Card key={th.id} className="p-0">
                <button
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  onClick={() => open(th.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{th.subject}</p>
                    <p className="text-sm text-muted">
                      {t('support.messageCount', { count: th.messages.length })}
                      {waiting && ` · ${t('support.awaitingReply')}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {unread > 0 && <Badge tone="primary">{unread}</Badge>}
                    <Badge tone={th.status === 'open' ? 'warning' : 'success'}>
                      {t(`support.status_${th.status}`)}
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
        title={t('support.newThread')}
        footer={
          <>
            <Button variant="ghost" onClick={closeNew}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={submitThread}
              disabled={!isValidSubject(subject) || !isValidMessage(firstBody)}
            >
              {t('common.send')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('support.privacyNote')}</p>
          <Input
            label={t('support.subject')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('support.subjectHint')}
          />
          <Textarea
            label={t('support.message')}
            value={firstBody}
            onChange={(e) => setFirstBody(e.target.value)}
            placeholder={t('support.messageHint')}
          />
        </div>
      </Modal>
    </div>
  );
}

interface ConversationViewProps {
  subject: string;
  status: 'open' | 'resolved';
  messages: SupportMessage[];
  replyBody: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  onToggleStatus: () => void;
  onBack: () => void;
}

function ConversationView({
  subject,
  status,
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
          <ArrowLeft className="h-4 w-4" /> {t('support.backToInbox')}
        </button>
        <Badge tone={status === 'open' ? 'warning' : 'success'}>
          {t(`support.status_${status}`)}
        </Badge>
      </div>

      <p className="font-medium">{subject}</p>

      <div className="space-y-2 border-t border-border pt-3">
        {messages.map((m) => {
          const mine = m.sender === 'admin';
          return (
            <div
              key={m.id}
              className={mine ? 'ml-8 rounded-lg bg-primary/10 p-2' : 'mr-8 rounded-lg bg-surface-2 p-2'}
            >
              <p className="text-xs text-muted">
                {mine ? t('support.you') : t('support.platform')} · {formatDateTime(m.created_at)}
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
          placeholder={t('support.replyPlaceholder')}
          aria-label={t('support.replyPlaceholder')}
        />
        <Button onClick={onSend} disabled={!isValidMessage(replyBody)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={onToggleStatus}>
        {status === 'open' ? t('support.markResolved') : t('support.reopen')}
      </Button>
    </Card>
  );
}
