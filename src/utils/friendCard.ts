import type { SeedlingType } from '../firebase';

export interface FriendPersona {
  trait: string;
}

export interface SeedlingMeta {
  type: SeedlingType;
  name: string;
  tagline: string;
  accentColor: string;
}

export interface GrowthStageDef {
  level: number;
  minWaterings: number;
  label: string;
  shortLabel: string;
  summary: string;
}

export const BASE_GROWTH_STAGES: GrowthStageDef[] = [
  {
    level: 0,
    minWaterings: 0,
    label: '蓄力萌芽',
    shortLabel: '萌芽',
    summary: '种子刚埋入湿润土壤，集齐 5 瓢水即可破土而出',
  },
  {
    level: 1,
    minWaterings: 5,
    label: '破土嫩芽',
    shortLabel: '破土',
    summary: '成功顶开泥土，长出第一对娇嫩子叶',
  },
  {
    level: 2,
    minWaterings: 10,
    label: '抽枝开叶',
    shortLabel: '开叶',
    summary: '舒展出大片翠绿叶片，枝干开始稳稳扎根',
  },
  {
    level: 3,
    minWaterings: 30,
    label: '含苞待放',
    shortLabel: '含苞',
    summary: '枝繁叶茂并凝结饱满花苞，距离绽放只差一步',
  },
  {
    level: 4,
    minWaterings: 50,
    label: '满园盛放',
    shortLabel: '盛放',
    summary: '花朵彻底盛开，引来蝴蝶与小鸟在枝头栖息',
  },
  {
    level: 5,
    minWaterings: 100,
    label: '百瓢荣光',
    shortLabel: '100+',
    summary: '解锁金色光环与盆边伴生小花，百人认证的热门花园',
  },
  {
    level: 6,
    minWaterings: 200,
    label: '繁花秘境',
    shortLabel: '200+',
    summary: '双蝶绕飞与星尘光点浮现，社区顶流打卡地标',
  },
  {
    level: 7,
    minWaterings: 300,
    label: '传世神木',
    shortLabel: '300+',
    summary: '每多 100 瓢水继续升级（400、500…），成长永无上限',
  },
];

export const SEEDLING_CATALOG: SeedlingMeta[] = [
  {
    type: 'sunflower',
    name: '向日葵花苗',
    tagline: '自带光芒的社交小太阳，浇水越多人越耀眼',
    accentColor: '#eab308',
  },
  {
    type: 'sakura',
    name: '樱花树苗',
    tagline: '落英缤纷的粉嫩枝桠，吸引有缘朋友',
    accentColor: '#ec4899',
  },
  {
    type: 'pine',
    name: '常青松树苗',
    tagline: '越浇越挺拔的长青友谊树，还有小鸟栖息',
    accentColor: '#15803d',
  },
  {
    type: 'clover',
    name: '幸运四叶草',
    tagline: '稀有的四片叶子，给互关加满好运气',
    accentColor: '#10b981',
  },
];

export function getSeedlingMeta(type: SeedlingType): SeedlingMeta {
  return SEEDLING_CATALOG.find((item) => item.type === type) ?? SEEDLING_CATALOG[0];
}

const PERSONAS: FriendPersona[] = [
  { trait: '摸鱼顺手浇出个新朋友' },
  { trait: '自带 100% 回关好运体质' },
  { trait: '互联网高含金量好邻居' },
  { trait: '时间线冲浪一级捕手' },
  { trait: '把花盆浇到害羞的幸运星' },
  { trait: '比冰美式还提神的赛博搭子' },
  { trait: '精准空降的灵魂同好' },
  { trait: 'X 绿洲头号金牌园丁' },
];

export function getFriendPersona(xHandle: string, wateringNumber: number): FriendPersona {
  let hash = wateringNumber * 31;
  for (let i = 0; i < xHandle.length; i += 1) {
    hash = (hash * 33 + xHandle.charCodeAt(i)) >>> 0;
  }
  return PERSONAS[hash % PERSONAS.length];
}

