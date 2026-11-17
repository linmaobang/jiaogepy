# Security Specification — 浇个朋友 (Water a Friend)

## 1. Data Invariants
1. **Valid & Unique X Handle Only**: Every `/waterings/{wateringId}` document uses the normalized lowercase handle (without `@`, `^[a-z0-9_]{1,15}$`) as its document ID, enforcing `incoming().xHandleLower == ('@' + wateringId)` and `incoming().xHandle.lower() == incoming().xHandleLower`, `followed == false` on creation, and `createdAt == request.time`. Because `update` only permits admin follow-status toggles, duplicate watering attempts for any existing X handle are rejected at the database layer.
2. **Atomic Counter Sync**: Every `/waterings/{wateringId}` creation MUST atomically create or increment `/stats/garden` in the same transaction (`getAfter(/databases/$(database)/documents/stats/garden).data.lastWateringId == wateringId`), and `/stats/garden` can ONLY be incremented by `+1` when paired with a brand-new `/waterings/{lastWateringId}` document (`!exists(...) && existsAfter(...)`).
3. **Visitor Handle Privacy (PII / Account Isolation)**: Unauthenticated visitors and non-admin users CANNOT `get`, `list`, `update`, or `delete` `/waterings/{wateringId}`. Only the verified garden owner (`email_verified == true` and `email == "linmaobang@gmail.com"` or `/admins/{uid}`) can read or manage collected X handles.
4. **Immortal & Immutable Fields**: `xHandle`, `xHandleLower`, and `createdAt` on `/waterings/{wateringId}` are strictly immutable after creation. Admin updates may only mutate `['followed', 'followedAt']`.
5. **Path ID Hardening**: All single-document operations require `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Payloads (Expected `PERMISSION_DENIED`)
1. **Shadow Field Injection on Watering Create**: `{ xHandle: "@alice", xHandleLower: "@alice", followed: false, createdAt: serverTimestamp, isVip: true }`
2. **Pre-Marked Followed Spoof on Create**: `{ xHandle: "@alice", xHandleLower: "@alice", followed: true, createdAt: serverTimestamp }`
3. **Invalid X Handle Format / XSS Attempt**: `{ xHandle: "<script>alert(1)</script>", xHandleLower: "<script>alert(1)</script>", followed: false, createdAt: serverTimestamp }`
4. **Oversized Handle (>16 chars)**: `{ xHandle: "@averylongtwitterhandle12345", xHandleLower: "@averylongtwitterhandle12345", followed: false, createdAt: serverTimestamp }`
5. **Backdated / Forged Client Timestamp**: `{ xHandle: "@alice", xHandleLower: "@alice", followed: false, createdAt: new Date("2020-01-01") }`
6. **Orphan Watering Without Atomic Stats Update**: Creating `/waterings/w1` outside a transaction without updating `/stats/garden.lastWateringId == "w1"`.
7. **Unbacked Counter Inflation**: Updating `/stats/garden` to `totalWaterings: existing + 10` or without creating a brand-new `/waterings/{lastWateringId}` in the same transaction.
8. **Counter Replay Attack**: Updating `/stats/garden` referencing an already-existing `lastWateringId`.
9. **Unauthorized Visitor List Scraping**: Anonymous or non-admin signed-in user calling `getDocs(collection(db, "waterings"))`.
10. **Email Spoofing Attack**: Signed-in user with `email: "linmaobang@gmail.com"` but `email_verified: false` reading `/waterings`.
11. **Admin Mutating Immutable Handle**: Admin attempting to update `xHandle` on `/waterings/w1` instead of only `followed`/`followedAt`.
12. **Self-Assigned Admin Escalation**: Non-admin user attempting `setDoc(doc(db, "admins", uid), { email: "attacker@example.com", createdAt: serverTimestamp })`.
