import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Check, Copy, Download, Send, Share2, Sprout, Ticket, X } from 'lucide-react';
import { ROOT_OWNER_HANDLE, type SeedlingType } from '../firebase';
import {
  copyAchievementCardPng,
  copyFriendCardPng,
  downloadAchievementCardPng,
  downloadFriendCardPng,
  getFriendPersona,
  renderAchievementCardDataUrl,
  renderFriendCardDataUrl,
  shareAchievementCardNative,
  shareFriendCardNative,
} from '../utils/friendCard';

type CardMode = 'voucher' | 'achievement';

interface FollowPopupModalProps {
  open: boolean;
  xHandle: string;
  ownerHandle: string;
  seedlingType: SeedlingType;
  seedlingName: string;
  evolutionLevel: number;
  stageLabel: string;
  totalWaterings: number;
  nextMilestone: number;
  nextLabel: string;
  remaining: number;
  gardenId: string | null;
  wateringNumber: number;
  onClose: () => void;
  onOpenClaim: () => void;
  onVisitRootGarden: () => void;
}

export function FollowPopupModal({
  open,
  xHandle,
  ownerHandle,
  seedlingType,
  seedlingName,
  evolutionLevel,
  stageLabel,
  totalWaterings,
  nextMilestone,
  nextLabel,
  remaining,
  gardenId,
  wateringNumber,
  onClose,
  onOpenClaim,
  onVisitRootGarden,
}: FollowPopupModalProps) {
  const [cardMode, setCardMode] = useState<CardMode>('voucher');
  const [voucherPreviewUrl, setVoucherPreviewUrl] = useState<string>('');
  const [achievementPreviewUrl, setAchievementPreviewUrl] = useState<string>('');
  const [copiedImage, setCopiedImage] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [isNativeSharing, setIsNativeSharing] = useState(false);

  const safeNumber = Math.max(1, wateringNumber);
  const safeTotal = Math.max(safeNumber, totalWaterings);
  const persona = getFriendPersona(xHandle || '@friend', safeNumber);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = gardenId ? `${origin}/?g=${encodeURIComponent(gardenId)}` : origin;
  const cleanOwner = ownerHandle.replace(/^@/, '');

  const voucherParams = {
    xHandle: xHandle || '@friend',
    ownerHandle,
    wateringNumber: safeNumber,
    trait: persona.trait,
    seedlingType,
    seedlingName,
    evolutionLevel,
    stageLabel,
  };

  const achievementParams = {
    xHandle: xHandle || '@friend',
    ownerHandle,
    wateringNumber: safeNumber,
    totalWaterings: safeTotal,
    seedlingType,
    seedlingName,
    evolutionLevel,
    stageLabel,
    nextMilestone,
    nextLabel,
    remaining,
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCopiedImage(false);
    setShareNote('');

    void Promise.all([
      renderFriendCardDataUrl(voucherParams),
      renderAchievementCardDataUrl(achievementParams),
    ]).then(([voucherUrl, achievementUrl]) => {
      if (cancelled) return;
      if (voucherUrl) setVoucherPreviewUrl(voucherUrl);
      if (achievementUrl) setAchievementPreviewUrl(achievementUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    xHandle,
    ownerHandle,
    safeNumber,
    safeTotal,
    persona.trait,
    seedlingType,
    seedlingName,
    evolutionLevel,
    stageLabel,
    nextMilestone,
    nextLabel,
    remaining,
  ]);

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

  const activePreviewUrl =
    cardMode === 'achievement' ? achievementPreviewUrl : voucherPreviewUrl;

  const handleCopyCardImage = async () => {
    try {
      const ok =
        cardMode === 'achievement'
          ? await copyAchievementCardPng(achievementParams)
          : await copyFriendCardPng(voucherParams);
      if (ok) {
        setCopiedImage(true);
        setShareNote('');
        window.setTimeout(() => setCopiedImage(false), 2400);
      } else {
        setShareNote('当前浏览器不支持直接复制图片，已为你自动下载高清 PNG。');
        if (cardMode === 'achievement') {
          await downloadAchievementCardPng(achievementParams);
        } else {
          await downloadFriendCardPng(voucherParams);
        }
      }
    } catch {
      setShareNote('当前浏览器不支持直接复制图片，已为你自动下载高清 PNG。');
      if (cardMode === 'achievement') {
        await downloadAchievementCardPng(achievementParams);
      } else {
        await downloadFriendCardPng(voucherParams);
      }
    }
  };

  const handleNativeShare = async () => {
    if (isNativeSharing) return;
    setIsNativeSharing(true);
    setShareNote('');
    try {
      const outcome =
        cardMode === 'achievement'
          ? await shareAchievementCardNative({ ...achievementParams, shareUrl })
          : await shareFriendCardNative({ ...voucherParams, shareUrl });
      if (outcome === 'shared') {
        setShareNote('已通过系统分享发送');
      } else if (outcome === 'fallback') {
        setShareNote('当前浏览器环境暂不支持直接拉起文件分享，已为你保存高清图，可直接发给好友。');
      }
    } finally {
      setIsNativeSharing(false);
    }
  };

  const handleDownloadCardImage = async () => {
    if (cardMode === 'achievement') {
      await downloadAchievementCardPng(achievementParams);
    } else {
      await downloadFriendCardPng(voucherParams);
    }
  };

  const tweetText =
    cardMode === 'achievement'
      ? `刚刚给 ${ownerHandle} 的${seedlingName}浇水，目前已经累计浇灌 ${safeTotal} 瓢，成功达成 Lv.${evolutionLevel}「${stageLabel}」状态！🌱💧\n${shareUrl}`
      : `刚刚给 ${ownerHandle} 的${seedlingName}浇了第 #${safeNumber} 瓢水 💧\n网页直接弹出一句：「我马上就关注你哦」\n原来我是「${persona.trait}」，坐等 ${ownerHandle} 回关！\n${shareUrl}`;
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="follow-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#18181b]/55 backdrop-blur-[3px]"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-white border border-[#e4e2dc] rounded-2xl p-5 sm:p-6 shadow-2xl text-center my-auto"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭弹窗"
              className="absolute top-4 right-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#5d675f] hover:text-[#1a211c] hover:bg-[#f7f6f2] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-3">
              <div className="text-xs font-medium text-[#15803d] mb-0.5">
                第 #{safeNumber} 位浇水好友 · 已浇 {safeTotal} 瓢（{stageLabel}）
              </div>
              <h2
                id="follow-modal-title"
                className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#1a211c]"
                style={{ textWrap: 'balance' }}
              >
                我马上就关注你哦
              </h2>
              <p className="text-xs text-[#5d675f] mt-1">
                已记下{' '}
                <span className="font-mono-num font-semibold text-[#1a211c]">{xHandle}</span>
                ，等待{' '}
                <a
                  href={`https://x.com/${encodeURIComponent(cleanOwner)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-num font-semibold text-[#15803d] hover:underline"
                >
                  {ownerHandle}
                </a>{' '}
                回关
              </p>
            </div>

            {/* Segmented Card Switcher: Friend Voucher vs Growth Achievement Card */}
            <div className="mx-auto mb-3 inline-flex items-center gap-1 p-1 rounded-xl bg-[#f4f2ec] border border-[#e4e2dc]">
              <button
                type="button"
                onClick={() => {
                  setCardMode('voucher');
                  setCopiedImage(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  cardMode === 'voucher'
                    ? 'bg-white text-[#1a211c] shadow-xs'
                    : 'text-[#5d675f] hover:text-[#1a211c]'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>交友凭证卡</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardMode('achievement');
                  setCopiedImage(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  cardMode === 'achievement'
                    ? 'bg-[#101d16] text-[#faf9f5] shadow-xs'
                    : 'text-[#5d675f] hover:text-[#1a211c]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>成长成就卡</span>
              </button>
            </div>

            {/* Clean Square 1080x1080 Social Card Preview */}
            <div
              className={`mx-auto mb-4 w-full max-w-[292px] sm:max-w-[312px] rounded-2xl overflow-hidden border border-[#e4e2dc] shadow-sm aspect-square flex items-center justify-center ${
                cardMode === 'achievement' ? 'bg-[#101d16]' : 'bg-[#faf9f5]'
              }`}
            >
              {activePreviewUrl ? (
                <img
                  src={activePreviewUrl}
                  alt={
                    cardMode === 'achievement'
                      ? `${ownerHandle} 的${seedlingName} Lv.${evolutionLevel} ${stageLabel} 成长成就卡`
                      : `${xHandle} 与 ${ownerHandle} 的浇个朋友交友凭证`
                  }
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
              ) : (
                <div className="text-xs text-[#71717a] font-mono-num">
                  正在合成高清分享图...
                </div>
              )}
            </div>

            {shareNote && (
              <p className="text-xs text-[#5d675f] mb-2">
                {shareNote}
              </p>
            )}

            {/* Social Sharing & Viral Loop Actions */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  disabled={isNativeSharing}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-[#18181b] text-white text-xs font-semibold hover:bg-[#27272a] transition-colors whitespace-nowrap disabled:opacity-65 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isNativeSharing ? '呼出中...' : '系统分享'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyCardImage()}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl border border-[#e4e2dc] bg-[#f7f6f2] text-[#1a211c] text-xs font-medium hover:bg-[#eeece5] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedImage ? (
                    <Check className="w-3.5 h-3.5 text-[#15803d]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#5d675f]" />
                  )}
                  <span>{copiedImage ? '已复制图' : '复制图片'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownloadCardImage()}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl border border-[#e4e2dc] bg-[#f7f6f2] text-[#1a211c] text-xs font-medium hover:bg-[#eeece5] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#5d675f]" />
                  <span>
                    {cardMode === 'achievement' ? '存成就卡' : '保存图片'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenClaim();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] focus-visible:ring-offset-2"
              >
                <Sprout className="w-4 h-4" />
                <span>我也领养一棵苗子（生成我的链接）</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                <a
                  href={tweetIntentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#5d675f] hover:text-[#1a211c] font-medium transition-colors whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {cardMode === 'achievement'
                      ? '一键发 X 晒成长成就'
                      : `发 X 催 ${ownerHandle} 回关`}
                  </span>
                </a>

                {gardenId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onVisitRootGarden();
                    }}
                    className="text-[#15803d] hover:text-[#166534] font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    顺便给 {ROOT_OWNER_HANDLE} 浇水 →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[#5d675f] hover:text-[#1a211c] font-medium transition-colors whitespace-nowrap cursor-pointer"
                  >
                    继续留在花园
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
