import { create } from 'zustand';
import type { ThankYou } from '@/shared/types/domain';
import { DEMO_THANK_YOUS } from '@/shared/demo/demoData';
import { formatApartmentLabel } from './thankYouLogic';

interface ThankYousState {
  items: ThankYou[];
  add: (input: { toApartment: string; message: string }) => void;
}

export const useThankYousStore = create<ThankYousState>((set) => ({
  items: [...DEMO_THANK_YOUS],
  add: ({ toApartment, message }) =>
    set((s) => ({
      items: [
        {
          id: `ty-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          from_user_id: 'u-res',
          from_name: 'Popescu Andrei',
          to_apartment: formatApartmentLabel(toApartment),
          message: message.trim(),
          created_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
}));
