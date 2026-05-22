import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MessageCircle, Plus, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useAdminChatStore } from './adminChatStore';
import {
  awaitingReply,
  isValidMessage,
  isValidSubject,
  sortThreads,
  unreadFromAdmin,
  waitingHours,
} from './adminChatLogic';

export default function AdminChatPage() {
  const { t } = useTranslation();
  const { threads, startThread, reply, markRead, toggleStatus } = useAdminChatStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstBody, setFirstBody] = useState('');

  const ordered = sortThreads(threads);

  const expand = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    setReplyBody('');
    if (next) markRead(next);
  };

  const send = (threadId: string) => {
    if (!isValidMessage(replyBody)) return;
    reply(threadId, replyBody);
    setReplyBody('');
  };

  const submitThread = () => {
    if (!isValidSubject(subject) || !isValidMessage(firstBody)) return;
    startThread(subject, firstBody);
    toast.success(t('adminChat.threadStarted'));
    setNewOpen(false);
    setSubject('');
    setFirstBody('');
  };

  const newValid = isValidSubject(subject) && isValidMessage(firstBody);

  return (
    <div>
      <PageHeader
        title={t('adminChat.title')}
        subtitle={t('adminChat.subtitle')}
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> {t('adminChat.newThread')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('adminChat.empty')} icon={<MessageCircle className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((th) => {
            const expanded = openId === th.id;
            const waiting = awaitingReply(th);
            const hours = waitingHours(th);
            const unread = unreadFromAdmin(th);
            return (
              <Card key={th.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button className="text-left" onClick={() => expand(th.id)}>
                    <p className="font-medium">{th.subject}</p>
                    <p className="text-sm text-muted">
                      {t('adminChat.messageCount', { count: th.messages.length })}
                      {waiting && ` · ${t('adminChat.waiting', { count: hours })}`}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    {unread > 0 && <Badge tone="primary">{unread}</Badge>}
                    <Badge tone={th.status === 'open' ? 'warning' : 'success'}>
                      {t(`adminChat.status_${th.status}`)}
                    </Badge>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="space-y-2">
                      {th.messages.map((m) => (
                        <div
                          key={m.id}
                          className={
                            m.sender === 'resident'
                              ? 'ml-8 rounded-lg bg-primary/10 p-2'
                              : 'mr-8 rounded-lg bg-surface-2 p-2'
                          }
                        >
                          <p className="text-xs text-muted">
                            {m.sender === 'resident'
                              ? t('adminChat.you')
                              : t('adminChat.administrator')}{' '}
                            · {formatDateTime(m.created_at)}
                          </p>
                          <p className="whitespace-pre-line text-sm">{m.body}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={t('adminChat.replyPlaceholder')}
                        aria-label={t('adminChat.replyPlaceholder')}
                      />
                      <Button onClick={() => send(th.id)} disabled={!isValidMessage(replyBody)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(th.id)}>
                      {th.status === 'open' ? t('adminChat.markResolved') : t('adminChat.reopen')}
                    </Button>
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
        title={t('adminChat.newThread')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitThread} disabled={!newValid}>
              {t('common.send')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('adminChat.privacyNote')}</p>
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
            placeholder={t('adminChat.messageHint')}
          />
        </div>
      </Modal>
    </div>
  );
}
