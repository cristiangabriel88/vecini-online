import { create } from 'zustand';
import type { SafetyProfile, TrustedContact } from '@/shared/types/domain';
import { DEMO_SAFETY_PROFILE } from '@/shared/demo/demoData';

const CURRENT_USER_ID = 'u-res';

interface SafetyState {
  profile: SafetyProfile;
  /** Update the passphrase and instructions. */
  saveDetails: (passphrase: string, note: string) => void;
  /** Append a trusted contact. */
  addContact: (name: string, relationship: string, phone: string) => void;
  /** Remove a trusted contact by id. */
  removeContact: (id: string) => void;
}

export const useSafetyStore = create<SafetyState>((set) => ({
  profile: { ...DEMO_SAFETY_PROFILE, contacts: DEMO_SAFETY_PROFILE.contacts.map((c) => ({ ...c })) },
  saveDetails: (passphrase, note) =>
    set((s) => ({
      profile: { ...s.profile, passphrase, note, updated_at: new Date().toISOString() },
    })),
  addContact: (name, relationship, phone) =>
    set((s) => {
      const contact: TrustedContact = { id: `tc-${Date.now()}`, name, relationship, phone };
      return {
        profile: {
          ...s.profile,
          contacts: [...s.profile.contacts, contact],
          updated_at: new Date().toISOString(),
        },
      };
    }),
  removeContact: (id) =>
    set((s) => ({
      profile: {
        ...s.profile,
        contacts: s.profile.contacts.filter((c) => c.id !== id),
        updated_at: new Date().toISOString(),
      },
    })),
}));

export { CURRENT_USER_ID };
