// 赔率引擎：去水、融合、分歧检测

// 去水
export function removeMargin(odds: { home: number; draw: number; away: number }): { home: number; draw: number; away: number } {
  const rawHome = 1 / odds.home;
  const rawDraw = 1 / odds.draw;
  const rawAway = 1 / odds.away;
  const sum = rawHome + rawDraw + rawAway;
  return {
    home: rawHome / sum,
    draw: rawDraw / sum,
    away: rawAway / sum
  };
}

// 模型与赔率融合
export function blendModelAndMarket(
  modelProb: { home: number; draw: number; away: number },
  marketProb: { home: number; draw: number; away: number },
  modelWeight: number = 0.80
): { home: number; draw: number; away: number } {
  const marketWeight = 1 - modelWeight;
  return {
    home: modelProb.home * modelWeight + marketProb.home * marketWeight,
    draw: modelProb.draw * modelWeight + marketProb.draw * marketWeight,
    away: modelProb.away * modelWeight + marketProb.away * marketWeight
  };
}

// 计算分歧
export function calculateDivergence(
  modelProb: { home: number; draw: number; away: number },
  marketProb: { home: number; draw: number; away: number }
): { level: '低' | '中' | '高'; maxDiff: number; details: string } {
  const diffs = [
    Math.abs(modelProb.home - marketProb.home),
    Math.abs(modelProb.draw - marketProb.draw),
    Math.abs(modelProb.away - marketProb.away)
  ];
  const maxDiff = Math.max(...diffs);
  
  let level: '低' | '中' | '高';
  if (maxDiff < 0.08) level = '低';
  else if (maxDiff < 0.15) level = '中';
  else level = '高';
  
  const details = `模型与赔率最大偏差 ${(maxDiff * 100).toFixed(1)}%`;
  return { level, maxDiff, details };
}

// 从大小球赔率反推进球均值
export function estimateGoalsFromOverUnder(overOdds: number, underOdds: number, line: number = 2.5): number {
  const pOver = (1 / overOdds) / (1 / overOdds + 1 / underOdds);
  // 近似反推 lambda
  // P(over) = 1 - P(0) - P(1) - P(2) for line 2.5
  // 简化：用经验公式
  const ratio = pOver;
  // P(over 2.5) ≈ 0.55 when lambda=2.7
  const lambda = line + (ratio - 0.5) * 2;
  return Math.max(0.5, Math.min(6.0, lambda));
}

// mock 赔率
export const mockOdds = {
  spain_vs_austria: { home: 1.55, draw: 3.80, away: 5.50 },
  portugal_vs_croatia: { home: 2.05, draw: 3.25, away: 3.60 },
  swiss_vs_algeria: { home: 1.90, draw: 3.30, away: 4.00 }
};
