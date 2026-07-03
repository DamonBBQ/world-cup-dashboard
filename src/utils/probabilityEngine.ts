// 预测引擎：特征归一化、edge计算、胜平负概率

export interface MatchFeatures {
  strength_diff: number;
  form_diff: number;
  home_advantage: number;
  injury_diff: number;
  attack_diff: number;
  player_strength_diff: number;
  lineup_depth_diff: number;
  availability_diff: number;
  goal_environment: number;
}

export interface ModelWeights {
  strength_diff: number;
  form_diff: number;
  home_advantage: number;
  injury_diff: number;
  attack_diff: number;
  player_strength_diff: number;
  lineup_depth_diff: number;
  availability_diff: number;
}

export const DEFAULT_WEIGHTS: ModelWeights = {
  strength_diff: 0.24,
  form_diff: 0.20,
  home_advantage: 0.12,
  injury_diff: 0.10,
  attack_diff: 0.14,
  player_strength_diff: 0.10,
  lineup_depth_diff: 0.06,
  availability_diff: 0.04,
};

// 特征归一化到 -1 到 1
export function normalizeFeature(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const normalized = (2 * (value - min)) / (max - min) - 1;
  return Math.max(-1, Math.min(1, normalized));
}

// 计算 edge（比赛倾向值）
export function calculateEdge(features: MatchFeatures, weights: ModelWeights): number {
  return (
    features.strength_diff * weights.strength_diff +
    features.form_diff * weights.form_diff +
    features.home_advantage * weights.home_advantage +
    features.injury_diff * weights.injury_diff +
    features.attack_diff * weights.attack_diff +
    features.player_strength_diff * weights.player_strength_diff +
    features.lineup_depth_diff * weights.lineup_depth_diff +
    features.availability_diff * weights.availability_diff
  );
}

// 计算平局倾向
export function calculateDrawLogit(edge: number, drawBias: number = 0): number {
  return drawBias - 0.45 * Math.abs(edge);
}

// softmax
export function softmax(values: number[]): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExps);
}

// 完整胜平负计算
export function calculateWinDrawLose(
  features: MatchFeatures,
  weights: ModelWeights = DEFAULT_WEIGHTS,
  drawBias: number = 0
): { home: number; draw: number; away: number; edge: number } {
  const edge = calculateEdge(features, weights);
  const drawLogit = calculateDrawLogit(edge, drawBias);
  const probs = softmax([edge, drawLogit, -edge]);
  return {
    home: probs[0],
    draw: probs[1],
    away: probs[2],
    edge
  };
}

// mock 比赛特征数据
export const mockMatchFeatures: Record<string, MatchFeatures> = {
  'spain_vs_austria': {
    strength_diff: 0.42,
    form_diff: 0.30,
    home_advantage: 0.15,
    injury_diff: 0.05,
    attack_diff: 0.38,
    player_strength_diff: 0.28,
    lineup_depth_diff: 0.20,
    availability_diff: 0.10,
    goal_environment: 0.12
  },
  'portugal_vs_croatia': {
    strength_diff: 0.18,
    form_diff: 0.10,
    home_advantage: 0.08,
    injury_diff: -0.05,
    attack_diff: 0.15,
    player_strength_diff: 0.12,
    lineup_depth_diff: 0.08,
    availability_diff: 0.05,
    goal_environment: 0.08
  },
  'swiss_vs_algeria': {
    strength_diff: 0.22,
    form_diff: -0.08,
    home_advantage: 0.12,
    injury_diff: 0.00,
    attack_diff: 0.10,
    player_strength_diff: 0.15,
    lineup_depth_diff: 0.05,
    availability_diff: 0.03,
    goal_environment: 0.05
  }
};