export function getGardenEvolution(totalWaterings: number): {
  level: number;
  label: string;
  summary: string;
  nextMilestone: number;
  nextLabel: string;
  remaining: number;
} {
  if (totalWaterings < 5) {
    return {
      level: 0,
      label: '蓄力萌芽',
      summary: BASE_GROWTH_STAGES[0].summary,
      nextMilestone: 5,
      nextLabel: '破土嫩芽',
      remaining: 5 - totalWaterings,
    };
  }
  if (totalWaterings < 10) {
    return {
      level: 1,
      label: '破土嫩芽',
      summary: BASE_GROWTH_STAGES[1].summary,
      nextMilestone: 10,
      nextLabel: '抽枝开叶',
      remaining: 10 - totalWaterings,
    };
  }
  if (totalWaterings < 30) {
    return {
      level: 2,
      label: '抽枝开叶',
      summary: BASE_GROWTH_STAGES[2].summary,
      nextMilestone: 30,
      nextLabel: '含苞待放',
      remaining: 30 - totalWaterings,
    };
  }
  if (totalWaterings < 50) {
    return {
      level: 3,
      label: '含苞待放',
      summary: BASE_GROWTH_STAGES[3].summary,
      nextMilestone: 50,
      nextLabel: '满园盛放',
      remaining: 50 - totalWaterings,
    };
  }
  if (totalWaterings < 100) {
    return {
      level: 4,
      label: '满园盛放',
      summary: BASE_GROWTH_STAGES[4].summary,
      nextMilestone: 100,
      nextLabel: '百瓢荣光',
      remaining: 100 - totalWaterings,
    };
  }
  if (totalWaterings < 200) {
    return {
      level: 5,
      label: '百瓢荣光',
      summary: BASE_GROWTH_STAGES[5].summary,
      nextMilestone: 200,
      nextLabel: '繁花秘境',
      remaining: 200 - totalWaterings,
    };
  }
  if (totalWaterings < 300) {
    return {
      level: 6,
      label: '繁花秘境',
      summary: BASE_GROWTH_STAGES[6].summary,
      nextMilestone: 300,
      nextLabel: '传世神木',
      remaining: 300 - totalWaterings,
    };
  }

  // Uncapped endless stages: 300->Lv.7, 400->Lv.8, 500->Lv.9...
  const hundredTier = Math.floor(totalWaterings / 100); // >= 3
  const level = 4 + hundredTier;
  const nextMilestone = (hundredTier + 1) * 100;
  return {
    level,
    label: `传世神木 · ${hundredTier * 100}阶`,
    summary: `已达成 ${hundredTier * 100} 瓢成就，再获 ${nextMilestone - totalWaterings} 瓢迈向 ${nextMilestone} 阶神木`,
    nextMilestone,
    nextLabel: `传世神木 · ${nextMilestone}阶`,
    remaining: nextMilestone - totalWaterings,
  };
}

