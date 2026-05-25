import { describe, expect, it } from 'vitest';
import {
  parseStorageMode,
  resolveStorageCapability,
  type StorageMode,
} from '@/shared/lib/storage';

describe('parseStorageMode', () => {
  it('defaults to supabase when unset or empty', () => {
    expect(parseStorageMode(undefined)).toBe('supabase');
    expect(parseStorageMode('')).toBe('supabase');
    expect(parseStorageMode('   ')).toBe('supabase');
  });

  it('recognises local and supabase', () => {
    expect(parseStorageMode('local')).toBe('local');
    expect(parseStorageMode('LOCAL')).toBe('local');
    expect(parseStorageMode('supabase')).toBe('supabase');
  });

  it('treats none/off/disabled as disabled storage', () => {
    expect(parseStorageMode('none')).toBe('none');
    expect(parseStorageMode('off')).toBe('none');
    expect(parseStorageMode('disabled')).toBe('none');
  });

  it('falls back to supabase for unknown values', () => {
    expect(parseStorageMode('bananas')).toBe('supabase');
  });
});

describe('resolveStorageCapability', () => {
  it('supabase mode is available only when Supabase is configured', () => {
    expect(resolveStorageCapability('supabase', true)).toEqual({
      mode: 'supabase',
      available: true,
      reason: 'supabase',
    });
    expect(resolveStorageCapability('supabase', false)).toEqual({
      mode: 'supabase',
      available: false,
      reason: 'unconfigured',
    });
  });

  it('local mode is always available regardless of Supabase config', () => {
    for (const configured of [true, false]) {
      expect(resolveStorageCapability('local', configured)).toEqual({
        mode: 'local',
        available: true,
        reason: 'local',
      });
    }
  });

  it('none mode is never available', () => {
    for (const configured of [true, false]) {
      expect(resolveStorageCapability('none', configured)).toEqual({
        mode: 'none',
        available: false,
        reason: 'disabled',
      });
    }
  });

  it('covers every storage mode', () => {
    const modes: StorageMode[] = ['supabase', 'local', 'none'];
    for (const mode of modes) {
      expect(resolveStorageCapability(mode, true).mode).toBe(mode);
    }
  });
});
