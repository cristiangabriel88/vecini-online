import { create } from 'zustand';
import type { ReplyChip } from '@/features/assistant/engine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  /** Bold heading shown above the text (feature name / question). */
  title?: string;
  /** In-app destination for an "Open in app" button. */
  route?: string;
  routeLabel?: string;
  /** Clickable follow-up suggestions. */
  chips?: ReplyChip[];
  /** Optional muted secondary line (e.g. a follow-up). */
  note?: string;
}

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  /** True while the bot's reply is briefly delayed (typing indicator). */
  typing: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setTyping: (typing: boolean) => void;
  addMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  reset: () => void;
}

let counter = 0;
const nextId = () => `m${Date.now().toString(36)}_${counter++}`;

/**
 * Holds the assistant's open state and the (ephemeral, in-memory) conversation.
 * Messages survive navigation but reset on reload — there is nothing to persist
 * and no data ever leaves the browser.
 */
export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  messages: [],
  typing: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setTyping: (typing) => set({ typing }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: nextId() }] })),
  reset: () => set({ messages: [], typing: false }),
}));
