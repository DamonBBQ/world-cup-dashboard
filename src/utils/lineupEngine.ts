// 阵容引擎：阵容深度评分、首发修正

// 计算阵容深度评分
export function calculateLineupDepthScore(starters: number[], bench: number[]): number {
  const starterAvg = starters.reduce((a, b) => a + b, 0) / starters.length;
  const benchAvg = bench.reduce((a, b) => a + b, 0) / bench.length;
  return starterAvg * 0.85 + benchAvg * 0.15;
}

// 确认首发修正
export function applyConfirmedLineupAdjustment(
  teamRating: number,
  starterAvg: number,
  originalAvg: number
): { adjustedRating: number; adjustment: number } {
  const adjustment = (starterAvg - originalAvg) * 0.55;
  return {
    adjustedRating: teamRating + adjustment,
    adjustment
  };
}

// 活跃名单修正
export function applyActiveSquadAdjustment(
  teamRating: number,
  squadDepth: number,
  originalAvg: number
): { adjustedRating: number; adjustment: number } {
  const adjustment = (squadDepth - originalAvg) * 0.35;
  return {
    adjustedRating: teamRating + adjustment,
    adjustment
  };
}

// mock 阵容数据
export const mockLineupData = {
  spain: {
    systemRating: 86.2,
    starterAvg: 88.1,
    originalAvg: 86.0,
    starters: [89, 87, 88, 90, 86, 88, 89, 87, 88, 89, 87],
    bench: [84, 83, 85, 82, 84, 83, 85],
    confirmed: true
  },
  austria: {
    systemRating: 78.4,
    squadDepth: 77.6,
    originalAvg: 78.8,
    starters: [80, 77, 79, 78, 76, 80, 77, 78, 79, 77, 78],
    bench: [75, 74, 76, 73, 75],
    confirmed: false
  },
  portugal: {
    systemRating: 84.5,
    starterAvg: 85.8,
    originalAvg: 84.2,
    starters: [87, 85, 86, 88, 84, 85, 86, 84, 86, 87, 85],
    bench: [82, 81, 83, 80, 82],
    confirmed: true
  },
  croatia: {
    systemRating: 79.8,
    squadDepth: 80.2,
    originalAvg: 79.5,
    starters: [81, 79, 80, 82, 78, 80, 79, 81, 80, 79, 80],
    bench: [77, 76, 78, 75, 77],
    confirmed: false
  }
};
