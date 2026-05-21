import { useState } from 'react';
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
import { Modal } from '@/shared/components/Modal';
import { usePetsStore } from './petsStore';
import { isValidPet, PET_SPECIES, searchPets, type PetSpecies } from './petLogic';

export default function PetsPage() {
  const { t } = useTranslation();
  const { pets, add, toggleLost } = usePetsStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PetSpecies | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<PetSpecies>('caine');
  const [contact, setContact] = useState('');

  const results = searchPets(pets, query, filter);
  const valid = isValidPet(name, species);

  const submit = () => {
    if (!valid) return;
    add({ name, species, emergencyContact: contact });
    toast.success(t('pets.added'));
    setOpen(false);
    setName('');
    setSpecies('caine');
    setContact('');
  };

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
                <Button size="sm" variant="ghost" onClick={() => toggleLost(p.id)}>
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
