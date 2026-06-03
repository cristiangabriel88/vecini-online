import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Map, Route, PawPrint, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Icon } from '@/shared/components/Icon';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId } from '@/features/polls/pollLogic';
import { useEvacuationStore, useAsociatieEvacuation } from './evacuationStore';
import { hydrateEvacuation, persistPetMarker, removePetMarker } from './evacuationApi';
import {
  equipmentIcon,
  isValidPetMarker,
  markersForApartment,
  petApartmentCount,
  sortPlans,
} from './evacuationLogic';
import type { EvacuationEquipmentKind } from '@/shared/types/domain';

export default function EvacuationPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId ?? 'demo-asoc');
  const userId = useAuthStore((s) => s.session?.user?.id ?? 'u-res');
  const fetchError = useEvacuationStore((s) => s.fetchError);
  const { plans, markers } = useAsociatieEvacuation();
  const apartments = useAsociatieApartments();

  const [open, setOpen] = useState(false);
  const [species, setSpecies] = useState('');

  useEffect(() => {
    void hydrateEvacuation(asociatieId);
  }, [asociatieId]);

  const apartmentId = findVoterApartmentId(apartments, userId) ?? 'ap-2';
  const orderedPlans = sortPlans(plans);
  const myMarker = markersForApartment(markers, apartmentId).find((m) => m.user_id === userId) ?? null;
  const petCount = petApartmentCount(markers);
  const valid = isValidPetMarker(apartmentId, species);

  const kindLabel = (k: EvacuationEquipmentKind) => t(`evacuation.equipment.${k}`);

  const submitMarker = () => {
    if (!valid) return;
    const marker = {
      id: myMarker?.id ?? `pm-${Date.now()}`,
      asociatie_id: asociatieId,
      apartment_id: apartmentId,
      apartment_label: apartments.find((a) => a.id === apartmentId)?.numar_apartament
        ? `Ap. ${apartments.find((a) => a.id === apartmentId)!.numar_apartament}`
        : '',
      species: species.trim(),
      user_id: userId,
    };
    persistPetMarker(asociatieId, marker);
    toast.success(t('evacuation.markerSaved'));
    setSpecies('');
    setOpen(false);
  };

  const onClearMarker = () => {
    if (!myMarker) return;
    removePetMarker(asociatieId, userId, apartmentId, myMarker.id);
    toast.success(t('evacuation.markerRemoved'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => void hydrateEvacuation(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('evacuation.title')} subtitle={t('evacuation.subtitle')} />

      {orderedPlans.length === 0 ? (
        <EmptyState body={t('evacuation.empty')} icon={<Map className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {orderedPlans.map((plan) => (
            <Card key={plan.id} className="p-4">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{t('evacuation.scara', { scara: plan.scara })}</h3>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-2 p-3">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm">{plan.route}</p>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {t('evacuation.fixtures')}
                </p>
                <ul className="space-y-2">
                  {plan.equipment.map((eq) => (
                    <li key={eq.id} className="flex items-center gap-2 text-sm">
                      <Icon name={equipmentIcon(eq.kind)} className="h-4 w-4 shrink-0 text-primary" />
                      <Badge tone="neutral">{kindLabel(eq.kind)}</Badge>
                      <span className="text-muted">{eq.location}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{t('evacuation.petsSection')}</h3>
          </div>
          <Badge tone="primary">{t('evacuation.petCount', { count: petCount })}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{t('evacuation.petsHint')}</p>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-3">
          {myMarker ? (
            <>
              <span className="flex items-center gap-2 text-sm">
                <PawPrint className="h-4 w-4 text-primary" />
                {t('evacuation.myMarker', { species: myMarker.species })}
              </span>
              <Button size="sm" variant="ghost" onClick={onClearMarker}>
                <Trash2 className="h-4 w-4 text-danger" /> {t('evacuation.removeMarker')}
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted">{t('evacuation.noMarker')}</span>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> {t('evacuation.addMarker')}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('evacuation.addMarker')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitMarker} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <Input
          label={t('evacuation.speciesLabel')}
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder={t('evacuation.speciesHint')}
        />
      </Modal>
    </div>
  );
}