export interface FriendCardRenderParams {
  xHandle: string;
  ownerHandle: string;
  wateringNumber: number;
  trait: string;
  seedlingType: SeedlingType;
  seedlingName: string;
  evolutionLevel: number;
  stageLabel: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawPopPlantIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  soilY: number,
  seedlingType: SeedlingType,
  evolutionLevel: number,
  visitorHandle: string
) {
  ctx.save();

  const drawLeaf = (
    x1: number,
    y1: number,
    cx1: number,
    cy1: number,
    x2: number,
    y2: number,
    cx2: number,
    cy2: number,
    fill: string
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx1, cy1, x2, y2);
    ctx.quadraticCurveTo(cx2, cy2, x1, y1);
    ctx.fill();
  };

  // Contact shadow
  ctx.fillStyle = 'rgba(24, 24, 27, 0.08)';
  ctx.beginPath();
  ctx.ellipse(cx, soilY + 124, 98, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw bold clean oversized botanical illustration
  if (seedlingType === 'sunflower') {
    if (evolutionLevel === 0) {
      // Cozy sprouting bump in soil
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx, soilY - 12, 12, Math.PI, 0);
      ctx.fill();
    } else if (evolutionLevel === 1) {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.lineTo(cx, soilY - 64);
      ctx.stroke();
      drawLeaf(cx, soilY - 58, cx - 34, soilY - 84, cx - 42, soilY - 66, cx - 22, soilY - 46, '#22c55e');
      drawLeaf(cx, soilY - 58, cx + 34, soilY - 84, cx + 42, soilY - 66, cx + 22, soilY - 46, '#16a34a');
    } else {
      const stemTop = evolutionLevel === 2 ? soilY - 110 : soilY - 148;
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.quadraticCurveTo(cx - 5, (soilY + stemTop) / 2, cx, stemTop);
      ctx.stroke();

      drawLeaf(cx - 2, soilY - 44, cx - 64, soilY - 72, cx - 78, soilY - 92, cx - 40, soilY - 104, '#166534');
      drawLeaf(cx + 2, soilY - 64, cx + 64, soilY - 92, cx + 78, soilY - 112, cx + 38, soilY - 120, '#22c55e');

      if (evolutionLevel === 2) {
        drawLeaf(cx, stemTop + 4, cx - 28, stemTop - 36, cx - 12, stemTop - 50, cx + 4, stemTop - 20, '#4ade80');
        drawLeaf(cx, stemTop + 4, cx + 28, stemTop - 36, cx + 12, stemTop - 50, cx - 4, stemTop - 20, '#15803d');
      } else if (evolutionLevel === 3) {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(cx, stemTop - 12, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, stemTop - 18, 14, Math.PI, 0);
        ctx.fill();
      } else {
        const fy = stemTop - 22;
        for (let p = 0; p < 12; p += 1) {
          const angle = (Math.PI * 2 * p) / 12;
          ctx.save();
          ctx.translate(cx, fy);
          ctx.rotate(angle);
          ctx.fillStyle = p % 2 === 0 ? '#facc15' : '#fde047';
          ctx.beginPath();
          ctx.ellipse(0, -30, 9.5, 19, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(cx, fy, 19, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (seedlingType === 'sakura') {
    if (evolutionLevel === 0) {
      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath();
      ctx.arc(cx, soilY - 12, 12, Math.PI, 0);
      ctx.fill();
    } else if (evolutionLevel === 1) {
      ctx.strokeStyle = '#784b3a';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.lineTo(cx, soilY - 62);
      ctx.stroke();
      drawLeaf(cx, soilY - 54, cx - 28, soilY - 78, cx - 34, soilY - 62, cx - 16, soilY - 46, '#86efac');
      drawLeaf(cx, soilY - 58, cx + 28, soilY - 82, cx + 34, soilY - 66, cx + 16, soilY - 48, '#f9a8d4');
    } else {
      const trunkTop = soilY - 138;
      ctx.strokeStyle = '#784b3a';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.quadraticCurveTo(cx + 6, soilY - 70, cx - 2, trunkTop);
      ctx.stroke();
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(cx, soilY - 66);
      ctx.quadraticCurveTo(cx - 32, soilY - 86, cx - 54, soilY - 110);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, soilY - 84);
      ctx.quadraticCurveTo(cx + 32, soilY - 102, cx + 54, soilY - 124);
      ctx.stroke();

      const clusters =
        evolutionLevel === 2
          ? [
              [cx - 54, soilY - 114, 14],
              [cx + 54, soilY - 126, 14],
              [cx - 2, trunkTop - 12, 16],
            ]
          : [
              [cx - 56, soilY - 116, 26],
              [cx + 56, soilY - 128, 26],
              [cx - 2, trunkTop - 26, 34],
              [cx - 30, trunkTop - 10, 22],
              [cx + 30, trunkTop - 12, 22],
            ];
      for (const [bx, by, br] of clusters) {
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fdf2f8';
        ctx.beginPath();
        ctx.arc(bx - br * 0.25, by - br * 0.25, br * 0.6, 0, Math.PI * 2);
        ctx.fill();
        if (evolutionLevel >= 4) {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else if (seedlingType === 'pine') {
    if (evolutionLevel === 0) {
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(cx, soilY - 12, 12, Math.PI, 0);
      ctx.fill();
    } else if (evolutionLevel === 1) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(cx - 32, soilY - 18);
      ctx.lineTo(cx, soilY - 82);
      ctx.lineTo(cx + 32, soilY - 18);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#7c4a2d';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.lineTo(cx, soilY - 56);
      ctx.stroke();
      const tiers = Math.min(4, evolutionLevel);
      const colors = ['#065f46', '#047857', '#10b981', '#34d399'];
      for (let t = 0; t < tiers; t += 1) {
        const baseY = soilY - 38 - t * 34;
        const halfW = 72 - t * 12;
        const tipY = baseY - 64 + t * 5;
        ctx.fillStyle = colors[t % colors.length];
        ctx.beginPath();
        ctx.moveTo(cx - halfW, baseY);
        ctx.quadraticCurveTo(cx, baseY + 10, cx + halfW, baseY);
        ctx.lineTo(cx, tipY);
        ctx.closePath();
        ctx.fill();
      }
      if (evolutionLevel >= 4) {
        const starY = soilY - 38 - (tiers - 1) * 34 - 52;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, starY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    if (evolutionLevel === 0) {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(cx, soilY - 12, 12, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      const stemH = evolutionLevel === 1 ? 66 : 114;
      ctx.beginPath();
      ctx.moveTo(cx, soilY);
      ctx.quadraticCurveTo(cx - 12, soilY - stemH * 0.5, cx - 10, soilY - stemH);
      ctx.stroke();

      const drawCloverHead = (hx: number, hy: number, scale: number, fourLeaf: boolean) => {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(scale, scale);
        const angles = fourLeaf ? [-0.9, 0.9, -2.35, 2.35] : [-1.0, 1.0, 0];
        angles.forEach((ang, idx) => {
          ctx.save();
          ctx.rotate(ang);
          ctx.fillStyle = idx % 2 === 0 ? '#16a34a' : '#22c55e';
          ctx.beginPath();
          ctx.ellipse(0, -16, 11, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        ctx.fillStyle = '#dcfce7';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawCloverHead(cx - 10, soilY - stemH - 6, evolutionLevel === 1 ? 0.95 : 1.35, evolutionLevel >= 2);
      if (evolutionLevel >= 3) {
        ctx.beginPath();
        ctx.moveTo(cx + 6, soilY);
        ctx.quadraticCurveTo(cx + 22, soilY - 40, cx + 34, soilY - 88);
        ctx.stroke();
        drawCloverHead(cx + 34, soilY - 94, 0.98, true);
      }
      if (evolutionLevel >= 4) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 38, soilY - 148, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx - 38, soilY - 148, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Wooden Nameplate Stake with Visitor @handle
  ctx.save();
  ctx.translate(cx + 66, soilY - 4);
  ctx.rotate(0.11);
  ctx.fillStyle = '#b0804b';
  ctx.fillRect(-4, -52, 8, 54);
  drawRoundedRect(ctx, -50, -76, 100, 32, 8);
  ctx.fillStyle = '#e7c697';
  ctx.fill();
  ctx.strokeStyle = '#a87943';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#291d12';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stakeLabel = visitorHandle.length > 10 ? `${visitorHandle.slice(0, 9)}…` : visitorHandle;
  ctx.fillText(stakeLabel, 0, -60);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Rich Soil
  ctx.fillStyle = '#3d2516';
  ctx.beginPath();
  ctx.ellipse(cx, soilY, 72, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Saucer
  ctx.fillStyle = '#ded4c2';
  ctx.beginPath();
  ctx.moveTo(cx - 84, soilY + 98);
  ctx.lineTo(cx + 84, soilY + 98);
  ctx.lineTo(cx + 72, soilY + 115);
  ctx.lineTo(cx - 72, soilY + 115);
  ctx.closePath();
  ctx.fill();

  // Ceramic Planter Body
  const potGrad = ctx.createLinearGradient(cx - 74, soilY, cx + 74, soilY + 104);
  potGrad.addColorStop(0, '#ffffff');
  potGrad.addColorStop(1, '#eae2d3');
  ctx.fillStyle = potGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 76, soilY + 6);
  ctx.lineTo(cx + 76, soilY + 6);
  ctx.lineTo(cx + 58, soilY + 100);
  ctx.lineTo(cx - 58, soilY + 100);
  ctx.closePath();
  ctx.fill();

  // Terracotta Glaze Bottom
  ctx.fillStyle = '#c86f47';
  ctx.beginPath();
  ctx.moveTo(cx - 64, soilY + 70);
  ctx.lineTo(cx + 64, soilY + 70);
  ctx.lineTo(cx + 58, soilY + 100);
  ctx.lineTo(cx - 58, soilY + 100);
  ctx.closePath();
  ctx.fill();

  // Pot Rim
  drawRoundedRect(ctx, cx - 84, soilY - 8, 168, 21, 10);
  ctx.fillStyle = '#fcfaf6';
  ctx.fill();
  ctx.strokeStyle = '#dfd7c8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cute Expressive Happy Eyes & Blush
  ctx.fillStyle = 'rgba(251, 113, 133, 0.58)';
  ctx.beginPath();
  ctx.ellipse(cx - 30, soilY + 46, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 30, soilY + 46, 9, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 26, soilY + 37);
  ctx.quadraticCurveTo(cx - 18, soilY + 28, cx - 10, soilY + 37);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 10, soilY + 37);
  ctx.quadraticCurveTo(cx + 18, soilY + 28, cx + 26, soilY + 37);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 8, soilY + 45);
  ctx.quadraticCurveTo(cx, soilY + 54, cx + 8, soilY + 45);
  ctx.stroke();

  ctx.restore();
}

export async function renderFriendCardDataUrl(params: FriendCardRenderParams): Promise<string> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // continue with loaded fonts
    }
  }

  const {
    xHandle,
    ownerHandle,
    wateringNumber,
    trait,
    seedlingType,
    seedlingName,
    evolutionLevel,
    stageLabel,
  } = params;

  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Crisp Studio Off-White Poster Background
  ctx.fillStyle = '#faf9f5';
  ctx.fillRect(0, 0, size, size);

  // Species Spotlight Halo Circle (Clean, Modern, Uncluttered Focus)
  const haloCenterX = size / 2;
  const haloCenterY = 392;
  const haloRadius = 224;

  const palette =
    seedlingType === 'sakura'
      ? { circle: '#fce7f3', glow: 'rgba(244, 114, 182, 0.14)', accent: '#db2777' }
      : seedlingType === 'pine'
        ? { circle: '#dcfce7', glow: 'rgba(21, 128, 61, 0.12)', accent: '#15803d' }
        : seedlingType === 'clover'
          ? { circle: '#d1fae5', glow: 'rgba(16, 185, 129, 0.13)', accent: '#059669' }
          : { circle: '#fef3c7', glow: 'rgba(234, 179, 8, 0.16)', accent: '#ca8a04' };

  const softGlow = ctx.createRadialGradient(
    haloCenterX,
    haloCenterY,
    60,
    haloCenterX,
    haloCenterY,
    400
  );
  softGlow.addColorStop(0, palette.glow);
  softGlow.addColorStop(1, 'rgba(250, 249, 245, 0)');
  ctx.fillStyle = softGlow;
  ctx.fillRect(0, 0, size, size);

  // Clean pastel disc
  ctx.fillStyle = palette.circle;
  ctx.beginPath();
  ctx.arc(haloCenterX, haloCenterY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Top Minimal Folio Header (Brand + Giant Collectible Serial)
  ctx.fillStyle = '#18181b';
  ctx.font = '700 26px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillText('浇个朋友', 72, 86);

  const serialStr = `#${String(wateringNumber).padStart(4, '0')}`;
  ctx.fillStyle = palette.accent;
  ctx.font = '700 38px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(serialStr, size - 72, 90);
  ctx.textAlign = 'left';

  // 3. Oversized Iconic Botanical Centerpiece
  drawPopPlantIcon(ctx, haloCenterX - 6, 444, seedlingType, evolutionLevel, xHandle);

  // Cute Floating Speech Bubble ("💧 +1") near top-right of halo
  ctx.save();
  ctx.shadowColor = 'rgba(24, 24, 27, 0.08)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  drawRoundedRect(ctx, 686, 214, 134, 52, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#e7e4db';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 686, 214, 134, 52, 26);
  ctx.stroke();
  ctx.fillStyle = '#15803d';
  ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💧 已浇水', 753, 248);

  // 4. Massive Focal Headline ("我马上就关注你哦")
  ctx.fillStyle = '#18181b';
  ctx.font = '700 72px "Fraunces", "Noto Serif SC", serif';
  ctx.fillText('我马上就关注你哦', size / 2, 728);

  // 5. Bold Mutual Handle Lockup (@visitor  ×  @owner)
  const dispVisitor = xHandle.length > 15 ? `${xHandle.slice(0, 14)}…` : xHandle;
  const dispOwner = ownerHandle.length > 15 ? `${ownerHandle.slice(0, 14)}…` : ownerHandle;

  ctx.font = '700 32px "JetBrains Mono", monospace';
  const vW = ctx.measureText(dispVisitor).width;
  const oW = ctx.measureText(dispOwner).width;
  const gap = 52;
  const totalW = vW + gap + oW;
  const startX = (size - totalW) / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#18181b';
  ctx.fillText(dispVisitor, startX, 804);

  ctx.fillStyle = '#15803d';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💧', startX + vW + gap / 2, 804);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#15803d';
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(dispOwner, startX + vW + gap, 804);

  // 6. Single Trendy Streetwear Sticker Pill (Short Ego/Personality Hook)
  ctx.textAlign = 'center';
  const badgeText = `第 ${wateringNumber} 位 · ${trait}`;
  ctx.font = '600 24px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = Math.min(760, badgeTextW + 56);
  drawRoundedRect(ctx, (size - badgeW) / 2, 856, badgeW, 56, 28);
  ctx.fillStyle = '#18181b';
  ctx.fill();

  ctx.fillStyle = '#faf9f5';
  ctx.fillText(badgeText, size / 2, 893);

  // 7. Clean Uncluttered Bottom Species & Stage Line
  ctx.fillStyle = '#71717a';
  ctx.font = '500 20px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillText(`${seedlingName}  ·  Lv.${evolutionLevel} ${stageLabel}`, size / 2, 996);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export interface AchievementCardRenderParams {
  xHandle: string;
  ownerHandle: string;
  wateringNumber: number;
  totalWaterings: number;
  seedlingType: SeedlingType;
  seedlingName: string;
  evolutionLevel: number;
  stageLabel: string;
  nextMilestone: number;
  nextLabel: string;
  remaining: number;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function renderAchievementCardDataUrl(
  params: AchievementCardRenderParams
): Promise<string> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // continue with loaded fonts
    }
  }

  const {
    xHandle,
    ownerHandle,
    wateringNumber,
    totalWaterings,
    seedlingType,
    seedlingName,
    evolutionLevel,
    stageLabel,
    nextLabel,
    remaining,
  } = params;

  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Deep Obsidian Botanical Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, '#0f1c15');
  bgGrad.addColorStop(1, '#162b20');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  const palette =
    seedlingType === 'sakura'
      ? { glow: 'rgba(244, 114, 182, 0.28)', accent: '#f472b6', ring: '#fbcfe8' }
      : seedlingType === 'pine'
        ? { glow: 'rgba(74, 222, 128, 0.24)', accent: '#4ade80', ring: '#bbf7d0' }
        : seedlingType === 'clover'
          ? { glow: 'rgba(52, 211, 153, 0.26)', accent: '#34d399', ring: '#a7f3d0' }
          : { glow: 'rgba(250, 204, 21, 0.28)', accent: '#facc15', ring: '#fef08a' };

  const haloCenterX = size / 2;
  const haloCenterY = 390;
  const haloRadius = 224;

  const aura = ctx.createRadialGradient(
    haloCenterX,
    haloCenterY,
    60,
    haloCenterX,
    haloCenterY,
    430
  );
  aura.addColorStop(0, palette.glow);
  aura.addColorStop(1, 'rgba(16, 29, 22, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric milestone ring
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.arc(haloCenterX, haloCenterY, haloRadius + 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Warm Studio Ivory Spotlight Disc
  ctx.fillStyle = '#faf9f5';
  ctx.beginPath();
  ctx.arc(haloCenterX, haloCenterY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Top Minimal Header (Milestone Title + Giant Level Badge)
  ctx.fillStyle = '#a7b5ab';
  ctx.font = '600 24px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillText('浇个朋友 · 成长成就', 72, 86);

  const levelStr = `LV.${evolutionLevel}`;
  ctx.fillStyle = palette.accent;
  ctx.font = '700 40px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(levelStr, size - 72, 90);
  ctx.textAlign = 'left';

  // 3. Oversized Plant Centerpiece (with Owner handle on wooden stake)
  drawPopPlantIcon(
    ctx,
    haloCenterX - 6,
    442,
    seedlingType,
    evolutionLevel,
    ownerHandle
  );

  // Floating Watering Counter Pill near top-right of spotlight disc
  const countChipText = `💧 已浇 ${totalWaterings} 瓢`;
  ctx.font = '700 21px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  const chipW = Math.max(158, ctx.measureText(countChipText).width + 44);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  drawRoundedRect(ctx, 668, 212, chipW, 50, 25);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0f1c15';
  ctx.textAlign = 'center';
  ctx.fillText(countChipText, 668 + chipW / 2, 245);

  // 4. Giant Hero Achievement Headline
  ctx.fillStyle = '#faf9f5';
  const heroTitle = `达成「${stageLabel}」`;
  ctx.font =
    heroTitle.length > 10
      ? '700 56px "Fraunces", "Noto Serif SC", serif'
      : '700 68px "Fraunces", "Noto Serif SC", serif';
  ctx.fillText(heroTitle, size / 2, 728);

  // 5. Garden Owner & Species Lockup
  const dispOwner =
    ownerHandle.length > 16 ? `${ownerHandle.slice(0, 15)}…` : ownerHandle;
  ctx.fillStyle = palette.accent;
  ctx.font = '700 30px "JetBrains Mono", "Noto Sans SC", sans-serif';
  ctx.fillText(`${dispOwner} 的${seedlingName}`, size / 2, 804);

  // 6. Contributor Sticker Badge (Visitor Social Flex)
  const dispVisitor =
    xHandle.length > 15 ? `${xHandle.slice(0, 14)}…` : xHandle;
  const badgeText = `第 #${wateringNumber} 位浇水伙伴 · ${dispVisitor}`;
  ctx.font = '600 23px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = Math.min(820, badgeTextW + 58);
  drawRoundedRect(ctx, (size - badgeW) / 2, 856, badgeW, 56, 28);
  ctx.fillStyle = '#faf9f5';
  ctx.fill();

  ctx.fillStyle = '#0f1c15';
  ctx.fillText(badgeText, size / 2, 892);

  // 7. Clean Uncluttered Next Milestone Footer
  ctx.fillStyle = '#92a397';
  ctx.font = '500 20px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
  ctx.fillText(
    `浇个朋友 · 还差 ${remaining} 瓢升至「${nextLabel}」`,
    size / 2,
    996
  );
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export async function downloadFriendCardPng(params: FriendCardRenderParams): Promise<void> {
  const dataUrl = await renderFriendCardDataUrl(params);
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = `jiaogepengyou-${params.xHandle.replace(/^@/, '')}-no${params.wateringNumber}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyFriendCardPng(params: FriendCardRenderParams): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false;
  }
  const dataUrl = await renderFriendCardDataUrl(params);
  if (!dataUrl) return false;
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
  return true;
}

export async function downloadAchievementCardPng(
  params: AchievementCardRenderParams
): Promise<void> {
  const dataUrl = await renderAchievementCardDataUrl(params);
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = `jiaogepengyou-lv${params.evolutionLevel}-${params.ownerHandle.replace(/^@/, '')}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyAchievementCardPng(
  params: AchievementCardRenderParams
): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false;
  }
  const dataUrl = await renderAchievementCardDataUrl(params);
  if (!dataUrl) return false;
  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
  return true;
}

export type NativeShareOutcome = 'shared' | 'cancelled' | 'fallback';

async function shareCardDataUrlNative(options: {
  dataUrl: string;
  filename: string;
  title: string;
  text: string;
  url: string;
}): Promise<NativeShareOutcome> {
  const { dataUrl, filename, title, text, url } = options;
  if (!dataUrl) return 'fallback';

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'fallback';
  }

  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: 'image/png' });

  const supportsFileShare =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  if (!supportsFileShare) {
    return 'fallback';
  }

  try {
    await navigator.share({
      title,
      text,
      url,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'fallback';
  }
}

export async function shareFriendCardNative(
  params: FriendCardRenderParams & { shareUrl: string }
): Promise<NativeShareOutcome> {
  const dataUrl = await renderFriendCardDataUrl(params);
  const outcome = await shareCardDataUrlNative({
    dataUrl,
    filename: `jiaogepengyou-${params.xHandle.replace(/^@/, '')}-no${params.wateringNumber}.png`,
    title: '浇个朋友 · 我马上就关注你哦',
    text: `刚刚给 ${params.ownerHandle} 的${params.seedlingName}浇了第 #${params.wateringNumber} 瓢水 💧`,
    url: params.shareUrl,
  });
  if (outcome === 'fallback' && dataUrl) {
    await downloadFriendCardPng(params);
  }
  return outcome;
}

export async function shareAchievementCardNative(
  params: AchievementCardRenderParams & { shareUrl: string }
): Promise<NativeShareOutcome> {
  const dataUrl = await renderAchievementCardDataUrl(params);
  const outcome = await shareCardDataUrlNative({
    dataUrl,
    filename: `jiaogepengyou-lv${params.evolutionLevel}-${params.ownerHandle.replace(/^@/, '')}.png`,
    title: `${params.ownerHandle} 的${params.seedlingName}达成「${params.stageLabel}」`,
    text: `已浇 ${params.totalWaterings} 瓢水，成功解锁 Lv.${params.evolutionLevel}「${params.stageLabel}」状态！🌱💧`,
    url: params.shareUrl,
  });
  if (outcome === 'fallback' && dataUrl) {
    await downloadAchievementCardPng(params);
  }
  return outcome;
}


