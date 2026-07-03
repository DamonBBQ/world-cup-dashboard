import type { Match, TicketRecord, TicketMatch } from '../data/mockMatches';

export interface TicketOption {
  id: string;
  label: string;
  description: string;
  riskLevel: string;
  matches: TicketMatch[];
  allocations: number[];
  totalAmount: number;
  notes: string;
  disclaimer: string;
}

export function generateTickets(
  selectedMatches: Match[],
  totalAmount: number,
  _style: string,
  _riskPreference: string
): TicketOption[] {
  if (selectedMatches.length < 2) return [];

  const sorted = [...selectedMatches].sort((a, b) => b.confidence - a.confidence);

  const optionA: TicketOption = {
    id: 'A',
    label: '稳健方案',
    description: '优先选择高信心、低风险比赛，追求稳定回报',
    riskLevel: '低风险',
    matches: [],
    allocations: [],
    totalAmount,
    notes: '本方案仅选择信心指数≥75且风险等级为低风险的比赛，适合稳健型用户。',
    disclaimer: '模拟方案，不保证结果。'
  };

  const optionB: TicketOption = {
    id: 'B',
    label: '均衡方案',
    description: '在高信心比赛基础上，加入1场中风险比赛以提高回报',
    riskLevel: '中风险',
    matches: [],
    allocations: [],
    totalAmount,
    notes: '本方案以高信心比赛为主，允许加入1场中风险比赛，平衡风险与回报。',
    disclaimer: '模拟方案，不保证结果。'
  };

  const optionC: TicketOption = {
    id: 'C',
    label: '防冷方案',
    description: '针对冷门风险较高的比赛做双选或防御性布局',
    riskLevel: '高风险',
    matches: [],
    allocations: [],
    totalAmount,
    notes: '本方案对冷门风险较高的比赛做双选处理，适合搏冷门场景，风险较高。',
    disclaimer: '模拟方案，不保证结果。'
  };

  // Option A: Conservative - only high confidence, low risk
  const conservativeMatches = sorted.filter(m => m.confidence >= 75 && m.riskLevel === 'low');
  if (conservativeMatches.length >= 2) {
    optionA.matches = conservativeMatches.slice(0, 3).map(m => ({
      matchId: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      pick: m.recommendedPick,
      odds: 1.8 + Math.random() * 0.5
    }));
  } else {
    optionA.matches = sorted.slice(0, 2).map(m => ({
      matchId: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      pick: m.recommendedPick,
      odds: 1.8 + Math.random() * 0.5
    }));
  }

  // Option B: Balanced - high confidence + 1 medium risk
  const highConfMatches = sorted.filter(m => m.confidence >= 65);
  const mediumRiskMatch = sorted.find(m => m.riskLevel === 'medium');
  optionB.matches = highConfMatches.slice(0, 2).map(m => ({
    matchId: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    pick: m.recommendedPick,
    odds: 1.9 + Math.random() * 0.6
  }));
  if (mediumRiskMatch && optionB.matches.length < 3) {
    optionB.matches.push({
      matchId: mediumRiskMatch.id,
      homeTeam: mediumRiskMatch.homeTeam,
      awayTeam: mediumRiskMatch.awayTeam,
      pick: mediumRiskMatch.recommendedPick,
      odds: 2.2 + Math.random() * 0.8
    });
  }

  // Option C: Cold protection - include high risk matches with double picks
  optionC.matches = sorted.slice(0, 2).map(m => ({
    matchId: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    pick: m.riskLevel === 'high' ? `${m.recommendedPick} / 防冷门` : m.recommendedPick,
    odds: 2.5 + Math.random() * 1.0
  }));
  const highRiskMatch = sorted.find(m => m.riskLevel === 'high');
  if (highRiskMatch && !optionC.matches.find(m => m.matchId === highRiskMatch.id)) {
    optionC.matches.push({
      matchId: highRiskMatch.id,
      homeTeam: highRiskMatch.homeTeam,
      awayTeam: highRiskMatch.awayTeam,
      pick: `双选防御`,
      odds: 3.0 + Math.random() * 1.0
    });
  }

  // Calculate allocations
  optionA.allocations = optionA.matches.map(() => Math.round(totalAmount / optionA.matches.length));
  optionB.allocations = optionB.matches.map(() => Math.round(totalAmount / optionB.matches.length));
  optionC.allocations = optionC.matches.map(() => Math.round(totalAmount / optionC.matches.length));

  // Adjust last allocation to match total
  const adjustAllocations = (option: TicketOption) => {
    const sum = option.allocations.reduce((a, b) => a + b, 0);
    option.allocations[option.allocations.length - 1] += totalAmount - sum;
  };
  adjustAllocations(optionA);
  adjustAllocations(optionB);
  adjustAllocations(optionC);

  return [optionA, optionB, optionC].filter(opt => opt.matches.length >= 2);
}

export function createTicketRecord(
  option: TicketOption,
  date: string
): TicketRecord {
  return {
    id: `ticket_${Date.now()}_${option.id}`,
    date,
    amount: option.totalAmount,
    matchCount: option.matches.length,
    style: option.label,
    status: 'pending',
    netProfit: 0,
    matches: option.matches.map(m => ({
      ...m,
      odds: Math.round(m.odds * 100) / 100
    }))
  };
}
