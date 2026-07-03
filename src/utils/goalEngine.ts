// 进球引擎：预期进球、Poisson分布、比分矩阵

// 计算预期总进球
export function calculateExpectedGoals(
  goalBase: number = 2.50,
  goalEnvironment: number = 0,
  goalEnvWeight: number = 0.50
): number {
  return goalBase + goalEnvironment * goalEnvWeight;
}

// Poisson 概率
export function poisson(lambda: number, k: number): number {
  const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// 总进球分布
export function calculateTotalGoalDistribution(expectedGoals: number): { goals: string; probability: number }[] {
  const lambda = expectedGoals;
  return [
    { goals: '0球', probability: poisson(lambda, 0) },
    { goals: '1球', probability: poisson(lambda, 1) },
    { goals: '2球', probability: poisson(lambda, 2) },
    { goals: '3球', probability: poisson(lambda, 3) },
    { goals: '4+球', probability: 1 - (poisson(lambda, 0) + poisson(lambda, 1) + poisson(lambda, 2) + poisson(lambda, 3)) }
  ];
}

// 计算主客队 xG
export function calculateXG(homeRating: number, awayRating: number, goalMultiplier: number = 1.0): { homeXg: number; awayXg: number } {
  const diff = homeRating - awayRating;
  const homeXg = 1.25 * Math.exp(diff / 32) * goalMultiplier;
  const awayXg = 1.05 * Math.exp(-diff / 32) * goalMultiplier;
  return { homeXg, awayXg };
}

// 比分矩阵 0:0 到 6:6
export function calculateScoreMatrix(homeXg: number, awayXg: number): { score: string; probability: number; home: number; away: number }[] {
  const maxGoals = 6;
  const matrix: { score: string; probability: number; home: number; away: number }[] = [];
  
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poisson(homeXg, h) * poisson(awayXg, a);
      matrix.push({ score: `${h}:${a}`, probability: prob, home: h, away: a });
    }
  }
  
  return matrix.sort((a, b) => b.probability - a.probability);
}

// 获取最可能的比分
export function getTopScorelines(
  homeXg: number,
  awayXg: number,
  topN: number = 5
): { score: string; probability: number; home: number; away: number }[] {
  return calculateScoreMatrix(homeXg, awayXg).slice(0, topN);
}

// 从比分矩阵提取胜平负概率
export function extractProbabilities(scoreMatrix: { home: number; away: number; probability: number }[]): { home: number; draw: number; away: number } {
  let home = 0, draw = 0, away = 0;
  scoreMatrix.forEach(s => {
    if (s.home > s.away) home += s.probability;
    else if (s.home === s.away) draw += s.probability;
    else away += s.probability;
  });
  return { home, draw, away };
}

// 比分条件映射
export function mapScoreToConditions(home: number, away: number): string[] {
  const conditions: string[] = [];
  
  if (home > away) conditions.push('主队胜');
  else if (home === away) conditions.push('平局');
  else conditions.push('客队胜');
  
  const totalGoals = home + away;
  conditions.push(`总进球${totalGoals}球`);
  
  const diff = Math.abs(home - away);
  if (diff === 1) conditions.push('净胜1球');
  else if (diff === 2) conditions.push('净胜2球');
  else if (diff >= 3) conditions.push(`净胜${diff}球`);
  
  conditions.push(`精确比分${home}:${away}`);
  
  return conditions;
}

// mock xG 数据
export const mockXGData = {
  spain_vs_austria: { homeRating: 87.25, awayRating: 78.12, goalMultiplier: 1.02 },
  portugal_vs_croatia: { homeRating: 84.5, awayRating: 79.8, goalMultiplier: 0.98 },
  swiss_vs_algeria: { homeRating: 80.3, awayRating: 75.6, goalMultiplier: 1.0 }
};
