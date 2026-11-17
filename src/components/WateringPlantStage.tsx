import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import type { SeedlingType } from '../firebase';
import {
  ParticleCanvas,
  type ParticleCanvasHandle,
} from './ParticleCanvas';
import { playPentatonicPop, playPotTapSound } from '../utils/sound';

interface WateringPlantStageProps {
  seedlingType: SeedlingType;
  isPouring: boolean;
  hasWatered: boolean;
  hasValidHandle: boolean;
  typedHandle: string;
  isTyping: boolean;
  isHoveringCta: boolean;
  waterCount: number;
  evolutionLevel: number;
  onTriggerWater: () => void;
}

const PRE_WATER_WHISPERS = [
  '再戳两下，叶子要唱歌啦',
  '把右边的铜嘴水壶拖过来试试！',
  '填完 @X账号，花牌就会写上你的名字',
  '今天阳光刚好，适合交个新朋友',
  '浇完水还能领养一棵你自己的小苗哦',
];

const POST_WATER_WHISPERS = [
  '喝饱了！你也去领养一棵小苗吧',
  '把你的专属浇水链接发到 X 试试！',
  '连击撸花手感是不是超解压？',
  '小蝴蝶已经记住你的味道啦',
  '这一瓢水，够我开心一整天',
];

export function WateringPlantStage({
  seedlingType,
  isPouring,
  hasWatered,
  hasValidHandle,
  typedHandle,
  isTyping,
  isHoveringCta,
  waterCount,
  evolutionLevel,
  onTriggerWater,
}: WateringPlantStageProps) {
  const [tapCombo, setTapCombo] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapImpulse, setTapImpulse] = useState(0);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [isDraggingCan, setIsDraggingCan] = useState(false);
  const [isCanOverPlant, setIsCanOverPlant] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const particleRef = useRef<ParticleCanvasHandle>(null);
  const whisperTimerRef = useRef<number | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const prevPouringRef = useRef(false);

  const isLush = hasWatered || waterCount > 0;
  const stage = Math.max(0, evolutionLevel);

  const cleanTag = typedHandle.replace(/^@+/, '').trim();
  const markerLabel = cleanTag ? `@${cleanTag}` : '@你的ID';

  const showWhisper = (text: string) => {
    setWhisper(text);
    if (whisperTimerRef.current !== null) {
      window.clearTimeout(whisperTimerRef.current);
    }
    whisperTimerRef.current = window.setTimeout(() => {
      setWhisper(null);
    }, 2200);
  };

  useEffect(() => {
    if (isPouring) {
      const stageEl = stageRef.current;
      const w = stageEl?.clientWidth ?? 440;
      const h = stageEl?.clientHeight ?? 340;
      const fromX = w * 0.57;
      const fromY = h * 0.28;
      const toX = w * 0.49;
      const toY = h * 0.56;

      const interval = window.setInterval(() => {
        particleRef.current?.emitStreamDroplet(fromX, fromY, toX, toY);
        particleRef.current?.emitStreamDroplet(fromX - 2, fromY + 2, toX - 8, toY - 6);
      }, 40);

      prevPouringRef.current = true;
      return () => window.clearInterval(interval);
    }

    if (prevPouringRef.current && !isPouring) {
      prevPouringRef.current = false;
      const stageEl = stageRef.current;
      const w = stageEl?.clientWidth ?? 440;
      const h = stageEl?.clientHeight ?? 340;
      if (hasWatered) {
        particleRef.current?.emitCelebration(w * 0.5, h * 0.36);
      }
    }
  }, [isPouring, hasWatered]);

  const registerComboTap = (e: React.MouseEvent, isPot: boolean) => {
    e.stopPropagation();
    if (isPouring) return;

    const nextCombo = tapCombo + 1;
    const nextTotal = totalTaps + 1;
    setTapCombo(nextCombo);
    setTotalTaps(nextTotal);
    setTapImpulse((v) => v + 1);

    if (comboTimerRef.current !== null) {
      window.clearTimeout(comboTimerRef.current);
    }
    comboTimerRef.current = window.setTimeout(() => {
      setTapCombo(0);
    }, 1500);

    if (isPot) {
      playPotTapSound();
    } else {
      playPentatonicPop(nextCombo - 1);
    }

    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) {
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      particleRef.current?.emitTapBurst(
        localX,
        localY,
        hasWatered ? (nextCombo % 2 === 0 ? 'heart' : 'petal') : 'drop'
      );
    }

    if (nextCombo === 5) {
      showWhisper(hasWatered ? '连击 x5！花瓣都要晃散啦' : '手速真棒，拖水壶过来就能开浇！');
    } else if (nextCombo === 12) {
      showWhisper('x12 暴击！今天互关运拉满');
    } else if (nextTotal % 3 === 1) {
      if (hasValidHandle && !hasWatered) {
        showWhisper('花牌写好啦，快点「浇一瓢水」或拖水壶！');
      } else {
        const pool = hasWatered ? POST_WATER_WHISPERS : PRE_WATER_WHISPERS;
        showWhisper(pool[(nextTotal - 1) % pool.length]);
      }
    }
  };

  const handlePointerMoveStage = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height * 0.65)) / (rect.height / 2);
    setEyeOffset({
      x: Math.max(-3.2, Math.min(3.2, dx * 3.0)),
      y: Math.max(-2.2, Math.min(2.4, dy * 2.2)),
    });
  };

  const handlePointerLeaveStage = () => {
    setEyeOffset({ x: 0, y: 0 });
  };

  const checkOverPlant = (info: PanInfo) => {
    return info.offset.x < -28 && info.offset.y > -35 && info.offset.y < 160;
  };

  const handleCanDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsCanOverPlant(checkOverPlant(info));
  };

  const handleCanDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const droppedOverPlant = checkOverPlant(info);
    setIsDraggingCan(false);
    setIsCanOverPlant(false);
    if (droppedOverPlant) {
      if (!hasValidHandle && !hasWatered) {
        playPotTapSound();
        showWhisper('先把你的 @X账号 写进花牌里吧~');
      }
      onTriggerWater();
    }
  };

  const gazeX = isPouring
    ? 0
    : isDraggingCan || isCanOverPlant
      ? 2.2
      : isTyping
        ? 0
        : isHoveringCta
          ? 0
          : eyeOffset.x;
  const gazeY = isPouring
    ? 0
    : isTyping
      ? 2.6
      : isDraggingCan || isHoveringCta
        ? -2.0
        : eyeOffset.y;

  const activeSpeech = isPouring
    ? '咕咚咕咚~ 满血复活！'
    : isCanOverPlant
      ? hasValidHandle || hasWatered
        ? '松手就开始浇水！'
        : '还差你的 @X账号 哦'
      : whisper;

  const isSuperHyped = tapCombo >= 8;

  const skyBg =
    seedlingType === 'sakura'
      ? 'from-[#fdf2f6] via-[#f7f3f0] to-[#eee7df]'
      : seedlingType === 'pine'
        ? 'from-[#e6efe9] via-[#f3f4ef] to-[#e9e7dc]'
        : 'from-[#e9f2ea] via-[#f5f3ec] to-[#ece8dc]';

  const haloStroke = isPouring
    ? '#38bdf8'
    : stage >= 5
      ? '#eab308'
      : seedlingType === 'sakura'
        ? '#f472b6'
        : hasWatered
          ? '#facc15'
          : '#4ade80';

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMoveStage}
      onPointerLeave={handlePointerLeaveStage}
      className={`relative w-full h-[320px] sm:h-[360px] rounded-t-3xl overflow-hidden select-none bg-gradient-to-b ${skyBg}`}
    >
      {/* Sunlit Architectural Greenhouse Window Beams */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-10 w-64 h-[420px] rotate-[22deg] bg-gradient-to-b from-white/75 via-white/30 to-transparent blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-1/3 w-44 h-[380px] rotate-[22deg] bg-gradient-to-b from-white/55 via-white/20 to-transparent blur-xl"
      />

      {/* 60fps Fluid Water Droplet & Petal Physics Canvas */}
      <ParticleCanvas ref={particleRef} />

      {/* Top Whisper & Combo Floating Layer */}
      <div className="relative z-20 pt-4 px-4 flex items-center justify-center gap-3 min-h-[42px]">
        <AnimatePresence mode="wait">
          {activeSpeech && (
            <motion.div
              key={activeSpeech}
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="px-3.5 py-1.5 rounded-xl bg-white/95 border border-[#e4e2dc] text-xs font-medium text-[#1a211c] shadow-xs whitespace-nowrap"
            >
              {activeSpeech}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {tapCombo >= 3 && (
            <motion.span
              key={tapCombo}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1.06, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              className="font-mono-num text-xs font-bold text-[#15803d] whitespace-nowrap"
            >
              连击 x{tapCombo}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Drop Target Halo when dragging watering can */}
      <AnimatePresence>
        {isDraggingCan && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: isCanOverPlant ? 0.95 : 0.45,
              scale: isCanOverPlant ? 1.06 : 0.96,
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-10 w-40 h-40 rounded-full border-2 border-dashed border-[#0284c7] bg-[#e0f2fe]/35"
          />
        )}
      </AnimatePresence>

      {/* Main Centered Plant & Ceramic Planter */}
      <div className="relative z-10 flex items-end justify-center h-[256px] sm:h-[294px]">
        <svg
          viewBox="0 0 360 285"
          className="w-[310px] h-[246px] sm:w-[356px] sm:h-[282px] overflow-visible"
          role="img"
          aria-label="可互动的桌面盆栽"
        >
          <defs>
            <linearGradient id="ceramicBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdfbf7" />
              <stop offset="55%" stopColor="#f1ece1" />
              <stop offset="100%" stopColor="#dfd6c5" />
            </linearGradient>
            <linearGradient id="ceramicTerracotta" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d9855d" />
              <stop offset="60%" stopColor="#c26b44" />
              <stop offset="100%" stopColor="#a3512f" />
            </linearGradient>
            <linearGradient id="leafLight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="55%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="leafDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id="pineTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="pineBase" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>
            <linearGradient id="woodStake" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e7c697" />
              <stop offset="100%" stopColor="#c4955c" />
            </linearGradient>
          </defs>

          {/* Soft Ground Contact Shadow on Oak Sill */}
          <ellipse
            cx="180"
            cy="264"
            rx="78"
            ry="11"
            fill="#8b7355"
            opacity="0.28"
          />

          {/* Hydration / Hundred-Watering Aura Ring */}
          <AnimatePresence>
            {(hasWatered || isSuperHyped || isPouring || stage >= 5) && (
              <motion.circle
                cx="180"
                cy="108"
                r={stage >= 6 ? 90 : stage >= 5 ? 82 : 74}
                fill="none"
                stroke={haloStroke}
                strokeWidth={stage >= 5 ? '2' : '1.6'}
                strokeDasharray={stage >= 5 ? '6 6' : '5 8'}
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: stage >= 5 ? 0.74 : 0.56, scale: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.35 },
                  scale: { duration: 0.35 },
                  rotate: { duration: stage >= 6 ? 14 : 22, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '180px', originY: '108px' }}
              />
            )}
          </AnimatePresence>

          {/* Outer Double Halo for 300+ Uncapped Mythic Trees */}
          {stage >= 7 && (
            <motion.circle
              cx="180"
              cy="108"
              r="102"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.4"
              strokeDasharray="3 9"
              animate={{ rotate: -360 }}
              transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
              style={{ originX: '180px', originY: '108px', opacity: 0.6 }}
            />
          )}

          {/* Botanical Foliage by Species & Uncapped Growth Stage (0..7+) */}
          <motion.g
            onClick={(e) => registerComboTap(e, false)}
            whileHover={{ scale: 1.025 }}
            whileTap={{
              scaleX: 1.09,
              scaleY: 0.88,
              rotate: tapImpulse % 2 === 0 ? -4.5 : 4.5,
            }}
            animate={
              isPouring
                ? { scale: [1, 0.96, 1.06, 1], rotate: [0, -2.5, 2.5, 0] }
                : hasWatered
                  ? { scale: [1, 1.04, 1], y: [0, -3, 0] }
                  : { rotate: [-1.2, 1.2, -1.2] }
            }
            transition={
              isPouring
                ? { duration: 0.72, repeat: Infinity, ease: 'easeInOut' }
                : hasWatered
                  ? { duration: 0.55, ease: 'easeOut' }
                  : { duration: 4.6, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{ originX: '180px', originY: '180px', cursor: 'pointer' }}
          >
            {stage === 0 ? (
              /* Stage 0 (0-4 waterings): Germinating Seed Tip Peeking Out of Soil */
              <g>
                <ellipse cx="180" cy="179" rx="18" ry="6" fill="#523622" />
                <path
                  d="M180 179 C179 170, 181 163, 180 158"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                />
                <path
                  d="M180 162 C173 156, 169 158, 173 164 C176 167, 179 165, 180 162 Z"
                  fill={seedlingType === 'sakura' ? '#f9a8d4' : '#4ade80'}
                />
              </g>
            ) : (
              <>
                {seedlingType === 'sakura' && (
                  <g>
                    {stage === 1 ? (
                      <g>
                        <path
                          d="M180 182 C179 166, 182 150, 178 134"
                          fill="none"
                          stroke="#8b5a44"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M179 144 C165 138, 156 128, 154 120 C166 118, 175 128, 179 144 Z"
                          fill="url(#leafLight)"
                        />
                        <path
                          d="M179 136 C192 128, 202 120, 202 112 C190 112, 182 122, 179 136 Z"
                          fill="#f9a8d4"
                        />
                      </g>
                    ) : (
                      <g>
                        <path
                          d={
                            stage >= 3
                              ? 'M180 182 C178 150, 185 124, 178 88'
                              : 'M180 182 C178 156, 183 136, 179 108'
                          }
                          fill="none"
                          stroke="#784b3a"
                          strokeWidth={stage >= 4 ? '8.5' : '6.8'}
                          strokeLinecap="round"
                        />
                        <path
                          d="M180 144 C160 132, 146 118, 134 106"
                          fill="none"
                          stroke="#784b3a"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M180 128 C198 118, 214 106, 224 94"
                          fill="none"
                          stroke="#784b3a"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M148 118 C134 114, 122 104, 118 94 C132 92, 144 102, 148 118 Z"
                          fill="url(#leafLight)"
                        />
                        <path
                          d="M210 108 C222 104, 234 94, 238 84 C224 82, 212 92, 210 108 Z"
                          fill="url(#leafDark)"
                        />

                        {stage === 2 && (
                          <g>
                            <circle cx="134" cy="103" r="6" fill="#fbcfe8" />
                            <circle cx="224" cy="91" r="6" fill="#f9a8d4" />
                            <circle cx="179" cy="102" r="8" fill="#fbcfe8" />
                            <circle cx="179" cy="102" r="3" fill="#f472b6" />
                          </g>
                        )}

                        {stage >= 3 && (
                          <g>
                            <circle cx="132" cy="102" r={stage >= 4 ? 12 : 9.5} fill="#fbcfe8" />
                            <circle cx="125" cy="96" r={stage >= 4 ? 8 : 6} fill="#f9a8d4" />
                            <circle cx="139" cy="97" r="6.5" fill="#fdf2f8" />
                            <circle cx="132" cy="100" r="3" fill="#ec4899" />

                            <circle cx="224" cy="90" r={stage >= 4 ? 12 : 9.5} fill="#fbcfe8" />
                            <circle cx="231" cy="84" r={stage >= 4 ? 8 : 6} fill="#f9a8d4" />
                            <circle cx="218" cy="85" r="6" fill="#fdf2f8" />
                            <circle cx="224" cy="88" r="3" fill="#ec4899" />

                            <circle cx="176" cy="76" r={stage >= 4 ? 15 : 12} fill="#fbcfe8" />
                            <circle cx="164" cy="70" r={stage >= 4 ? 10 : 7.5} fill="#f9a8d4" />
                            <circle cx="189" cy="69" r={stage >= 4 ? 10 : 7.5} fill="#f9a8d4" />
                            <circle cx="177" cy="60" r={stage >= 4 ? 10.5 : 8} fill="#fdf2f8" />
                          </g>
                        )}

                        {stage >= 4 && (
                          <g>
                            <circle cx="176" cy="72" r="4.2" fill="#db2777" />
                            <circle cx="152" cy="82" r="7.5" fill="#fbcfe8" />
                            <circle cx="202" cy="78" r="8" fill="#fbcfe8" />
                            <circle cx="164" cy="54" r="6" fill="#f9a8d4" />
                            <circle cx="192" cy="52" r="5.5" fill="#fbcfe8" />
                            <ellipse cx="116" cy="134" rx="4" ry="2.2" transform="rotate(-24 116 134)" fill="#f9a8d4" opacity="0.85" />
                            <ellipse cx="244" cy="118" rx="3.8" ry="2" transform="rotate(28 244 118)" fill="#fbcfe8" opacity="0.85" />
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                )}

                {seedlingType === 'pine' && (
                  <g>
                    {stage === 1 ? (
                      <g>
                        <path
                          d="M180 182 L180 156"
                          stroke="#7c4a2d"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                        <path
                          d="M156 162 Q180 156 204 162 L180 116 Z"
                          fill="url(#pineTop)"
                        />
                      </g>
                    ) : (
                      <g>
                        <path
                          d="M180 182 L180 142"
                          stroke="#7c4a2d"
                          strokeWidth="9"
                          strokeLinecap="round"
                        />
                        <path
                          d="M126 154 Q180 144 234 154 L180 100 Z"
                          fill="url(#pineBase)"
                        />
                        <path
                          d="M138 124 Q180 116 222 124 L180 72 Z"
                          fill="url(#pineTop)"
                        />
                        {stage >= 3 && (
                          <g>
                            <path
                              d="M150 96 Q180 90 210 96 L180 48 Z"
                              fill="url(#leafLight)"
                            />
                            <ellipse cx="155" cy="145" rx="4.2" ry="5.8" fill="#a16207" />
                            <ellipse cx="205" cy="138" rx="4.2" ry="5.8" fill="#a16207" />
                          </g>
                        )}
                        {stage >= 4 && (
                          <g>
                            <path
                              d="M161 70 Q180 65 199 70 L180 34 Z"
                              fill="#4ade80"
                            />
                            <path
                              d="M180 22 L183 30 L191 33 L183 36 L180 44 L177 36 L169 33 L177 30 Z"
                              fill="#facc15"
                            />
                            <circle cx="164" cy="108" r="3" fill="#fde047" />
                            <circle cx="198" cy="112" r="3" fill="#fde047" />
                            <g transform="translate(210, 92)">
                              <ellipse cx="0" cy="0" rx="6.5" ry="5" fill="#fb923c" />
                              <circle cx="4.5" cy="-3.5" r="3.6" fill="#fdba74" />
                              <polygon points="8,-4 12,-2.5 8,-1" fill="#f59e0b" />
                              <circle cx="5.5" cy="-4" r="0.9" fill="#1a211c" />
                            </g>
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                )}

                {seedlingType === 'clover' && (
                  <g>
                    {stage === 1 ? (
                      <g>
                        <path
                          d="M180 182 C178 164, 176 150, 178 134"
                          fill="none"
                          stroke="#15803d"
                          strokeWidth="4.8"
                          strokeLinecap="round"
                        />
                        <g transform="translate(178, 128) scale(0.85)">
                          <path d="M0 0 C-14 -10, -22 2, -10 11 C-4 15, 0 7, 0 0 Z" fill="url(#leafDark)" />
                          <path d="M0 0 C14 -10, 22 2, 10 11 C4 15, 0 7, 0 0 Z" fill="url(#leafLight)" />
                          <path d="M0 0 C-9 -18, 9 -18, 0 0 Z" fill="url(#leafLight)" />
                        </g>
                      </g>
                    ) : (
                      <g>
                        <path
                          d="M178 182 C175 154, 168 134, 166 112"
                          fill="none"
                          stroke="#15803d"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M182 182 C188 156, 198 138, 202 122"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                        />
                        <g transform="translate(166, 98)">
                          <path d="M0 0 C-14 -10, -24 2, -12 12 C-5 17, 0 8, 0 0 Z" fill="url(#leafDark)" />
                          <path d="M0 0 C14 -10, 24 2, 12 12 C5 17, 0 8, 0 0 Z" fill="url(#leafLight)" />
                          <path d="M0 0 C-10 -20, 4 -28, 10 -14 C13 -6, 6 -2, 0 0 Z" fill="url(#leafLight)" />
                          <path d="M0 0 C-16 -22, -4 -30, -11 -14 C-14 -6, -6 -2, 0 0 Z" fill="url(#leafDark)" />
                          <circle cx="0" cy="-1" r="2.5" fill="#dcfce7" />
                        </g>
                        <g transform="translate(204, 118) scale(0.78)">
                          <path d="M0 0 C-14 -10, -24 2, -12 12 C-5 17, 0 8, 0 0 Z" fill="url(#leafLight)" />
                          <path d="M0 0 C14 -10, 24 2, 12 12 C5 17, 0 8, 0 0 Z" fill="url(#leafDark)" />
                          <path d="M0 0 C-8 -18, 8 -18, 0 0 Z" fill="url(#leafLight)" />
                        </g>
                        {stage >= 3 && (
                          <g>
                            <path
                              d="M174 114 C166 96, 158 84, 152 74"
                              fill="none"
                              stroke="#16a34a"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                            <circle cx="152" cy="74" r={stage >= 4 ? 5.5 : 3.5} fill={stage >= 4 ? '#ffffff' : '#bbf7d0'} stroke="#86efac" strokeWidth="1.2" />
                          </g>
                        )}
                        {stage >= 4 && (
                          <g>
                            <circle cx="152" cy="74" r="2.2" fill="#facc15" />
                            <path
                              d="M196 122 C194 108, 193 102, 192 94"
                              fill="none"
                              stroke="#16a34a"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />
                            <circle cx="192" cy="94" r="5" fill="#ffffff" stroke="#bbf7d0" strokeWidth="1.2" />
                            <circle cx="192" cy="94" r="2" fill="#facc15" />
                            <circle cx="136" cy="98" r="4.2" fill="#ffffff" stroke="#bbf7d0" strokeWidth="1.2" />
                            <circle cx="136" cy="98" r="1.8" fill="#facc15" />
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                )}

                {seedlingType === 'sunflower' && (
                  <g>
                    {stage === 1 ? (
                      <g>
                        <path
                          d="M180 182 C179 164, 181 148, 179 132"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="5.2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M179 138 C162 128, 150 132, 152 142 C156 150, 170 148, 179 138 Z"
                          fill="url(#leafLight)"
                        />
                        <path
                          d="M179 138 C196 128, 208 132, 206 142 C202 150, 188 148, 179 138 Z"
                          fill="url(#leafDark)"
                        />
                      </g>
                    ) : (
                      <g>
                        <path
                          d={
                            stage >= 3
                              ? 'M180 182 C178 150, 182 120, 180 86'
                              : 'M180 182 C178 158, 176 136, 179 108'
                          }
                          fill="none"
                          stroke="#15803d"
                          strokeWidth="7.2"
                          strokeLinecap="round"
                        />
                        <motion.g
                          animate={isPouring ? { rotate: -8 } : { rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                          style={{ originX: '178px', originY: '150px' }}
                        >
                          <path
                            d="M178 152 C154 146, 126 134, 110 120 C130 110, 160 120, 178 145 Z"
                            fill="url(#leafDark)"
                          />
                          <path
                            d="M173 147 C154 138, 136 130, 120 122"
                            fill="none"
                            stroke="#86efac"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.65"
                          />
                        </motion.g>
                        <motion.g
                          animate={isPouring ? { rotate: 8 } : { rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                          style={{ originX: '181px', originY: '136px' }}
                        >
                          <path
                            d="M181 138 C204 132, 232 118, 246 102 C226 94, 198 106, 181 131 Z"
                            fill="url(#leafLight)"
                          />
                          <path
                            d="M185 133 C203 124, 220 114, 236 106"
                            fill="none"
                            stroke="#bbf7d0"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            opacity="0.72"
                          />
                        </motion.g>
                        {stage === 2 && (
                          <g>
                            <path
                              d="M180 110 C164 98, 158 78, 168 68 C182 76, 188 94, 180 110 Z"
                              fill="url(#leafLight)"
                            />
                            <path
                              d="M180 110 C196 100, 206 82, 196 70 C182 76, 174 94, 180 110 Z"
                              fill="url(#leafDark)"
                              opacity="0.94"
                            />
                          </g>
                        )}
                        {stage >= 3 && (
                          <g>
                            <path
                              d="M179 124 C162 116, 144 104, 134 92 C150 88, 168 100, 179 118 Z"
                              fill="url(#leafLight)"
                            />
                            <path
                              d="M181 116 C196 110, 212 100, 222 88 C206 84, 190 94, 181 111 Z"
                              fill="url(#leafDark)"
                            />
                            <circle cx="136" cy="90" r="4.5" fill="#fde047" />
                            <circle cx="220" cy="87" r="4.2" fill="#facc15" />
                          </g>
                        )}
                        {stage === 3 && (
                          <g>
                            <circle cx="180" cy="76" r="14" fill="#16a34a" />
                            <path d="M168 73 Q180 54 192 73 Z" fill="#facc15" />
                            <path d="M166 78 L180 86 L194 78 L180 72 Z" fill="#15803d" />
                          </g>
                        )}
                        <AnimatePresence>
                          {stage >= 4 && (
                            <motion.g
                              initial={{ scale: 0, opacity: 0, y: 10 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                              style={{ originX: '180px', originY: '62px' }}
                            >
                              <circle cx="164" cy="62" r="9" fill="#fde047" />
                              <circle cx="196" cy="62" r="9" fill="#fde047" />
                              <circle cx="180" cy="46" r="9" fill="#facc15" />
                              <circle cx="180" cy="78" r="9" fill="#facc15" />
                              <circle cx="169" cy="50" r="8" fill="#fef08a" />
                              <circle cx="191" cy="50" r="8" fill="#fef08a" />
                              <circle cx="169" cy="74" r="8" fill="#fef08a" />
                              <circle cx="191" cy="74" r="8" fill="#fef08a" />
                              <circle cx="180" cy="62" r="10.5" fill="#78350f" />
                              <circle cx="177" cy="59" r="2.6" fill="#d97706" opacity="0.65" />
                            </motion.g>
                          )}
                        </AnimatePresence>
                      </g>
                    )}
                  </g>
                )}
              </>
            )}

            {/* Stage 4+: Fluttering Butterfly */}
            <AnimatePresence>
              {stage >= 4 && (
                <motion.g
                  initial={{ opacity: 0, x: 222, y: 34, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    x: [224, 210, 228, 216],
                    y: [46, 32, 40, 30],
                    scale: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 4.4,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  }}
                >
                  <path
                    d="M0 0 C-7 -9, -14 -4, -9 3 C-6 7, -1 4, 0 0 Z"
                    fill={seedlingType === 'sakura' ? '#f472b6' : '#fb923c'}
                  />
                  <path
                    d="M0 0 C7 -9, 14 -4, 9 3 C6 7, 1 4, 0 0 Z"
                    fill={seedlingType === 'sakura' ? '#fbcfe8' : '#fdba74'}
                  />
                  <line
                    x1="0"
                    y1="-3"
                    x2="0"
                    y2="4"
                    stroke="#7c2d12"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Stage 5+ (100+): Companion Rim Blossoms */}
            {stage >= 5 && (
              <g>
                <circle cx="142" cy="174" r="4.5" fill="#fde047" />
                <circle cx="142" cy="174" r="1.8" fill="#ffffff" />
                <circle cx="215" cy="175" r="4.2" fill="#f9a8d4" />
                <circle cx="215" cy="175" r="1.6" fill="#ffffff" />
              </g>
            )}

            {/* Stage 6+ (200+): Twin Butterfly & Stardust Motes */}
            {stage >= 6 && (
              <g>
                <motion.g
                  animate={{
                    x: [122, 134, 118, 128],
                    y: [58, 46, 62, 50],
                  }}
                  transition={{
                    duration: 5.2,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  }}
                >
                  <path d="M0 0 C-6 -7, -11 -3, -7 2 C-5 5, -1 3, 0 0 Z" fill="#facc15" />
                  <path d="M0 0 C6 -7, 11 -3, 7 2 C5 5, 1 3, 0 0 Z" fill="#fef08a" />
                </motion.g>
                <circle cx="106" cy="84" r="2.2" fill="#fde047" opacity="0.85" />
                <circle cx="252" cy="74" r="2" fill="#fde047" opacity="0.85" />
              </g>
            )}

            {/* Stage 7+ (300+ Uncapped): Floating Golden Crown Star */}
            {stage >= 7 && (
              <motion.path
                d="M180 12 L183 20 L191 23 L183 26 L180 34 L177 26 L169 23 L177 20 Z"
                fill="#f59e0b"
                animate={{ y: [-2, 2, -2], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Fresh Dewdrops on Leaves */}
            {hasWatered && (
              <g opacity="0.92">
                <circle cx="132" cy="124" r="2.7" fill="#38bdf8" />
                <circle cx="222" cy="110" r="2.4" fill="#38bdf8" />
                <circle cx="172" cy="82" r="2.1" fill="#7dd3fc" />
              </g>
            )}
          </motion.g>

          {/* Live Wooden Garden Nameplate Stake in Soil */}
          <motion.g
            animate={{
              rotate: cleanTag ? 6 : 8,
              scale: cleanTag ? 1.02 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={{ originX: '228px', originY: '182px' }}
          >
            <rect x="225" y="144" width="6" height="42" rx="2" fill="#b0804b" />
            <rect
              x="194"
              y="126"
              width="76"
              height="24"
              rx="6"
              fill="url(#woodStake)"
              stroke="#a87943"
              strokeWidth="1.2"
            />
            <text
              x="232"
              y="141.5"
              textAnchor="middle"
              fill={cleanTag ? '#291d12' : '#785a3a'}
              fontSize="10"
              fontWeight={cleanTag ? '700' : '500'}
              fontFamily="JetBrains Mono, monospace"
            >
              {markerLabel.length > 11
                ? `${markerLabel.slice(0, 10)}…`
                : markerLabel}
            </text>
          </motion.g>

          {/* Speckled Stoneware Planter & Saucer */}
          <motion.g
            onClick={(e) => registerComboTap(e, true)}
            whileTap={{ scaleX: 1.05, scaleY: 0.94, y: 2 }}
            style={{ originX: '180px', originY: '260px', cursor: 'pointer' }}
          >
            <ellipse
              cx="180"
              cy="182"
              rx="52"
              ry="11"
              fill={isLush ? '#3d2516' : '#6b4c35'}
              className="transition-colors duration-500"
            />
            <path
              d="M118 250 L242 250 L234 261 C233 263, 228 265, 224 265 L136 265 C132 265, 127 263, 126 261 Z"
              fill="#d6cbb8"
            />
            <ellipse cx="180" cy="250" rx="62" ry="6" fill="#ebe3d5" />
            <path
              d="M124 185 L236 185 L224 250 C223 255, 218 258, 212 258 L148 258 C142 258, 137 255, 136 250 Z"
              fill="url(#ceramicBody)"
            />
            <path
              d="M132 232 L228 232 L224 250 C223 255, 218 258, 212 258 L148 258 C142 258, 137 255, 136 250 Z"
              fill="url(#ceramicTerracotta)"
            />
            <g fill="#9e917e" opacity="0.32">
              <circle cx="144" cy="204" r="1.2" />
              <circle cx="156" cy="222" r="1" />
              <circle cx="206" cy="201" r="1.3" />
              <circle cx="215" cy="219" r="1.1" />
              <circle cx="170" cy="197" r="0.9" />
              <circle cx="192" cy="225" r="1.2" />
            </g>
            <rect
              x="118"
              y="175"
              width="124"
              height="16"
              rx="7"
              fill="#f8f5ef"
              stroke="#dfd7c8"
              strokeWidth="1"
            />
            <g transform="translate(180, 212)">
              <ellipse
                cx="-21"
                cy="4"
                rx="6"
                ry="3"
                fill="#fda4af"
                opacity={hasWatered || isPouring || isSuperHyped ? 0.72 : 0.28}
              />
              <ellipse
                cx="21"
                cy="4"
                rx="6"
                ry="3"
                fill="#fda4af"
                opacity={hasWatered || isPouring || isSuperHyped ? 0.72 : 0.28}
              />
              {isPouring || isSuperHyped ? (
                <g
                  fill="none"
                  stroke="#2a241e"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M-18 -5 L-11 -1 L-18 3" />
                  <path d="M18 -5 L11 -1 L18 3" />
                  <path d="M-5 3 Q0 9.5 5 3" />
                </g>
              ) : hasWatered ? (
                <g
                  fill="none"
                  stroke="#2a241e"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                >
                  <path d="M-19 -1 Q-14 -7 -9 -1" />
                  <path d="M9 -1 Q14 -7 19 -1" />
                  <path d="M-5.5 3.5 Q0 9.5 5.5 3.5" />
                </g>
              ) : (
                <g>
                  <circle cx={-14 + gazeX} cy={-2 + gazeY} r="3.1" fill="#2a241e" />
                  <circle cx={-15 + gazeX} cy={-3.3 + gazeY} r="1" fill="#ffffff" />
                  <circle cx={14 + gazeX} cy={-2 + gazeY} r="3.1" fill="#2a241e" />
                  <circle cx={13 + gazeX} cy={-3.3 + gazeY} r="1" fill="#ffffff" />
                  {isHoveringCta || isDraggingCan ? (
                    <path
                      d="M-5 4 Q0 9.5 5 4"
                      fill="none"
                      stroke="#2a241e"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M-4 4.5 Q0 7 4 4.5"
                      fill="none"
                      stroke="#2a241e"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              )}
            </g>
          </motion.g>
        </svg>

        {/* Draggable Sage & Brushed-Brass Watering Can */}
        <motion.button
          type="button"
          drag={!isPouring}
          dragSnapToOrigin
          dragElastic={0.22}
          dragMomentum={false}
          onDragStart={() => {
            setIsDraggingCan(true);
            showWhisper('拖到小苗上方松手开浇~');
          }}
          onDrag={handleCanDrag}
          onDragEnd={handleCanDragEnd}
          onClick={() => {
            if (!isDraggingCan) {
              onTriggerWater();
            }
          }}
          aria-label="拖动或点击水壶给小苗浇水"
          title="拖动到小苗上方或点击浇水"
          animate={
            isPouring
              ? { x: -82, y: 6, rotate: -32, scale: 1.06 }
              : isDraggingCan
                ? { scale: 1.08, rotate: isCanOverPlant ? -24 : -8 }
                : { x: 0, y: 0, rotate: 0, scale: 1 }
          }
          whileHover={isPouring ? undefined : { y: -4, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="absolute top-2 right-3 sm:right-8 z-20 cursor-grab active:cursor-grabbing p-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] touch-none"
        >
          <svg
            viewBox="0 0 116 86"
            className="w-[88px] h-[66px] sm:w-[104px] sm:h-[78px] drop-shadow-sm overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sageCan" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="45%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="brassAccent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <path
              d="M78 27 C105 22, 108 62, 78 60"
              fill="none"
              stroke="url(#brassAccent)"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <path d="M40 48 L11 27 L8 33 L38 56 Z" fill="url(#brassAccent)" />
            <ellipse
              cx="9"
              cy="29"
              rx="4.5"
              ry="8"
              transform="rotate(-34 9 29)"
              fill="#b45309"
            />
            <rect x="38" y="25" width="44" height="41" rx="11" fill="url(#sageCan)" />
            <rect x="43" y="21" width="34" height="6" rx="3" fill="#a7f3d0" />
            <path
              d="M60 37 C60 37, 55 44, 55 47.5 C55 50.4, 57.2 52.5, 60 52.5 C62.8 52.5, 65 50.4, 65 47.5 C65 44, 60 37, 60 37 Z"
              fill="#ecfdf5"
              opacity="0.92"
            />
          </svg>
        </motion.button>
      </div>

      {/* Warm Oak Windowsill Plank */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-b from-[#d7ba92] via-[#c7a67a] to-[#b28e5f] border-t border-[#e5cda8]"
      />
    </div>
  );
}
