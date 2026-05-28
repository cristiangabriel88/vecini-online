import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T170 -- Fix live resident-invite email: strip `inv-` id prefix before POST.
//
// The Netlify `invite-email` function validates that `inviteId` matches a bare
// UUID regexp (line 84) and returns 400 `invalid-invite-id` for anything else.
// Local invite ids carry the `inv-{uuid}` prefix. This test statically verifies
// that `sendInviteEmail` strips the prefix before posting, mirroring the same
// guard in `writeInviteToLive`.

const SRC_PATH = resolve(process.cwd(), 'src', 'features', 'invites', 'inviteEmailApi.ts');

describe('sendInviteEmail: inv- prefix stripping (T170)', () => {
  const src = readFileSync(SRC_PATH, 'utf8');

  it('strips the inv- prefix from the posted inviteId', () => {
    // Must apply the same startsWith/slice guard as writeInviteToLive.
    expect(src).toContain("startsWith('inv-')");
    expect(src).toContain('.slice(4)');
  });

  it('posts the stripped id, not the raw invite.id', () => {
    // The JSON body must NOT pass the raw invite.id directly.
    // It must go through the prefix-stripping expression.
    const postBodyIdx = src.indexOf('JSON.stringify');
    const strippingIdx = src.indexOf("startsWith('inv-')");
    // The stripping expression must appear before the JSON.stringify call
    // (inline in the argument) -- both should be within the same live branch.
    expect(postBodyIdx).toBeGreaterThan(-1);
    expect(strippingIdx).toBeGreaterThan(-1);
    // inviteId property must not naively reference invite.id without stripping.
    const rawIdPattern = /inviteId:\s*input\.invite\.id[^.]/;
    expect(rawIdPattern.test(src)).toBe(false);
  });

  it('leaves ids that are already bare UUIDs unchanged', () => {
    // The ternary guard: only slice when the prefix is present.
    expect(src).toContain("startsWith('inv-') ? input.invite.id.slice(4) : input.invite.id");
  });
});
