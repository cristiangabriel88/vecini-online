import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lock, Plus, Phone, Trash2, KeyRound, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { useSafetyStore } from './safetyStore';
import { isValidContact, isValidPassphrase, sortContacts, telHref } from './safetyLogic';

export default function SafetyCodePage() {
  const { t } = useTranslation();
  const { profile, saveDetails, addContact, removeContact } = useSafetyStore();

  const [passphrase, setPassphrase] = useState(profile.passphrase);
  const [note, setNote] = useState(profile.note);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  const detailsValid = isValidPassphrase(passphrase);
  const contactValid = isValidContact(name, phone);
  const contacts = sortContacts(profile.contacts);

  const saveProfile = () => {
    if (!detailsValid) return;
    saveDetails(passphrase.trim(), note.trim());
    toast.success(t('safety.saved'));
  };

  const submitContact = () => {
    if (!contactValid) return;
    addContact(name.trim(), relationship.trim(), phone.trim());
    toast.success(t('safety.contactAdded'));
    setName('');
    setRelationship('');
    setPhone('');
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title={t('safety.title')} subtitle={t('safety.subtitle')} />

      <Card className="mb-4 flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted">{t('safety.privacyNote')}</p>
      </Card>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">{t('safety.passphraseSection')}</h3>
        </div>
        <div className="space-y-3">
          <Input
            label={t('safety.passphraseLabel')}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={t('safety.passphraseHint')}
          />
          <Textarea
            label={t('safety.noteLabel')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('safety.noteHint')}
          />
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={!detailsValid}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">{t('safety.contactsSection')}</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t('safety.addContact')}
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState body={t('safety.empty')} icon={<ShieldCheck className="h-10 w-10" />} />
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                {c.relationship && <p className="text-sm text-muted">{c.relationship}</p>}
              </div>
              <div className="flex items-center gap-1">
                <a href={telHref(c.phone)} aria-label={`${t('safety.call')} ${c.name}`}>
                  <Button size="sm" variant="ghost">
                    <Phone className="h-4 w-4" /> {c.phone}
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('safety.removeContact')}
                  onClick={() => removeContact(c.id)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('safety.addContact')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitContact} disabled={!contactValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('safety.nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('safety.nameHint')}
          />
          <Input
            label={t('safety.relationshipLabel')}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder={t('safety.relationshipHint')}
          />
          <Input
            label={t('safety.phoneLabel')}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('safety.phoneHint')}
          />
        </div>
      </Modal>
    </div>
  );
}
