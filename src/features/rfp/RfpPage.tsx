import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatLei } from '@/shared/lib/format';
import { useRfpStore } from './rfpStore';
import { cheapestQuote, isValidQuote, isValidRfp, sortRfps, sortedQuotes } from './rfpLogic';

export default function RfpPage() {
  const { t } = useTranslation();
  const { rfps, addRfp, addQuote, decide } = useRfpStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');

  const ordered = sortRfps(rfps);
  const validRfp = isValidRfp(title);
  const quoteAmount = Number(amount);
  const validQuote = isValidQuote(contractor, quoteAmount);

  const submitRfp = () => {
    if (!validRfp) return;
    addRfp({ title, description });
    toast.success(t('rfp.added'));
    setOpen(false);
    setTitle('');
    setDescription('');
  };

  const submitQuote = () => {
    if (!quoteFor || !validQuote) return;
    addQuote(quoteFor, contractor, quoteAmount);
    toast.success(t('rfp.quoteAdded'));
    setQuoteFor(null);
    setContractor('');
    setAmount('');
  };

  return (
    <div>
      <PageHeader
        title={t('rfp.title')}
        subtitle={t('rfp.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('rfp.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('rfp.empty')} icon={<FileSpreadsheet className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((r) => {
            const cheapest = cheapestQuote(r.quotes);
            return (
              <Card key={r.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    {r.description && <p className="text-sm text-muted">{r.description}</p>}
                  </div>
                  <Badge tone={r.status === 'deschis' ? 'primary' : 'success'}>
                    {t(`rfp.status_${r.status}`)}
                  </Badge>
                </div>

                {r.quotes.length === 0 ? (
                  <p className="text-sm text-muted">{t('rfp.noQuotes')}</p>
                ) : (
                  <ul className="space-y-1">
                    {sortedQuotes(r.quotes).map((q) => (
                      <li
                        key={q.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {q.contractor}
                          {q.selected && <Badge tone="success">{t('rfp.selected')}</Badge>}
                          {!q.selected && cheapest?.id === q.id && (
                            <Badge tone="primary">{t('rfp.cheapest')}</Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{formatLei(q.amount)}</span>
                          {r.status === 'deschis' && (
                            <Button size="sm" variant="ghost" onClick={() => decide(r.id, q.id)}>
                              {t('rfp.choose')}
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {r.status === 'deschis' && (
                  <Button size="sm" variant="secondary" onClick={() => setQuoteFor(r.id)}>
                    <Plus className="h-4 w-4" /> {t('rfp.addQuote')}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('rfp.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitRfp} disabled={!validRfp}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('rfp.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label={t('rfp.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={quoteFor !== null}
        onClose={() => setQuoteFor(null)}
        title={t('rfp.addQuote')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setQuoteFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitQuote} disabled={!validQuote}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('rfp.contractor')}
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
          />
          <Input
            label={t('rfp.amount')}
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
