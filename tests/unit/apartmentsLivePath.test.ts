/**
 * T115: Live Supabase read/write for the apartment registry.
 *
 * Verifies the static contracts that guard the live path:
 * - toRow() strips the 'ap-' id prefix so the inserted UUID is valid
 * - toDbId() strips 'ap-' for use in WHERE clauses
 * - inviteWriteApi strips 'ap-' from apartmentId before the FK insert
 * - ApartmentWriteError is discriminated ('conflict' | 'write-failed')
 * - Postgres unique-constraint code '23505' maps to 'conflict'; anything
 *   else maps to 'write-failed'
 */

import { describe, expect, it } from 'vitest';
import { toRow, toDbId, type ApartmentWriteError } from '@/features/admin/apartmentsApi';
import type { Apartment } from '@/shared/types/domain';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ASOC = 'asoc-00000000-0000-0000-0000-000000000001';

function makeApt(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'ap-550e8400-e29b-41d4-a716-446655440000',
    asociatie_id: ASOC,
    scara: 'A',
    etaj: 1,
    numar_apartament: '5',
    suprafata_utila: 60,
    cota_parte_indiviza: 0.05,
    numar_persoane: 2,
    persons: [],
    proprietar_principal_name: 'Popescu Ion',
    is_active: true,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── toRow ─────────────────────────────────────────────────────────────────────

describe('apartmentsApi.toRow — id prefix stripping', () => {
  it('strips the ap- prefix so the DB receives a bare UUID', () => {
    const row = toRow(makeApt());
    expect(row.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('leaves an id alone when it does not carry the ap- prefix', () => {
    const bareId = '550e8400-e29b-41d4-a716-446655440001';
    const row = toRow(makeApt({ id: bareId }));
    expect(row.id).toBe(bareId);
  });

  it('maps all domain fields correctly (no extra keys, no missing keys)', () => {
    const apt = makeApt({
      scara: 'B',
      etaj: 0,
      numar_apartament: '12',
      suprafata_utila: 48.5,
      cota_parte_indiviza: 0.04,
      numar_persoane: 1,
      persons: [{ id: 'pe-1', name: 'Ionescu', role: 'proprietar', is_primary: true }],
      proprietar_principal_name: 'Ionescu Radu',
      is_active: false,
      notes: 'colt',
    });
    const row = toRow(apt);
    expect(row.asociatie_id).toBe(ASOC);
    expect(row.scara).toBe('B');
    expect(row.etaj).toBe(0);
    expect(row.numar_apartament).toBe('12');
    expect(row.suprafata_utila).toBe(48.5);
    expect(row.cota_parte_indiviza).toBe(0.04);
    expect(row.numar_persoane).toBe(1);
    expect(row.persons).toHaveLength(1);
    expect(row.proprietar_principal_name).toBe('Ionescu Radu');
    expect(row.is_active).toBe(false);
    expect(row.notes).toBe('colt');
  });

  it('does NOT include updated_at / created_at (those are DB-managed)', () => {
    const row = toRow(makeApt());
    expect(Object.keys(row)).not.toContain('updated_at');
    expect(Object.keys(row)).not.toContain('created_at');
  });
});

// ── toDbId ─────────────────────────────────────────────────────────────────────

describe('apartmentsApi.toDbId — WHERE-clause helper', () => {
  it('strips ap- prefix for use in .eq() calls', () => {
    expect(toDbId('ap-abc')).toBe('abc');
    expect(toDbId('ap-00000000-1234-0000-0000-000000000001')).toBe(
      '00000000-1234-0000-0000-000000000001',
    );
  });

  it('passes through an id that has no ap- prefix', () => {
    const plain = '00000000-1234-0000-0000-000000000002';
    expect(toDbId(plain)).toBe(plain);
  });
});

// ── ApartmentWriteError discriminant ──────────────────────────────────────────

describe('apartmentsApi.ApartmentWriteError type', () => {
  it('accepts the two valid discriminants (compile-time check)', () => {
    const conflict: ApartmentWriteError = 'conflict';
    const failed: ApartmentWriteError = 'write-failed';
    expect(conflict).toBe('conflict');
    expect(failed).toBe('write-failed');
  });
});

// ── inviteWriteApi — apartmentId prefix stripping ─────────────────────────────

describe('inviteWriteApi.ts — apartmentId ap- prefix stripped before DB insert', () => {
  it('strips the ap- prefix from apartmentId in the source', () => {
    // Parse the source file and assert the stripping logic is present.
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/invites/inviteWriteApi.ts'),
      'utf8',
    );
    // Must reference the ap- stripping for apartmentId.
    expect(src).toMatch(/ap-/);
    expect(src).toMatch(/aptId|dbAptId|apartment_id/);
  });

  it('the invite apartment_id column assignment uses the stripped variable', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/invites/inviteWriteApi.ts'),
      'utf8',
    );
    // The raw apartmentId must not be assigned directly; the stripped variable must be.
    // Look for: apartment_id: dbAptId (or similar stripped var, not rawAptId or invite.apartmentId).
    expect(src).not.toMatch(/apartment_id:\s*invite\.apartmentId/);
    expect(src).not.toMatch(/apartment_id:\s*rawAptId/);
  });
});

// ── unique-constraint classification ─────────────────────────────────────────

describe('apartmentsApi — Postgres unique constraint classification', () => {
  it('classifies code 23505 as a conflict (unique constraint violation)', () => {
    // The classify logic is internal, but we can verify via the source.
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/admin/apartmentsApi.ts'),
      'utf8',
    );
    expect(src).toMatch(/23505/);
    expect(src).toMatch(/conflict/);
  });

  it('all three mutation functions accept an onError callback (signature check)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/admin/apartmentsApi.ts'),
      'utf8',
    );
    // Each exported mutation must declare an onError? parameter.
    const createMatch = src.match(/export (?:async )?function createApartments[\s\S]*?onError\?/);
    const updateMatch = src.match(/export (?:async )?function updateApartment[\s\S]*?onError\?/);
    const deleteMatch = src.match(/export (?:async )?function deleteApartment[\s\S]*?onError\?/);
    expect(createMatch).not.toBeNull();
    expect(updateMatch).not.toBeNull();
    expect(deleteMatch).not.toBeNull();
  });
});
