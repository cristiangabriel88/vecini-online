import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';

describe('fetchError state in content stores (T83)', () => {
  beforeEach(() => {
    useAnnouncementsStore.setState({ fetchError: null });
    useTicketsStore.setState({ fetchError: null });
    useDiscussionStore.setState({ fetchError: null });
  });

  describe('announcementsStore', () => {
    it('starts with fetchError null', () => {
      expect(useAnnouncementsStore.getState().fetchError).toBeNull();
    });

    it('setFetchError sets a non-null message', () => {
      useAnnouncementsStore.getState().setFetchError('load');
      expect(useAnnouncementsStore.getState().fetchError).toBe('load');
    });

    it('setFetchError(null) clears the error', () => {
      useAnnouncementsStore.getState().setFetchError('load');
      useAnnouncementsStore.getState().setFetchError(null);
      expect(useAnnouncementsStore.getState().fetchError).toBeNull();
    });
  });

  describe('ticketsStore', () => {
    it('starts with fetchError null', () => {
      expect(useTicketsStore.getState().fetchError).toBeNull();
    });

    it('setFetchError sets a non-null message', () => {
      useTicketsStore.getState().setFetchError('load');
      expect(useTicketsStore.getState().fetchError).toBe('load');
    });

    it('setFetchError(null) clears the error', () => {
      useTicketsStore.getState().setFetchError('load');
      useTicketsStore.getState().setFetchError(null);
      expect(useTicketsStore.getState().fetchError).toBeNull();
    });
  });

  describe('discussionStore', () => {
    it('starts with fetchError null', () => {
      expect(useDiscussionStore.getState().fetchError).toBeNull();
    });

    it('setFetchError sets a non-null message', () => {
      useDiscussionStore.getState().setFetchError('load');
      expect(useDiscussionStore.getState().fetchError).toBe('load');
    });

    it('setFetchError(null) clears the error', () => {
      useDiscussionStore.getState().setFetchError('load');
      useDiscussionStore.getState().setFetchError(null);
      expect(useDiscussionStore.getState().fetchError).toBeNull();
    });
  });
});
