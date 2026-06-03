import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HardHat, Plus, Search, Star } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useContractorStore, useAsociatieContractors } from './contractorStore';
import {
  hydrateContractors,
  addContractorLive,
  rateContractorLive,
  toggleContractorAvailableLive,
} from './contractorsApi';
import { filterAvailable, isValidContractor, searchContractors, sortByRating } from './contractorLogic';

const PRICE_TIERS = ['scazut', 'mediu', 'ridicat'];

export default function ContractorsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? '');
  const fetchError = useContractorStore((s) => s.fetchError);
  const contractors = useAsociatieContractors();

  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState('5');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [priceTier, setPriceTier] = useState('mediu');
  const [contact, setContact] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateContractors(asociatieId);
  }, [asociatieId]);

  const results = useMemo(
    () => sortByRating(filterAvailable(searchContractors(contractors, query), onlyAvailable)),
    [contractors, query, onlyAvailable],
  );
  const valid = isValidContractor(name, specialty);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const contractor = {
      id: `ct-${Date.now()}`,
      asociatie_id: asociatieId,
      name: name.trim(),
      specialty: specialty.trim(),
      price_tier: priceTier,
      contact: contact.trim(),
      last_used: null,
      available: true,
      rating: 0,
      rating_count: 0,
    };
    addContractorLive(asociatieId, contractor);
    toast.success(t('contractors.added'));
    setOpen(false);
    setName('');
    setSpecialty('');
    setContact('');
    setPriceTier('mediu');
  };

  const submitRating = () => {
    if (!rateFor || !asociatieId) return;
    rateContractorLive(asociatieId, rateFor, userId, Number(rateValue));
    toast.success(t('contractors.rated'));
    setRateFor(null);
    setRateValue('5');
  };

  const handleToggleAvailable = (id: string, currentlyAvailable: boolean) => {
    if (!asociatieId) return;
    toggleContractorAvailableLive(asociatieId, id, !currentlyAvailable);
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateContractors(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('contractors.title')}
        subtitle={t('contractors.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('contractors.new')}
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder={t('contractors.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('common.search')}
          />
        </div>
        <Button
          size="sm"
          variant={onlyAvailable ? 'primary' : 'secondary'}
          onClick={() => setOnlyAvailable((v) => !v)}
        >
          {t('contractors.onlyAvailable')}
        </Button>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('contractors.empty')} icon={<HardHat className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((c) => (
            <Card key={c.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted">{c.specialty}</p>
                </div>
                <Badge tone={c.available ? 'success' : 'neutral'}>
                  {c.available ? t('contractors.available') : t('contractors.busy')}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 text-warning" aria-hidden />
                  {c.rating_count > 0 ? `${c.rating.toFixed(1)} (${c.rating_count})` : t('contractors.noRating')}
                </span>
                <Badge tone="primary">{t(`contractors.tier_${c.price_tier}`)}</Badge>
                {c.contact && <span>{c.contact}</span>}
                {c.last_used && <span>{t('contractors.lastUsed', { date: formatDate(c.last_used) })}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRateFor(c.id)}>
                  {t('contractors.rate')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleAvailable(c.id, c.available)}
                >
                  {c.available ? t('contractors.markBusy') : t('contractors.markAvailable')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('contractors.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('contractors.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t('contractors.specialty')}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
          <Select label={t('contractors.priceTier')} value={priceTier} onChange={(e) => setPriceTier(e.target.value)}>
            {PRICE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {t(`contractors.tier_${tier}`)}
              </option>
            ))}
          </Select>
          <Input label={t('contractors.contact')} value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={rateFor !== null}
        onClose={() => setRateFor(null)}
        title={t('contractors.rate')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRateFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitRating}>{t('common.save')}</Button>
          </>
        }
      >
        <Select label={t('contractors.ratingLabel')} value={rateValue} onChange={(e) => setRateValue(e.target.value)}>
          {[5, 4, 3, 2, 1, 0].map((n) => (
            <option key={n} value={n}>
              {t('contractors.stars', { count: n })}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
