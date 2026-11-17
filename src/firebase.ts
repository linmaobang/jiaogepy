import { FirebaseError, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = 'linmaobang@gmail.com';
export const ROOT_OWNER_HANDLE = '@linmugua';
export const ROOT_GARDEN_ID = 'linmugua';
export const X_HANDLE_REGEX = /^@[A-Za-z0-9_]{1,15}$/;
export const HANDLE_ID_REGEX = /^[a-z0-9_]{1,15}$/;
const LOCAL_WATERED_PREFIX = 'jgp_watered_v2_';

export type SeedlingType = 'sunflower' | 'sakura' | 'pine' | 'clover';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export class DuplicateWateringError extends Error {
  readonly xHandle: string;

  constructor(xHandle: string) {
    super(`ALREADY_WATERED:${xHandle}`);
    this.name = 'DuplicateWateringError';
    this.xHandle = xHandle;
  }
}

export class GardenAlreadyClaimedError extends Error {
  readonly ownerHandle: string;

  constructor(ownerHandle: string) {
    super(`GARDEN_CLAIMED:${ownerHandle}`);
    this.name = 'GardenAlreadyClaimedError';
    this.ownerHandle = ownerHandle;
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface WateringRecord {
  id: string;
  xHandle: string;
  xHandleLower: string;
  followed: boolean;
  createdAt: Timestamp | null;
  followedAt?: Timestamp | null;
}

export interface GardenStats {
  totalWaterings: number;
  lastWateringId: string;
  updatedAt: Timestamp | null;
}

export interface UserGarden {
  id: string;
  ownerUid: string;
  ownerHandle: string;
  ownerHandleLower: string;
  seedlingType: SeedlingType;
  totalWaterings: number;
  lastWateringId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface LocalWateredState {
  xHandle: string;
  wateringNumber: number;
}

export function getLocalWateredState(gardenId: string): LocalWateredState | null {
  try {
    if (typeof window === 'undefined') return null;
    const key = `${LOCAL_WATERED_PREFIX}${gardenId.toLowerCase()}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalWateredState>;
    if (
      typeof parsed.xHandle === 'string' &&
      X_HANDLE_REGEX.test(parsed.xHandle) &&
      typeof parsed.wateringNumber === 'number' &&
      parsed.wateringNumber >= 1
    ) {
      return {
        xHandle: parsed.xHandle,
        wateringNumber: parsed.wateringNumber,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalWateredState(gardenId: string, state: LocalWateredState): void {
  try {
    if (typeof window === 'undefined') return;
    const key = `${LOCAL_WATERED_PREFIX}${gardenId.toLowerCase()}`;
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function normalizeXHandle(rawInput: string): string | null {
  const trimmed = rawInput.trim().replace(/^@+/, '');
  if (!trimmed) {
    return null;
  }
  const normalized = `@${trimmed}`;
  if (normalized.length < 2 || normalized.length > 16 || !X_HANDLE_REGEX.test(normalized)) {
    return null;
  }
  return normalized;
}

export function normalizeGardenIdParam(rawParam: string | null): string | null {
  if (!rawParam) return null;
  const cleaned = rawParam.trim().replace(/^@+/, '').toLowerCase();
  if (!cleaned || cleaned === ROOT_GARDEN_ID) return null;
  if (!HANDLE_ID_REGEX.test(cleaned)) return null;
  return cleaned;
}

export async function submitWatering(
  rawHandle: string,
  targetGardenId: string | null = null
): Promise<{ id: string; xHandle: string; wateringNumber: number }> {
  const xHandle = normalizeXHandle(rawHandle);
  if (!xHandle) {
    throw new Error('INVALID_HANDLE');
  }
  const xHandleLower = xHandle.toLowerCase();
  const visitorHandleId = xHandleLower.slice(1);

  if (!targetGardenId || targetGardenId === ROOT_GARDEN_ID) {
    const wateringRef = doc(db, 'waterings', visitorHandleId);
    const statsRef = doc(db, 'stats', 'garden');

    try {
      const nextTotal = await runTransaction(db, async (transaction) => {
        const statsSnap = await transaction.get(statsRef);
        const currentTotal = statsSnap.exists()
          ? Number(statsSnap.data()?.totalWaterings ?? 0)
          : 0;
        const updatedTotal = currentTotal + 1;

        transaction.set(wateringRef, {
          xHandle,
          xHandleLower,
          followed: false,
          createdAt: serverTimestamp(),
        });

        if (!statsSnap.exists()) {
          transaction.set(statsRef, {
            totalWaterings: 1,
            lastWateringId: visitorHandleId,
            updatedAt: serverTimestamp(),
          });
        } else {
          transaction.update(statsRef, {
            totalWaterings: updatedTotal,
            lastWateringId: visitorHandleId,
            updatedAt: serverTimestamp(),
          });
        }

        return updatedTotal;
      });

      saveLocalWateredState(ROOT_GARDEN_ID, { xHandle, wateringNumber: nextTotal });
      return { id: visitorHandleId, xHandle, wateringNumber: nextTotal };
    } catch (error) {
      const isPermissionDenied =
        (error instanceof FirebaseError && error.code === 'permission-denied') ||
        (error instanceof Error && error.message.toLowerCase().includes('permission'));

      if (isPermissionDenied) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `waterings/${visitorHandleId}`);
        } catch {
          throw new DuplicateWateringError(xHandle);
        }
      }

      handleFirestoreError(error, OperationType.WRITE, `waterings/${visitorHandleId}`);
    }
  }

  // Watering a user-claimed seedling garden (/gardens/{targetGardenId})
  const gardenRef = doc(db, 'gardens', targetGardenId);
  const childWateringRef = doc(db, 'gardens', targetGardenId, 'waterings', visitorHandleId);

  try {
    const nextTotal = await runTransaction(db, async (transaction) => {
      const gardenSnap = await transaction.get(gardenRef);
      if (!gardenSnap.exists()) {
        throw new Error('GARDEN_NOT_FOUND');
      }
      const gardenData = gardenSnap.data();
      const gardenOwnerUid = String(gardenData.ownerUid ?? '');
      const currentTotal = Number(gardenData.totalWaterings ?? 0);
      const updatedTotal = currentTotal + 1;

      transaction.set(childWateringRef, {
        gardenOwnerUid,
        xHandle,
        xHandleLower,
        followed: false,
        createdAt: serverTimestamp(),
      });

      transaction.update(gardenRef, {
        totalWaterings: updatedTotal,
        lastWateringId: visitorHandleId,
        updatedAt: serverTimestamp(),
      });

      return updatedTotal;
    });

    saveLocalWateredState(targetGardenId, { xHandle, wateringNumber: nextTotal });
    return { id: visitorHandleId, xHandle, wateringNumber: nextTotal };
  } catch (error) {
    const isPermissionDenied =
      (error instanceof FirebaseError && error.code === 'permission-denied') ||
      (error instanceof Error && error.message.toLowerCase().includes('permission'));

    if (isPermissionDenied) {
      try {
        handleFirestoreError(
          error,
          OperationType.CREATE,
          `gardens/${targetGardenId}/waterings/${visitorHandleId}`
        );
      } catch {
        throw new DuplicateWateringError(xHandle);
      }
    }

    handleFirestoreError(
      error,
      OperationType.WRITE,
      `gardens/${targetGardenId}/waterings/${visitorHandleId}`
    );
  }
}

export async function claimUserGarden(
  rawHandle: string,
  seedlingType: SeedlingType
): Promise<UserGarden> {
  const ownerHandle = normalizeXHandle(rawHandle);
  if (!ownerHandle) {
    throw new Error('INVALID_HANDLE');
  }
  const ownerHandleLower = ownerHandle.toLowerCase();
  const gardenId = ownerHandleLower.slice(1);

  if (gardenId === ROOT_GARDEN_ID) {
    throw new GardenAlreadyClaimedError(ownerHandle);
  }

  let currentUser = auth.currentUser;
  if (!currentUser) {
    currentUser = await signInWithGoogle();
  }

  const gardenRef = doc(db, 'gardens', gardenId);
  try {
    const existingSnap = await getDoc(gardenRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.ownerUid !== currentUser.uid) {
        throw new GardenAlreadyClaimedError(ownerHandle);
      }
      if (data.seedlingType !== seedlingType) {
        await updateDoc(gardenRef, {
          seedlingType,
          updatedAt: serverTimestamp(),
        });
      }
      const updatedSnap = await getDoc(gardenRef);
      const updated = updatedSnap.data()!;
      return {
        id: gardenId,
        ownerUid: String(updated.ownerUid),
        ownerHandle: String(updated.ownerHandle),
        ownerHandleLower: String(updated.ownerHandleLower),
        seedlingType: (updated.seedlingType as SeedlingType) ?? seedlingType,
        totalWaterings: Number(updated.totalWaterings ?? 0),
        lastWateringId: String(updated.lastWateringId ?? ''),
        createdAt: (updated.createdAt as Timestamp | null) ?? null,
        updatedAt: (updated.updatedAt as Timestamp | null) ?? null,
      };
    }

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gardenRef);
      if (snap.exists()) {
        throw new GardenAlreadyClaimedError(ownerHandle);
      }
      tx.set(gardenRef, {
        ownerUid: currentUser!.uid,
        ownerHandle,
        ownerHandleLower,
        seedlingType,
        totalWaterings: 0,
        lastWateringId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const createdSnap = await getDoc(gardenRef);
    const created = createdSnap.data()!;
    return {
      id: gardenId,
      ownerUid: String(created.ownerUid),
      ownerHandle: String(created.ownerHandle),
      ownerHandleLower: String(created.ownerHandleLower),
      seedlingType: (created.seedlingType as SeedlingType) ?? seedlingType,
      totalWaterings: Number(created.totalWaterings ?? 0),
      lastWateringId: String(created.lastWateringId ?? ''),
      createdAt: (created.createdAt as Timestamp | null) ?? null,
      updatedAt: (created.updatedAt as Timestamp | null) ?? null,
    };
  } catch (error) {
    if (error instanceof GardenAlreadyClaimedError) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `gardens/${gardenId}`);
  }
}

export function subscribeGardenStats(
  onUpdate: (stats: GardenStats | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'stats/garden';
  const statsRef = doc(db, 'stats', 'garden');
  return onSnapshot(
    statsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({ totalWaterings: 0, lastWateringId: '', updatedAt: null });
        return;
      }
      const data = snapshot.data();
      onUpdate({
        totalWaterings: Number(data.totalWaterings ?? 0),
        lastWateringId: String(data.lastWateringId ?? ''),
        updatedAt: (data.updatedAt as Timestamp | null) ?? null,
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

export function subscribeUserGarden(
  gardenId: string,
  onUpdate: (garden: UserGarden | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `gardens/${gardenId}`;
  return onSnapshot(
    doc(db, 'gardens', gardenId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      const data = snapshot.data();
      onUpdate({
        id: snapshot.id,
        ownerUid: String(data.ownerUid ?? ''),
        ownerHandle: String(data.ownerHandle ?? ''),
        ownerHandleLower: String(data.ownerHandleLower ?? ''),
        seedlingType: (data.seedlingType as SeedlingType) ?? 'sunflower',
        totalWaterings: Number(data.totalWaterings ?? 0),
        lastWateringId: String(data.lastWateringId ?? ''),
        createdAt: (data.createdAt as Timestamp | null) ?? null,
        updatedAt: (data.updatedAt as Timestamp | null) ?? null,
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

export function subscribeMyClaimedGardens(
  uid: string,
  onUpdate: (gardens: UserGarden[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'gardens'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserGarden[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ownerUid: String(data.ownerUid ?? ''),
          ownerHandle: String(data.ownerHandle ?? ''),
          ownerHandleLower: String(data.ownerHandleLower ?? ''),
          seedlingType: (data.seedlingType as SeedlingType) ?? 'sunflower',
          totalWaterings: Number(data.totalWaterings ?? 0),
          lastWateringId: String(data.lastWateringId ?? ''),
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          updatedAt: (data.updatedAt as Timestamp | null) ?? null,
        };
      });
      list.sort((a, b) => b.totalWaterings - a.totalWaterings);
      onUpdate(list);
    },
    (error) => onError(error)
  );
}

export function subscribeWaterings(
  onUpdate: (records: WateringRecord[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const path = 'waterings';
  const q = query(collection(db, path));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WateringRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          xHandle: String(data.xHandle ?? ''),
          xHandleLower: String(data.xHandleLower ?? ''),
          followed: Boolean(data.followed),
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          followedAt: (data.followedAt as Timestamp | null) ?? null,
        };
      });
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis() ?? 0;
        const tb = b.createdAt?.toMillis() ?? 0;
        return tb - ta;
      });
      onUpdate(list);
    },
    (error) => onError(error)
  );
}

export function subscribeGardenWaterings(
  gardenId: string,
  ownerUid: string,
  onUpdate: (records: WateringRecord[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, 'gardens', gardenId, 'waterings'),
    where('gardenOwnerUid', '==', ownerUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WateringRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          xHandle: String(data.xHandle ?? ''),
          xHandleLower: String(data.xHandleLower ?? ''),
          followed: Boolean(data.followed),
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          followedAt: (data.followedAt as Timestamp | null) ?? null,
        };
      });
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis() ?? 0;
        const tb = b.createdAt?.toMillis() ?? 0;
        return tb - ta;
      });
      onUpdate(list);
    },
    (error) => onError(error)
  );
}

export async function toggleFollowedStatus(
  wateringId: string,
  nextFollowed: boolean,
  gardenId?: string
): Promise<void> {
  const docRef =
    gardenId && gardenId !== ROOT_GARDEN_ID
      ? doc(db, 'gardens', gardenId, 'waterings', wateringId)
      : doc(db, 'waterings', wateringId);
  const path =
    gardenId && gardenId !== ROOT_GARDEN_ID
      ? `gardens/${gardenId}/waterings/${wateringId}`
      : `waterings/${wateringId}`;
  try {
    await updateDoc(docRef, {
      followed: nextFollowed,
      followedAt: nextFollowed ? serverTimestamp() : deleteField(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWateringRecord(
  wateringId: string,
  gardenId?: string
): Promise<void> {
  const isCustomGarden = Boolean(gardenId && gardenId !== ROOT_GARDEN_ID);
  const docRef = isCustomGarden
    ? doc(db, 'gardens', gardenId!, 'waterings', wateringId)
    : doc(db, 'waterings', wateringId);
  const counterRef = isCustomGarden
    ? doc(db, 'gardens', gardenId!)
    : doc(db, 'stats', 'garden');
  const path = isCustomGarden
    ? `gardens/${gardenId}/waterings/${wateringId}`
    : `waterings/${wateringId}`;

  try {
    await runTransaction(db, async (transaction) => {
      const [recordSnap, counterSnap] = await Promise.all([
        transaction.get(docRef),
        transaction.get(counterRef),
      ]);
      if (!recordSnap.exists()) {
        return;
      }

      transaction.delete(docRef);

      if (counterSnap.exists()) {
        const counterData = counterSnap.data();
        const currentTotal = Number(counterData?.totalWaterings ?? 0);
        const hasLastWateringId = typeof counterData?.lastWateringId === 'string';
        if (currentTotal > 0 && hasLastWateringId) {
          transaction.update(counterRef, {
            totalWaterings: Math.max(0, currentTotal - 1),
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
  } catch (txError) {
    // Fallback: if counter doc uses an older schema, still allow deleting the test record
    try {
      await deleteDoc(docRef);
    } catch (deleteError) {
      handleFirestoreError(deleteError ?? txError, OperationType.DELETE, path);
    }
  }
}

export async function syncGardenWateringCount(
  targetCount: number,
  gardenId?: string
): Promise<void> {
  const safeCount = Math.max(0, Math.floor(targetCount));
  const isCustomGarden = Boolean(gardenId && gardenId !== ROOT_GARDEN_ID);
  const counterRef = isCustomGarden
    ? doc(db, 'gardens', gardenId!)
    : doc(db, 'stats', 'garden');
  const path = isCustomGarden ? `gardens/${gardenId}` : 'stats/garden';

  try {
    await updateDoc(counterRef, {
      totalWaterings: safeCount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
