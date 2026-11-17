/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Droplets,
  Inbox,
  Sprout,
  Ticket,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  DuplicateWateringError,
  getLocalWateredState,
  normalizeGardenIdParam,
  normalizeXHandle,
  ROOT_GARDEN_ID,
  ROOT_OWNER_HANDLE,
  subscribeAuth,
  subscribeGardenStats,
  subscribeUserGarden,
  submitWatering,
  type SeedlingType,
  type UserGarden,
} from './firebase';
import { ClaimSeedlingModal } from './components/ClaimSeedlingModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FollowPopupModal } from './components/FollowPopupModal';
import { OwnerInboxDrawer } from './components/OwnerInboxDrawer';
import { WateringPlantStage } from './components/WateringPlantStage';
import {
  BASE_GROWTH_STAGES,
  getGardenEvolution,
  getSeedlingMeta,
} from './utils/friendCard';
import {
  playBloomChime,
  playWateringSound,
  setSoundMuted,
} from './utils/sound';

function readGardenParamFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeGardenIdParam(params.get('g'));
}

function GardenContent() {
  const [activeGardenId, setActiveGardenId] = useState<string | null>(() =>
    readGardenParamFromUrl()
  );
  const [customGarden, setCustomGarden] = useState<UserGarden | null>(null);
  const [customGardenMissing, setCustomGardenMissing] = useState(false);

  const storageKey = activeGardenId ?? ROOT_GARDEN_ID;

  const [xInput, setXInput] = useState('');
  const [hint, setHint] = useState('');
  const [isPouring, setIsPouring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWatered, setHasWatered] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isHoveringCta, setIsHoveringCta] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rootTotalWaterings, setRootTotalWaterings] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [submittedHandle, setSubmittedHandle] = useState('');
  const [myWateringNumber, setMyWateringNumber] = useState(1);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [copiedGardenLink, setCopiedGardenLink] = useState(false);
  const [growthGuideOpen, setGrowthGuideOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const pourTimerRef = useRef<number | null>(null);

  // Sync per-garden local watered state when switching gardens
  useEffect(() => {
    const saved = getLocalWateredState(storageKey);
    if (saved) {
      setHasWatered(true);
      setSubmittedHandle(saved.xHandle);
      setMyWateringNumber(saved.wateringNumber);
      setXInput(saved.xHandle);
    } else {
      setHasWatered(false);
      setSubmittedHandle('');
      setMyWateringNumber(1);
      setXInput('');
    }
    setHint('');
    setModalOpen(false);
  }, [storageKey]);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveGardenId(readGardenParamFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubAuth = subscribeAuth((user) => {
      setAuthUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Subscribe to either root stats or specific user-claimed garden
  useEffect(() => {
    if (!activeGardenId) {
      setCustomGarden(null);
      setCustomGardenMissing(false);
      const unsubStats = subscribeGardenStats((stats) => {
        if (stats) {
          setRootTotalWaterings(stats.totalWaterings);
        }
      });
      return () => unsubStats();
    }

    setCustomGardenMissing(false);
    const unsubGarden = subscribeUserGarden(
      activeGardenId,
      (garden) => {
        if (!garden) {
          setCustomGarden(null);
          setCustomGardenMissing(true);
        } else {
          setCustomGarden(garden);
          setCustomGardenMissing(false);
        }
      },
      (err) => {
        console.error('Subscribe custom garden error:', err);
        setCustomGardenMissing(true);
      }
    );
    return () => unsubGarden();
  }, [activeGardenId]);

  useEffect(() => {
    return () => {
      if (pourTimerRef.current !== null) {
        window.clearTimeout(pourTimerRef.current);
      }
    };
  }, []);

  const navigateToGarden = (gardenId: string | null) => {
    if (typeof window !== 'undefined') {
      const targetUrl = gardenId
        ? `${window.location.pathname}?g=${encodeURIComponent(gardenId)}`
        : window.location.pathname;
      window.history.pushState({}, '', targetUrl);
    }
    setActiveGardenId(gardenId);
  };

  const totalWaterings = activeGardenId
    ? customGarden?.totalWaterings ?? 0
    : rootTotalWaterings;

  const ownerHandle = activeGardenId
    ? customGarden?.ownerHandle ?? `@${activeGardenId}`
    : ROOT_OWNER_HANDLE;

  const seedlingType: SeedlingType = activeGardenId
    ? customGarden?.seedlingType ?? 'sunflower'
    : 'sunflower';

  const seedlingMeta = getSeedlingMeta(seedlingType);
  const evolution = getGardenEvolution(totalWaterings);
  const hasValidHandle = normalizeXHandle(xInput) !== null;

  const triggerWatering = async () => {
    if (isSubmitting || isPouring || customGardenMissing) return;

    if (hasWatered) {
      playBloomChime();
      setModalOpen(true);
      return;
    }

    const normalized = normalizeXHandle(xInput);
    if (!normalized) {
      if (!xInput.trim()) {
        setHint('先填一下你的 X 账号，木牌上才能写上你的名字哦');
      } else {
        setHint('请输入正确的 X 账号（1–15 位字母、数字或下划线）');
      }
      inputRef.current?.focus();
      return;
    }

    setHint('');
    setIsSubmitting(true);
    setIsPouring(true);
    playWateringSound();

    const minPourDuration = new Promise<void>((resolve) => {
      pourTimerRef.current = window.setTimeout(() => {
        resolve();
      }, 420);
    });

    try {
      const [result] = await Promise.all([
        submitWatering(normalized, activeGardenId),
        minPourDuration,
      ]);
      setIsPouring(false);
      setIsSubmitting(false);
      setHasWatered(true);
      setSubmittedHandle(result.xHandle);
      setMyWateringNumber(result.wateringNumber);
      playBloomChime();
      setModalOpen(true);
    } catch (error) {
      setIsPouring(false);
      setIsSubmitting(false);
      if (error instanceof DuplicateWateringError) {
        setHint(`${error.xHandle} 已经给这棵小苗浇过水啦，每位朋友只能浇一次哦`);
      } else {
        console.error('Watering submission error:', error);
        setHint('水壶刚刚洒了一点，请再试一次。');
      }
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void triggerWatering();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const handleCopyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedGardenLink(true);
      window.setTimeout(() => setCopiedGardenLink(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#1a211c]">
      {/* 3-Zone Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => navigateToGarden(null)}
          className="font-display text-xl font-bold tracking-tight text-[#1a211c] whitespace-nowrap shrink-0 cursor-pointer"
        >
          浇个朋友
        </button>

        <nav className="hidden md:flex items-center gap-6 text-xs text-[#5d675f] whitespace-nowrap">
          {activeGardenId && (
            <button
              type="button"
              onClick={() => navigateToGarden(null)}
              className="text-[#15803d] hover:text-[#166534] transition-colors font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              去 {ROOT_OWNER_HANDLE} 的花园
            </button>
          )}
          <span>
            {ownerHandle} 的{seedlingMeta.name}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            已浇 <strong className="font-mono-num text-[#1a211c]">{totalWaterings}</strong> 瓢
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Lv.{evolution.level} {evolution.label}
          </span>
          {evolution.remaining > 0 && evolution.nextLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                差 <strong className="font-mono-num text-[#15803d]">{evolution.remaining}</strong> 瓢升至「{evolution.nextLabel}」
              </span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setInboxOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5d675f] hover:text-[#1a211c] transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg hover:bg-[#eeece5] cursor-pointer"
          >
            <Inbox className="w-4 h-4" />
            <span>收件箱</span>
          </button>

          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a211c] text-white text-xs font-semibold hover:bg-[#2c362f] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>领养小苗</span>
          </button>
        </div>
      </header>

      {/* Main Conservatory Frame */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-12 pt-2">
        {customGardenMissing && activeGardenId ? (
          <div className="w-full max-w-md bg-white border border-[#e4e2dc] rounded-3xl p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#15803d]">
              <Sprout className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#1a211c] mb-2">
              @{activeGardenId} 的小苗还没领养
            </h1>
            <p className="text-sm text-[#5d675f] mb-6 leading-relaxed">
              如果你就是 @{activeGardenId}，现在就可以领养一棵专属苗子，把链接发给 X 上的朋友来浇水！
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setClaimOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap"
              >
                立即领养这棵苗子
              </button>
              <button
                type="button"
                onClick={() => navigateToGarden(null)}
                className="px-5 py-2.5 rounded-xl border border-[#e4e2dc] text-[#1a211c] text-sm font-medium hover:bg-[#f7f6f2] transition-colors whitespace-nowrap"
              >
                回到主花园
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Editorial Title Block */}
            <div className="text-center mb-6">
              <h1
                className="font-display text-3xl sm:text-[42px] leading-tight font-bold tracking-tight text-[#1a211c] mb-2"
                style={{ textWrap: 'balance' }}
              >
                {hasWatered
                  ? `谢谢你浇灌了 ${ownerHandle} 的${seedlingMeta.name}`
                  : `给 ${ownerHandle} 的${seedlingMeta.name}浇一瓢水`}
              </h1>
              <p className="text-sm sm:text-[15px] text-[#5d675f]">
                {hasWatered ? (
                  <>
                    你的账号{' '}
                    <span className="font-mono-num font-semibold text-[#1a211c]">
                      {submittedHandle}
                    </span>{' '}
                    已留在这里，{ownerHandle} 马上就去关注你哦
                  </>
                ) : (
                  <>
                    每人限浇一次：留下你的 X 账号浇一下水，成为第{' '}
                    <span className="font-mono-num font-semibold text-[#1a211c]">
                      #{totalWaterings + 1}
                    </span>{' '}
                    位浇水朋友
                  </>
                )}
              </p>
            </div>

            {/* Unified Conservatory Window + Tactile Control Dock */}
            <div className="rounded-3xl border border-[#e4e2dc] bg-white shadow-sm overflow-hidden">
              <WateringPlantStage
                seedlingType={seedlingType}
                isPouring={isPouring}
                hasWatered={hasWatered}
                hasValidHandle={hasValidHandle}
                typedHandle={hasWatered ? submittedHandle : xInput}
                isTyping={isTyping}
                isHoveringCta={isHoveringCta}
                waterCount={totalWaterings}
                evolutionLevel={evolution.level}
                onTriggerWater={() => void triggerWatering()}
              />

              {/* Uncapped Botanical Growth Plan Strip */}
              <div className="px-5 py-3.5 sm:px-7 bg-[#fbfaf7] border-t border-[#e4e2dc]">
                <div className="flex items-center justify-between gap-3 text-xs mb-2.5">
                  <div className="flex items-center gap-2 text-[#1a211c] font-medium min-w-0 truncate">
                    <span className="font-mono-num font-bold text-[#15803d] shrink-0">
                      Lv.{evolution.level}
                    </span>
                    <span className="shrink-0">{evolution.label}</span>
                    <span aria-hidden="true" className="text-[#c5c1b6]">·</span>
                    <span className="text-[#5d675f] truncate">
                      差 {evolution.remaining} 瓢升至「{evolution.nextLabel}」
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGrowthGuideOpen((v) => !v)}
                    className="text-[#15803d] hover:text-[#166534] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {growthGuideOpen ? '收起成长计划' : '成长计划'}
                  </button>
                </div>

                {/* 8-Milestone Uncapped Stepper Track */}
                <div className="relative flex items-center justify-between">
                  <div
                    aria-hidden="true"
                    className="absolute left-2 right-2 top-[7px] h-[2px] bg-[#e4e2dc]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute left-2 top-[7px] h-[2px] bg-[#15803d] transition-all duration-300"
                    style={{
                      width: `calc((100% - 16px) * ${Math.min(7, evolution.level) / 7})`,
                    }}
                  />
                  {BASE_GROWTH_STAGES.map((stage) => {
                    const reached = evolution.level >= stage.level;
                    return (
                      <div
                        key={stage.level}
                        className="relative z-10 flex flex-col items-center gap-1"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                            reached
                              ? 'bg-[#15803d] border-[#15803d]'
                              : 'bg-white border-[#cfcac0]'
                          }`}
                        />
                        <span
                          className={`text-[10px] sm:text-[11px] whitespace-nowrap ${
                            reached
                              ? 'text-[#1a211c] font-semibold'
                              : 'text-[#828983]'
                          }`}
                        >
                          {stage.shortLabel}
                          <span className="hidden sm:inline font-mono-num ml-0.5 text-[10px] opacity-75">
                            ({stage.minWaterings})
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Expandable Uncapped Growth Breakdown */}
                {growthGuideOpen && (
                  <div className="mt-3 pt-3 border-t border-[#e4e2dc] grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                    {BASE_GROWTH_STAGES.map((stage) => {
                      const unlocked = evolution.level >= stage.level;
                      return (
                        <div
                          key={stage.level}
                          className={`px-2.5 py-2 rounded-lg border text-xs ${
                            unlocked
                              ? 'bg-white border-[#bbf7d0] text-[#1a211c]'
                              : 'bg-[#f4f2ec] border-[#e4e2dc] text-[#5d675f]'
                          }`}
                        >
                          <div className="font-semibold flex items-center justify-between gap-1 mb-0.5">
                            <span>
                              Lv.{stage.level} {stage.label}
                            </span>
                            <span className="font-mono-num text-[10px] text-[#15803d]">
                              {stage.minWaterings}瓢
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug opacity-85">
                            {stage.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Integrated Action Dock */}
              {hasWatered ? (
                <div className="px-5 py-5 sm:px-7 sm:py-6 bg-white border-t border-[#e4e2dc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-[#1a211c]">
                        你已作为第{' '}
                        <span className="font-mono-num text-[#15803d]">
                          #{myWateringNumber}
                        </span>{' '}
                        位好友完成浇水
                      </div>
                      <p className="text-xs text-[#5d675f] mt-0.5">
                        现在可以领养一棵属于你自己的小苗，发链接让 X 好友也来给你浇水！
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setClaimOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#15803d] text-white text-xs sm:text-sm font-semibold hover:bg-[#166534] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sprout className="w-4 h-4" />
                      <span>领养我的小苗</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#e4e2dc] text-[#1a211c] text-xs sm:text-sm font-medium hover:bg-[#f7f6f2] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>交友凭证</span>
                    </button>
                    {activeGardenId && (
                      <button
                        type="button"
                        onClick={() => navigateToGarden(null)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d] text-xs sm:text-sm font-semibold hover:bg-[#dcfce7] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Droplets className="w-4 h-4" />
                        <span>去给 {ROOT_OWNER_HANDLE} 浇水</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="px-5 py-5 sm:px-7 sm:py-6 bg-white border-t border-[#e4e2dc]"
                  noValidate
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 flex items-center rounded-xl bg-[#f7f6f2] border border-[#e4e2dc] px-4 py-1.5 focus-within:bg-white focus-within:border-[#15803d] focus-within:ring-2 focus-within:ring-[#15803d]/15 transition-all">
                      <span
                        aria-hidden="true"
                        className="font-mono-num text-base font-semibold text-[#5d675f] select-none mr-1"
                      >
                        @
                      </span>
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={16}
                        value={xInput.replace(/^@+/, '')}
                        onFocus={() => setIsTyping(true)}
                        onBlur={() => setIsTyping(false)}
                        onChange={(e) => {
                          setXInput(e.target.value);
                          if (hint) setHint('');
                        }}
                        placeholder="输入你的 X 账号（花牌实时同步）"
                        aria-label="你的 X 账号"
                        className="w-full bg-transparent text-[#1a211c] placeholder:text-[#8f9690] text-sm sm:text-base font-mono-num focus:outline-none min-h-[40px]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onMouseEnter={() => setIsHoveringCta(true)}
                      onMouseLeave={() => setIsHoveringCta(false)}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3 min-h-[50px] rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 disabled:opacity-70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] focus-visible:ring-offset-2"
                    >
                      <Droplets className="w-4 h-4" />
                      <span>{isPouring ? '浇水中...' : '浇一瓢水'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-3 min-h-[20px] text-xs">
                    {hint ? (
                      <p role="alert" className="text-[#b45309] font-medium">
                        {hint}
                      </p>
                    ) : (
                      <p className="text-[#5d675f]">
                        每人限浇一次 · 浇完也可免费领养一棵属于你自己的小苗
                      </p>
                    )}

                    {activeGardenId && (
                      <button
                        type="button"
                        onClick={handleCopyCurrentUrl}
                        className="inline-flex items-center gap-1 text-[#5d675f] hover:text-[#1a211c] whitespace-nowrap shrink-0"
                      >
                        {copiedGardenLink ? (
                          <Check className="w-3.5 h-3.5 text-[#15803d]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedGardenLink ? '已复制链接' : '分享此花园'}</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {activeGardenId && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#5d675f]">
                <span>由 {ROOT_OWNER_HANDLE} 发起的「浇个朋友」</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => navigateToGarden(null)}
                  className="font-semibold text-[#15803d] hover:underline whitespace-nowrap cursor-pointer"
                >
                  去给 {ROOT_OWNER_HANDLE} 的小苗也浇一瓢水 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Discreet Sound Toggle */}
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={muted ? '开启音效' : '关闭音效'}
          title={muted ? '开启音效' : '关闭音效'}
          className="fixed bottom-5 right-5 w-10 h-10 inline-flex items-center justify-center rounded-xl bg-white/95 border border-[#e4e2dc] text-[#5d675f] hover:text-[#1a211c] hover:bg-white transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </main>

      {/* Signature Popup Modal */}
      <FollowPopupModal
        open={modalOpen}
        xHandle={submittedHandle}
        ownerHandle={ownerHandle}
        seedlingType={seedlingType}
        seedlingName={seedlingMeta.name}
        evolutionLevel={evolution.level}
        stageLabel={evolution.label}
        totalWaterings={totalWaterings}
        nextMilestone={evolution.nextMilestone}
        nextLabel={evolution.nextLabel}
        remaining={evolution.remaining}
        gardenId={activeGardenId}
        wateringNumber={myWateringNumber}
        onClose={() => setModalOpen(false)}
        onOpenClaim={() => setClaimOpen(true)}
        onVisitRootGarden={() => navigateToGarden(null)}
      />

      {/* Claim Your Own Seedling Modal */}
      <ClaimSeedlingModal
        open={claimOpen}
        initialHandle={submittedHandle || xInput}
        onClose={() => setClaimOpen(false)}
        onEnterGarden={(newGardenId) => navigateToGarden(newGardenId)}
      />

      {/* Owner Collection Drawer */}
      <OwnerInboxDrawer
        open={inboxOpen}
        user={authUser}
        currentGardenId={activeGardenId}
        currentGardenTotal={totalWaterings}
        onClose={() => setInboxOpen(false)}
        onOpenClaim={() => setClaimOpen(true)}
        onEnterGarden={(targetId) => navigateToGarden(targetId)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GardenContent />
    </ErrorBoundary>
  );
}
