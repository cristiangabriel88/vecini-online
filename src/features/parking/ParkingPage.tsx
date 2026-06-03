import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Car, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { countFree, isOccupied, isValidSpot, residentPlateSuggestion, searchSpots, sortSpots } from './parkingLogic';
import { useParkingStore, useAsociatieParking } from './parkingStore';
import { hydrateParking, addParkingSpot } from './parkingApi';

export default function ParkingPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useParkingStore((s) => s.fetchError);
  const spots = useAsociatieParking();
  const { userId, email } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const myPlate = residentPlateSuggestion(profileGet(userId, email).carPlate);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState('');
  const [isVisitor, setIsVisitor] = useState(false);
  const [apartmentLabel, setApartmentLabel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateParking(asociatieId);
  }, [asociatieId]);

  const list = sortSpots(searchSpots(spots, query));
  const free = countFree(spots);
  const valid = isValidSpot(label);

  const openModal = () => {
    setLabel('');
    setZone('');
    setIsVisitor(false);
    setApartmentLabel('');
    setLicensePlate(myPlate ?? '');
    setOpen(true);
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    const spot = {
      id: `pk-${Date.now()}`,
      asociatie_id: asociatieId,
      label: label.trim(),
      zone: zone.trim() || null,
      is_visitor: isVisitor,
      apartment_label: apartmentLabel.trim() || null,
      license_plate: licensePlate.trim() || null,
    };
    addParkingSpot(asociatieId, spot);
    toast.success(t('parking.added'));
    setOpen(false);
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateParking(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('parking.title')}
        subtitle={t('parking.subtitle')}
        action={
          <Button onClick={openModal}>
            <Plus className="h-4 w-4" /> {t('parking.new')}
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <Input
          placeholder={t('parking.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-sm text-muted">{t('parking.freeCount', { n: free })}</p>
      </div>

      {list.length === 0 ? (
        <EmptyState body={t('parking.empty')} icon={<Car className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <Card key={s.id} className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {s.label}
                  {s.zone && <span className="text-muted"> · {s.zone}</span>}
                </p>
                {isOccupied(s) ? (
                  <p className="text-sm text-text">
                    {s.apartment_label}
                    {s.license_plate && <span className="text-muted"> · {s.license_plate}</span>}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{t('parking.unassigned')}</p>
                )}
              </div>
              {s.is_visitor ? (
                <Badge tone="primary">{t('parking.visitor')}</Badge>
              ) : isOccupied(s) ? (
                <Badge tone="neutral">{t('parking.occupied')}</Badge>
              ) : (
                <Badge tone="success">{t('parking.free')}</Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('parking.new')}
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
        <div className="space-y-4">
          <Input label={t('parking.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input label={t('parking.zone')} value={zone} onChange={(e) => setZone(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={isVisitor} onChange={(e) => setIsVisitor(e.target.checked)} />
            {t('parking.isVisitor')}
          </label>
          <Input label={t('parking.apartment')} value={apartmentLabel} onChange={(e) => setApartmentLabel(e.target.value)} />
          <div>
            <Input label={t('parking.plate')} value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            {myPlate && licensePlate === myPlate && (
              <p className="mt-1 text-xs text-muted">{t('parking.plateFromProfile')}</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
