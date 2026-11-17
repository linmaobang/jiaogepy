import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  ADMIN_EMAIL,
  deleteWateringRecord,
  ROOT_GARDEN_ID,
  ROOT_OWNER_HANDLE,
  signInWithGoogle,
  signOutAdmin,
  subscribeGardenWaterings,
  subscribeMyClaimedGardens,
  subscribeWaterings,
  toggleFollowedStatus,
  type UserGarden,
  type WateringRecord,
} from '../firebase';
import { getSeedlingMeta } from '../utils/friendCard';

interface OwnerInboxDrawerProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onOpenClaim: () => void;
  onEnterGarden: (gardenId: string | null) => void;
}

type FilterMode = 'all' | 'pending' | 'followed';

function formatTime(record: WateringRecord): string {
  if (!record.createdAt) return '刚刚';
  const date = record.createdAt.toDate();
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OwnerInboxDrawer({
  open,
  user,
  onClose,
  onOpenClaim,
  onEnterGarden,
}: OwnerInboxDrawerProps) {
  const [myGardens, setMyGardens] = useState<UserGarden[]>([]);
  const [selectedGardenId, setSelectedGardenId] = useState<string>('');
  const [records, setRecords] = useState<WateringRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [copiedHandles, setCopiedHandles] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isRootAdmin = Boolean(
    user && user.emailVerified && user.email === ADMIN_EMAIL
  );

  // Load user's claimed seedling gardens
  useEffect(() => {
    if (!open || !user) {
      setMyGardens([]);
      return;
    }

    const unsubGardens = subscribeMyClaimedGardens(
      user.uid,
      (gardens) => {
        setMyGardens(gardens);
        setSelectedGardenId((prev) => {
          if (prev === ROOT_GARDEN_ID && isRootAdmin) return prev;
          if (prev && gardens.some((g) => g.id === prev)) return prev;
          if (isRootAdmin) return ROOT_GARDEN_ID;
          return gardens[0]?.id ?? '';
        });
      },
      (err) => {
        console.error('Load my gardens error:', err);
      }
    );

    return () => unsubGardens();
  }, [open, user, isRootAdmin]);

  // Subscribe to waterings of the currently selected garden
  useEffect(() => {
    if (!open || !user) {
      setRecords([]);
      setErrorMsg('');
      return;
    }

    const activeId = selectedGardenId || (isRootAdmin ? ROOT_GARDEN_ID : myGardens[0]?.id);
    if (!activeId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const unsubscribe =
      activeId === ROOT_GARDEN_ID && isRootAdmin
        ? subscribeWaterings(
            (list) => {
              setRecords(list);
              setLoading(false);
            },
            (err) => {
              console.error('Root waterings subscription error:', err);
              setErrorMsg('无法加载主花园浇水名单，请确认权限。');
              setLoading(false);
            }
          )
        : subscribeGardenWaterings(
            activeId,
            user.uid,
            (list) => {
              setRecords(list);
              setLoading(false);
            },
            (err) => {
              console.error('Garden waterings subscription error:', err);
              setErrorMsg('无法加载该苗圃的浇水好友名单。');
              setLoading(false);
            }
          );

    return () => unsubscribe();
  }, [open, user, selectedGardenId, isRootAdmin, myGardens]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
      setErrorMsg('登录未完成，请重试。');
    } finally {
      setAuthBusy(false);
    }
  };

  const activeGardenId =
    selectedGardenId || (isRootAdmin ? ROOT_GARDEN_ID : myGardens[0]?.id || '');

  const activeShareUrl =
    activeGardenId === ROOT_GARDEN_ID
      ? typeof window !== 'undefined'
        ? window.location.origin
        : ''
      : activeGardenId
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?g=${encodeURIComponent(activeGardenId)}`
        : '';

  const handleCopyShareUrl = async () => {
    if (!activeShareUrl) return;
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setErrorMsg('链接复制失败。');
    }
  };

  const handleCopyPending = async () => {
    const pendingHandles = records
      .filter((r) => !r.followed)
      .map((r) => r.xHandle)
      .join('\n');
    if (!pendingHandles) return;
    try {
      await navigator.clipboard.writeText(pendingHandles);
      setCopiedHandles(true);
      window.setTimeout(() => setCopiedHandles(false), 1800);
    } catch {
      setErrorMsg('剪贴板复制失败，请手动选中账号复制。');
    }
  };

  const handleToggleFollow = async (item: WateringRecord) => {
    if (busyId) return;
    setBusyId(item.id);
    setErrorMsg('');
    try {
      await toggleFollowedStatus(item.id, !item.followed, activeGardenId);
    } catch (err) {
      console.error('Toggle follow status failed:', err);
      setErrorMsg(`无法更新 ${item.xHandle} 的关注状态，请确认权限或稍后重试。`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRecord = async (item: WateringRecord) => {
    if (busyId) return;
    setBusyId(item.id);
    setErrorMsg('');
    try {
      await deleteWateringRecord(item.id, activeGardenId);
    } catch (err) {
      console.error('Delete watering record failed:', err);
      setErrorMsg(`删除 ${item.xHandle} 失败，请确认登录权限或稍后重试。`);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = records.filter((r) => !r.followed).length;
  const followedCount = records.filter((r) => r.followed).length;

  const filteredRecords = records.filter((r) => {
    if (filter === 'pending') return !r.followed;
    if (filter === 'followed') return r.followed;
    return true;
  });

  const hasAnyGarden = isRootAdmin || myGardens.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inbox-drawer-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1a211c]/30 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md h-full bg-white border-l border-[#e4e2dc] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#e4e2dc]">
              <div>
                <h2
                  id="inbox-drawer-title"
                  className="font-display text-xl font-bold text-[#1a211c]"
                >
                  苗圃收件箱
                </h2>
                <p className="text-xs text-[#5d675f] mt-0.5">
                  查看给你的小苗浇水的好友 X 账号并一键回关
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭收件箱"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5d675f] hover:text-[#1a211c] hover:bg-[#f7f6f2] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!user ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-[#5d675f] leading-relaxed mb-6">
                    登录后即可查看自己领养的小苗收到了哪些朋友浇水，并随时复制或一键回关他们的 X 账号。
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authBusy}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1a211c] text-white text-sm font-medium hover:bg-[#2c362f] transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{authBusy ? '正在打开登录...' : '使用 Google 账号登录'}</span>
                  </button>
                  {errorMsg && (
                    <p className="text-xs text-red-700 mt-4">{errorMsg}</p>
                  )}
                </div>
              ) : !hasAnyGarden ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#15803d]">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-[#1a211c] mb-2">
                    你还没有领养属于自己的小苗
                  </p>
                  <p className="text-xs text-[#5d675f] leading-relaxed mb-6">
                    领养一棵花苗或树苗后，把你的专属链接发到 X，就能在这里收集所有来浇水好友的 X 账号！
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClaim();
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap"
                  >
                    <Sprout className="w-4 h-4" />
                    <span>立即领养一棵苗子</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Switcher if user owns multiple gardens / root */}
                  {(isRootAdmin || myGardens.length > 1) && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-2">
                      {isRootAdmin && (
                        <button
                          type="button"
                          onClick={() => setSelectedGardenId(ROOT_GARDEN_ID)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            activeGardenId === ROOT_GARDEN_ID
                              ? 'bg-[#1a211c] text-white'
                              : 'bg-[#f7f6f2] text-[#5d675f] hover:text-[#1a211c]'
                          }`}
                        >
                          主花园 ({ROOT_OWNER_HANDLE})
                        </button>
                      )}
                      {myGardens.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGardenId(g.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            activeGardenId === g.id
                              ? 'bg-[#1a211c] text-white'
                              : 'bg-[#f7f6f2] text-[#5d675f] hover:text-[#1a211c]'
                          }`}
                        >
                          {g.ownerHandle} ({getSeedlingMeta(g.seedlingType).name})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Garden Share Strip */}
                  {activeShareUrl && (
                    <div className="rounded-xl bg-[#f7f6f2] border border-[#e4e2dc] p-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEnterGarden(
                            activeGardenId === ROOT_GARDEN_ID ? null : activeGardenId
                          );
                        }}
                        className="text-left min-w-0 flex-1 hover:underline"
                      >
                        <div className="text-[11px] text-[#5d675f]">
                          我的专属浇水链接（点击进入）
                        </div>
                        <div className="font-mono-num text-xs text-[#1a211c] truncate">
                          {activeShareUrl}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyShareUrl}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e2dc] text-xs font-medium text-[#1a211c] hover:bg-[#eeece5] whitespace-nowrap shrink-0"
                      >
                        {copiedLink ? (
                          <Check className="w-3.5 h-3.5 text-[#15803d]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedLink ? '已复制' : '复制'}</span>
                      </button>
                    </div>
                  )}

                  {/* Summary metrics + copy action */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#e4e2dc]">
                    <div className="flex items-center gap-3 text-xs text-[#5d675f]">
                      <span>
                        共 <strong className="font-mono-num text-[#1a211c]">{records.length}</strong> 位
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        待关注 <strong className="font-mono-num text-[#15803d]">{pendingCount}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        已关注 <strong className="font-mono-num text-[#1a211c]">{followedCount}</strong>
                      </span>
                    </div>

                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4e2dc] text-xs font-medium text-[#1a211c] hover:bg-[#f7f6f2] transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedHandles ? (
                          <Check className="w-3.5 h-3.5 text-[#15803d]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedHandles ? '已复制' : '复制待关注'}</span>
                      </button>
                    )}
                  </div>

                  {/* Interactive filter bar */}
                  <div className="flex items-center gap-1 p-1 bg-[#f7f6f2] rounded-xl">
                    {(
                      [
                        { key: 'all', label: '全部' },
                        { key: 'pending', label: '待关注' },
                        { key: 'followed', label: '已关注' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilter(tab.key)}
                        className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                          filter === tab.key
                            ? 'bg-white text-[#1a211c] shadow-xs'
                            : 'text-[#5d675f] hover:text-[#1a211c]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  {loading ? (
                    <div className="py-12 text-center text-sm text-[#5d675f]">
                      正在加载浇水好友名单...
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[#5d675f]">
                      {filter === 'all'
                        ? '还没有朋友来浇水，快把链接发到 X 摇人吧！'
                        : '当前筛选下暂无记录。'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#e4e2dc]">
                      {filteredRecords.map((item) => {
                        const cleanHandle = item.xHandle.replace(/^@/, '');
                        return (
                          <li
                            key={item.id}
                            className="py-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <a
                                href={`https://x.com/${encodeURIComponent(cleanHandle)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono-num text-sm font-medium text-[#1a211c] hover:text-[#15803d] transition-colors truncate max-w-[180px]"
                              >
                                <span className="truncate">{item.xHandle}</span>
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#5d675f]" />
                              </a>
                              <div className="text-xs text-[#5d675f] font-mono-num mt-0.5">
                                {formatTime(item)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => void handleToggleFollow(item)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer ${
                                  item.followed
                                    ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7]'
                                    : 'bg-[#1a211c] text-white hover:bg-[#2c362f]'
                                }`}
                              >
                                {item.followed ? '已关注' : '标记已关注'}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => void handleDeleteRecord(item)}
                                aria-label={`删除 ${item.xHandle}`}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#5d675f] hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {user && (
              <div className="px-6 py-3.5 border-t border-[#e4e2dc] flex items-center justify-between text-xs text-[#5d675f]">
                <span className="truncate max-w-[230px]">{user.email}</span>
                <button
                  type="button"
                  onClick={() => void signOutAdmin()}
                  className="inline-flex items-center gap-1.5 text-[#1a211c] hover:text-[#15803d] font-medium whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出</span>
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
