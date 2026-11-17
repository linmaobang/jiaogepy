import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  Flower2,
  Leaf,
  Send,
  Sprout,
  Trees,
  X,
} from 'lucide-react';
import {
  claimUserGarden,
  GardenAlreadyClaimedError,
  normalizeXHandle,
  type SeedlingType,
  type UserGarden,
} from '../firebase';
import { getSeedlingMeta, SEEDLING_CATALOG } from '../utils/friendCard';
import { playBloomChime } from '../utils/sound';

interface ClaimSeedlingModalProps {
  open: boolean;
  initialHandle: string;
  onClose: () => void;
  onEnterGarden: (gardenId: string) => void;
}

function SeedlingIcon({ type }: { type: SeedlingType }) {
  if (type === 'sunflower') return <Flower2 className="w-5 h-5 text-[#ca8a04]" />;
  if (type === 'sakura') return <Sprout className="w-5 h-5 text-[#db2777]" />;
  if (type === 'pine') return <Trees className="w-5 h-5 text-[#15803d]" />;
  return <Leaf className="w-5 h-5 text-[#059669]" />;
}

export function ClaimSeedlingModal({
  open,
  initialHandle,
  onClose,
  onEnterGarden,
}: ClaimSeedlingModalProps) {
  const [selectedType, setSelectedType] = useState<SeedlingType>('sunflower');
  const [handleInput, setHandleInput] = useState(initialHandle.replace(/^@+/, ''));
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [claimedGarden, setClaimedGarden] = useState<UserGarden | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialHandle) {
        setHandleInput(initialHandle.replace(/^@+/, ''));
      }
      setErrorMsg('');
    }
  }, [open, initialHandle]);

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

  const handleClaim = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const normalized = normalizeXHandle(handleInput);
    if (!normalized) {
      setErrorMsg('请输入你的有效 X 账号（1–15 位字母、数字或下划线）');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    try {
      const garden = await claimUserGarden(normalized, selectedType);
      setClaimedGarden(garden);
      playBloomChime();
    } catch (err) {
      if (err instanceof GardenAlreadyClaimedError) {
        setErrorMsg(
          `${err.ownerHandle} 的小苗已经被领养过啦，如果是你的请用原 Google 账号登录查看。`
        );
      } else {
        console.error('Claim seedling error:', err);
        setErrorMsg('领养未完成，请确认完成 Google 授权登录后再试一次。');
      }
    } finally {
      setBusy(false);
    }
  };

  const shareUrl = claimedGarden
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?g=${encodeURIComponent(claimedGarden.id)}`
    : '';
  const seedlingMeta = claimedGarden
    ? getSeedlingMeta(claimedGarden.seedlingType)
    : getSeedlingMeta(selectedType);
  const tweetText = claimedGarden
    ? `我在【浇个朋友】领养了一棵专属${seedlingMeta.name} 🌱\n快来给我的小苗浇一瓢水，浇了我就马上回关你！互关列车发车啦 💧👇\n${shareUrl}`
    : '';
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setErrorMsg('复制失败，请长按链接手动复制。');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1a211c]/40 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg bg-white border border-[#e4e2dc] rounded-2xl p-6 sm:p-7 shadow-xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭领养弹窗"
              className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5d675f] hover:text-[#1a211c] hover:bg-[#f7f6f2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {claimedGarden ? (
              <div className="text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                  <SeedlingIcon type={claimedGarden.seedlingType} />
                </div>

                <h2
                  id="claim-modal-title"
                  className="font-display text-2xl font-bold text-[#1a211c] mb-1.5"
                >
                  你的{seedlingMeta.name}已领养成功
                </h2>
                <p className="text-sm text-[#5d675f] mb-5">
                  把下面这条链接发到 X，好友每浇一次水你都能在「收件箱」收到对方的 X 账号！
                </p>

                <div className="mb-5 rounded-xl bg-[#f7f6f2] border border-[#e4e2dc] p-3 flex items-center justify-between gap-2 text-left">
                  <span className="font-mono-num text-xs text-[#1a211c] truncate">
                    {shareUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e4e2dc] text-xs font-medium text-[#1a211c] hover:bg-[#eeece5] transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-[#15803d]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedLink ? '已复制' : '复制链接'}</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  <a
                    href={tweetIntentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1a211c] text-white text-sm font-semibold hover:bg-[#2c362f] transition-colors whitespace-nowrap"
                  >
                    <Send className="w-4 h-4" />
                    <span>发到 X 摇人来浇水</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = claimedGarden.id;
                      setClaimedGarden(null);
                      onClose();
                      onEnterGarden(targetId);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-sm font-semibold hover:bg-[#dcfce7] transition-colors whitespace-nowrap"
                  >
                    <span>进入我的小花园</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleClaim}>
                <h2
                  id="claim-modal-title"
                  className="font-display text-2xl font-bold text-[#1a211c] mb-1.5"
                >
                  领养一棵属于你的苗子
                </h2>
                <p className="text-sm text-[#5d675f] mb-5 leading-relaxed">
                  选一棵苗子并绑定你的 X 账号，生成专属浇水链接发到 X，来浇水的人都会留下账号等你回关。
                </p>

                {/* 4 Seedling Options */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {SEEDLING_CATALOG.map((item) => {
                    const active = selectedType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setSelectedType(item.type)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#f0fdf4] border-[#15803d] ring-1 ring-[#15803d]/25'
                            : 'bg-[#f7f6f2] border-[#e4e2dc] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <SeedlingIcon type={item.type} />
                          <span className="text-sm font-semibold text-[#1a211c] whitespace-nowrap">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-xs text-[#5d675f] leading-snug">
                          {item.tagline}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Owner Handle Input */}
                <label className="block text-xs font-medium text-[#5d675f] mb-1.5">
                  你的 X 账号（将作为专属分享链接后缀）
                </label>
                <div className="flex items-center rounded-xl bg-[#f7f6f2] border border-[#e4e2dc] px-3.5 py-1.5 mb-3 focus-within:bg-white focus-within:border-[#15803d] focus-within:ring-2 focus-within:ring-[#15803d]/15">
                  <span className="font-mono-num text-base font-semibold text-[#5d675f] mr-1 select-none">
                    @
                  </span>
                  <input
                    type="text"
                    maxLength={16}
                    value={handleInput.replace(/^@+/, '')}
                    onChange={(e) => {
                      setHandleInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="输入你的 X 账号"
                    className="w-full bg-transparent text-[#1a211c] font-mono-num text-sm sm:text-base focus:outline-none min-h-[38px]"
                  />
                </div>

                {errorMsg && (
                  <p role="alert" className="text-xs text-[#b45309] font-medium mb-3">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap disabled:opacity-65 cursor-pointer"
                >
                  <Sprout className="w-4 h-4" />
                  <span>{busy ? '正在生成专属苗圃...' : '一键领养并生成浇水链接'}</span>
                </button>
                <p className="text-[11px] text-[#5d675f] text-center mt-2.5">
                  首次领养需用 Google 账号验证身份，以防他人冒领你的专属苗圃收件箱
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
