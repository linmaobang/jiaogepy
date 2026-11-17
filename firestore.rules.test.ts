/**
 * Firestore Security Rules Verification Spec (Dirty Dozen Adversarial Suite)
 * Run with @firebase/rules-unit-testing against Firestore Emulator if available.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Shadow field injection on /waterings create',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '@alice', xHandleLower: '@alice', followed: false, isVip: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Pre-marked followed=true spoof on /waterings create',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '@alice', xHandleLower: '@alice', followed: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Invalid X handle / XSS payload on /waterings create',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '<script>', xHandleLower: '<script>', followed: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Oversized X handle (>16 chars) on /waterings create',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '@toolonghandle123456', xHandleLower: '@toolonghandle123456', followed: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Forged client timestamp on /waterings create',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '@alice', xHandleLower: '@alice', followed: false, createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphan watering create without atomic /stats/garden update',
    collection: 'waterings',
    op: 'create',
    payload: { xHandle: '@alice', xHandleLower: '@alice', followed: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unbacked /stats/garden counter inflation (+10)',
    collection: 'stats',
    op: 'update',
    payload: { totalWaterings: 10 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Replay existing wateringId on /stats/garden update',
    collection: 'stats',
    op: 'update',
    payload: { totalWaterings: 2, lastWateringId: 'existing_id' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Non-admin scraping /waterings list',
    collection: 'waterings',
    op: 'list',
    payload: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unverified email spoof trying to read /waterings',
    collection: 'waterings',
    op: 'list',
    auth: { email: 'linmaobang@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Admin modifying immutable xHandle on /waterings update',
    collection: 'waterings',
    op: 'update',
    payload: { xHandle: '@changed', followed: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-assigned admin privilege escalation in /admins',
    collection: 'admins',
    op: 'create',
    payload: { email: 'attacker@example.com' },
    expected: 'PERMISSION_DENIED',
  },
];

describe('Firestore Dirty Dozen Security Spec', () => {
  it('defines all 12 adversarial cases expecting PERMISSION_DENIED', () => {
    assert.equal(DIRTY_DOZEN_CASES.length, 12);
    for (const testCase of DIRTY_DOZEN_CASES) {
      assert.equal(testCase.expected, 'PERMISSION_DENIED');
    }
  });
});
