/**
 * @deprecated 本文件已废弃，不再用于小额多票模块。
 * 小额多票请使用 ticketSplitEngine.ts 的 generateSplitTickets()。
 * 本文件仍被 ExposurePanel / LeakagePanel / PredictionEngine 引用，
 * 但不应在新代码中使用。所有比赛应来自 selectedMatches，不应硬编码。
 */
// 出票优化器：6种票型生成与组合优化

import type { SplitTicket } from './ticketSplitEngine';

export interface OptimizerParams {
  maxTickets: number;
  minAmount: number;
  maxTicketRatio: number;
  maxConditionExposure: number;
  maxScoreRatio: number;
  defaultEmptyRatio: number;
}

export const DEFAULT_OPTIMIZER_PARAMS: OptimizerParams = {
  maxTickets: 7,
  minAmount: 2,
  maxTicketRatio: 0.25,
  maxConditionExposure: 0.45,
  maxScoreRatio: 0.08,
  defaultEmptyRatio: 0.06,
};

export interface FundAllocation {
  type: string;
  label: string;
  ratio: number;
  description: string;
}

export const FUND_ALLOCATIONS: FundAllocation[] = [
  { type: 'A', label: '基础票', ratio: 0.24, description: '主方向 + 另一场进球中心' },
  { type: 'B', label: '节奏票', ratio: 0.18, description: '不看胜负，只看两场总进球中心' },
  { type: 'C', label: '结构票', ratio: 0.16, description: '半场走势 + 总进球' },
  { type: 'D', label: '利润票', ratio: 0.18, description: '比分池 + 总进球，用来抬赔率' },
  { type: 'E', label: '防守票', ratio: 0.16, description: '补漏洞，比如0球、3球、4+偏差' },
  { type: 'F', label: '彩蛋票', ratio: 0.08, description: '极小金额博高赔率比分串' },
];

function mkLeg(match: string, matchId: string, market: string, selections: string[]) {
  return { match, matchId, market, selections };
}

const SUI_AUS = mkLeg('瑞士 vs 奥地利', 'SUI_AUS', '胜平负', ['胜']);
const POR_CRO = mkLeg('葡萄牙 vs 克罗地亚', 'POR_CRO', '总进球', ['1球', '2球']);
const SUI_ALG = mkLeg('瑞士 vs 阿尔及利亚', 'SUI_ALG', '总进球', ['3球']);
const AUS_HAL = mkLeg('奥地利 vs 意大利', 'AUS_AUT', '半全场', ['平']);
const AUS_GOALS = mkLeg('奥地利 vs 意大利', 'AUS_AUT', '总进球', ['2球', '3球']);
const AUS_SCORE = mkLeg('奥地利 vs 意大利', 'AUS_AUT', '比分', ['2:0', '2:1']);
const POR_SCORE = mkLeg('葡萄牙 vs 克罗地亚', 'POR_CRO', '比分', ['1:1']);
const SUI_SCORE = mkLeg('瑞士 vs 阿尔及利亚', 'SUI_ALG', '比分', ['2:1']);

// 生成基础票
export function generateBaseTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[0].ratio);
  return {
    id: `opt_base_${Date.now()}`,
    title: '瑞士胜 × 葡萄牙总进球1球、2球',
    ticketType: '2串1复式',
    legs: [SUI_AUS, { ...POR_CRO }],
    multiplier: Math.floor(amount / 4),
    baseStake: 2,
    combinationCount: 2,
    amount,
    riskLevel: '中',
    strategyTag: '主线覆盖',
    logic: '主方向 + 另一场进球中心',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 生成节奏票
export function generateTempoTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[1].ratio);
  return {
    id: `opt_tempo_${Date.now()}`,
    title: '奥地利总进球2球、3球 × 葡萄牙总进球1球、2球',
    ticketType: '2串1复式',
    legs: [{ ...AUS_GOALS }, { ...POR_CRO }],
    multiplier: Math.floor(amount / 8),
    baseStake: 2,
    combinationCount: 4,
    amount,
    riskLevel: '中',
    strategyTag: '低进球保护',
    logic: '不看胜负，只看两场总进球中心',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 生成结构票
export function generateStructureTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[2].ratio);
  return {
    id: `opt_struct_${Date.now()}`,
    title: '奥地利半场平 × 葡萄牙总进球1球、2球',
    ticketType: '2串1复式',
    legs: [{ ...AUS_HAL }, { ...POR_CRO }],
    multiplier: Math.floor(amount / 4),
    baseStake: 2,
    combinationCount: 2,
    amount,
    riskLevel: '中高',
    strategyTag: '混合覆盖',
    logic: '半场走势 + 总进球',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 生成利润票
export function generateProfitTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[3].ratio);
  return {
    id: `opt_profit_${Date.now()}`,
    title: '奥地利2:0、2:1意大利 × 葡萄牙1:1克罗地亚',
    ticketType: '比分2串1',
    legs: [{ ...AUS_SCORE }, { ...POR_SCORE }],
    multiplier: Math.floor(amount / 4),
    baseStake: 2,
    combinationCount: 2,
    amount,
    riskLevel: '高',
    strategyTag: '比分方向覆盖',
    logic: '比分池 + 总进球，用来抬赔率',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 生成防守票
export function generateDefensiveTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[4].ratio);
  return {
    id: `opt_defend_${Date.now()}`,
    title: '葡萄牙总进球0球、3球 × 瑞士总进球3球',
    ticketType: '2串1复式',
    legs: [
      { match: '葡萄牙 vs 克罗地亚', matchId: 'POR_CRO', market: '总进球', selections: ['0球', '3球'] },
      { ...SUI_ALG },
    ],
    multiplier: Math.floor(amount / 4),
    baseStake: 2,
    combinationCount: 2,
    amount,
    riskLevel: '中高',
    strategyTag: '防冷保护',
    logic: '补漏洞，覆盖0球、3球偏差',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 生成彩蛋票
export function generateLongshotTicket(budget: number): SplitTicket {
  const amount = Math.round(budget * FUND_ALLOCATIONS[5].ratio);
  return {
    id: `opt_longshot_${Date.now()}`,
    title: '奥地利2:1意大利 × 葡萄牙1:0克罗地亚 × 瑞士2:1阿尔及利亚',
    ticketType: '比分3串1',
    legs: [
      { match: '奥地利 vs 意大利', matchId: 'AUS_AUT', market: '比分', selections: ['2:1'] },
      { match: '葡萄牙 vs 克罗地亚', matchId: 'POR_CRO', market: '比分', selections: ['1:0'] },
      { ...SUI_SCORE },
    ],
    multiplier: Math.floor(amount / 2),
    baseStake: 2,
    combinationCount: 1,
    amount,
    riskLevel: '高',
    strategyTag: '比分小搏',
    logic: '极小金额博高赔率比分串',
    disclaimer: '模拟方案，不构成投注建议',
      coverageScore: 1,
  };
}

// 优化票组
export function optimizeTicketGroup(
  budget: number,
  params: OptimizerParams = DEFAULT_OPTIMIZER_PARAMS
): SplitTicket[] {
  const tickets: SplitTicket[] = [
    generateBaseTicket(budget),
    generateTempoTicket(budget),
    generateStructureTicket(budget),
    generateProfitTicket(budget),
    generateDefensiveTicket(budget),
    generateLongshotTicket(budget),
  ];
  return tickets.slice(0, params.maxTickets);
}
