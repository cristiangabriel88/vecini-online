import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PawPrint, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { usePetsStore, useAsociatiePets } from './petsStore';
import { hydratePets, addPetLive, togglePetLostLive } from './petsApi';
import { isValidPet, PET_SPECIES, searchPets, type PetSpecies } from './petLogic';

export default function PetsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = usePetsStore((s) => s.fetchError);
  const pets = useAsociatiePets();
  const { userId, email } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PetSpecies | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('caine');
  const [contact, setContact] = useState('');

  useEffect(() => {
    if (asociatieId) void hydratePets(asociatieId);
  }, [asociatieId]);

  const results = searchPets(pets, query, filter);
  const valid = isValidPet(name, species);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const profile = profileGet(userId, email);
    const ownerName = profile.fullName || profile.displayName || 'Rezident';
    const newPet = {
      id: `pet-${Date.now()}`,
      asociatie_id: asociatieId,
      owner_user_id: userId ?? 'u-res',
      owner_name: ownerName,
      name: name.trim(),
      species: species.trim(),
      photo_path: null,
      emergency_contact: contact.trim() || null,
      lost: false,
      created_at: new Date().toISOString(),
    };
    addPetLive(asociatieId, newPet);
    toast.success(t('pets.added'));
    setOpen(false);
    setName('');
    setSpecies('caine');
    setContact('');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydratePets(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('pets.title')}
        subtitle={t('pets.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('pets.new')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('pets.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select
          aria-label={t('pets.species')}
          value={filter}
          onChange={(e) => setFilter(e.target.value as PetSpecies | 'all')}
        >
          <option value="all">{t('common.all')}</option>
          {PET_SPECIES.map((sp) => (
            <option key={sp} value={sp}>
              {t(`pets.species_${sp}`)}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('pets.empty')} icon={<PawPrint className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {p.name} <span className="text-muted">· {t(`pets.species_${p.species}`)}</span>
                </p>
                <p className="text-sm text-muted">
                  {p.owner_name}
                  {p.emergency_contact && ` · ${p.emergency_contact}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.lost && <Badge tone="danger">{t('pets.lost')}</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    asociatieId && togglePetLostLive(asociatieId, p.id, !p.lost)
                  }
                >
                  {p.lost ? t('pets.markFound') : t('pets.markLost')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('pets.new')}
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
          <Input label={t('pets.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label={t('pets.species')}
            value={species}
            onChange={(e) => setSpecies(e.target.value as PetSpecies)}
          >
            {PET_SPECIES.map((sp) => (
              <option key={sp} value={sp}>
                {t(`pets.species_${sp}`)}
              </option>
            ))}
          </Select>
          <Input
            label={t('pets.emergencyContact')}
            placeholder={t('pets.emergencyContactHint')}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
