import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type ApartmentInput,
  blankApartmentInput,
  blankGridRows,
  isBlankInput,
  newApartment,
  validateApartment,
} from './apartmentsLogic';
import { createApartments } from './apartmentsApi';

const FIELDS: { key: keyof ApartmentInput; width: string; type?: string; labelKey: string }[] = [
  { key: 'scara', width: 'w-16', labelKey: 'apartments.scara' },
  { key: 'etaj', width: 'w-16', type: 'number', labelKey: 'apartments.etaj' },
  { key: 'numar_apartament', width: 'w-20', labelKey: 'apartments.number' },
  { key: 'proprietar_principal_name', width: 'min-w-40', labelKey: 'apartments.owner' },
  { key: 'suprafata_utila', width: 'w-24', labelKey: 'apartments.areaShort' },
  { key: 'cota_parte_indiviza', width: 'w-24', labelKey: 'apartments.shareShort' },
  { key: 'numar_persoane', width: 'w-20', type: 'number', labelKey: 'apartments.personsShort' },
];

export default function ApartmentsBulkAddPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);

  const [count, setCount] = useState('6');
  const [rows, setRows] = useState<ApartmentInput[]>(() => blankGridRows(6));

  const applyCount = (value: string) => {
    setCount(value);
    const n = Math.max(0, Math.min(500, Math.floor(Number(value) || 0)));
    setRows((prev) => {
      if (n === prev.length) return prev;
      if (n < prev.length) return prev.slice(0, n);
      return [...prev, ...blankGridRows(n - prev.length)];
    });
  };

  const setCell = (rowIndex: number, key: keyof ApartmentInput, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r)));
  };

  const save = () => {
    if (!asociatieId) return;
    const filled = rows.filter((r) => !isBlankInput(r));
    if (filled.length === 0) {
      toast.error(t('apartments.atLeastOne'));
      return;
    }
    const invalid = filled.some((r) => Object.keys(validateApartment(r)).length > 0);
    if (invalid) {
      toast.error(t('apartments.fixErrors'));
      return;
    }
    const created = filled.map((r) => newApartment(r, asociatieId));
    createApartments(asociatieId, created);
    toast.success(t('apartments.created', { count: created.length }));
    navigate('/app/admin/apartamente');
  };

  return (
    <div>
      <PageHeader title={t('apartments.bulkTitle')} subtitle={t('apartments.bulkSubtitle')} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Input
              type="number"
              min={0}
              max={500}
              label={t('apartments.count')}
              value={count}
              onChange={(e) => applyCount(e.target.value)}
              hint={t('apartments.countHint')}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setRows((prev) => [...prev, blankApartmentInput()]);
              setCount(String(rows.length + 1));
            }}
          >
            <Plus className="h-4 w-4" /> {t('apartments.addRow')}
          </Button>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-2 py-2">{t('apartments.scara')}</th>
              <th className="px-2 py-2">{t('apartments.etaj')}</th>
              <th className="px-2 py-2">{t('apartments.number')}</th>
              <th className="px-2 py-2">{t('apartments.owner')}</th>
              <th className="px-2 py-2">{t('apartments.areaShort')}</th>
              <th className="px-2 py-2">{t('apartments.shareShort')}</th>
              <th className="px-2 py-2">{t('apartments.personsShort')}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const errs = validateApartment(row);
              const showErr = !isBlankInput(row);
              return (
                <tr key={i} className="border-t border-border align-top">
                  {FIELDS.map((f) => (
                    <td key={f.key} className="px-2 py-1.5">
                      <Input
                        type={f.type}
                        className={f.width}
                        aria-label={t(f.labelKey)}
                        value={row[f.key]}
                        error={showErr && errs[f.key] ? ' ' : undefined}
                        onChange={(e) => setCell(i, f.key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button
                      className="iconbtn"
                      style={{ width: 32, height: 32 }}
                      aria-label={t('apartments.removeRow')}
                      onClick={() => {
                        setRows((prev) => prev.filter((_, idx) => idx !== i));
                        setCount(String(Math.max(0, rows.length - 1)));
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-sm text-muted">{t('apartments.shareHint')}</p>

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={() => navigate('/app/admin/apartamente')}>
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Button>
        <Button onClick={save}>
          <Check className="h-4 w-4" /> {t('apartments.saveAll')}
        </Button>
      </div>
    </div>
  );
}
