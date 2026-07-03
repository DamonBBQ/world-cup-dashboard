// 暴露引擎：条件暴露统计与风险告警

import type { SplitTicket } from './ticketSplitEngine';

export interface ConditionExposure {
  condition: string;
  amount: number;
  ratio: number;
  riskLevel: '低' | '中' | '高';
  suggestion: string;
}

// 统计每个条件绑定了多少钱
export function calculateConditionExposure(tickets: SplitTicket[], budget: number): ConditionExposure[] {
  const exposureMap = new Map<string, number>();
  
  tickets.forEach(ticket => {
    ticket.legs.forEach(leg => {
      leg.selections.forEach(sel => {
        const key = `${leg.match} - ${leg.market} - ${sel}`;
        const current = exposureMap.get(key) || 0;
        exposureMap.set(key, current + ticket.amount);
      });
    });
  });
  
  const exposures: ConditionExposure[] = [];
  exposureMap.forEach((amount, condition) => {
    const ratio = budget > 0 ? amount / budget : 0;
    let riskLevel: '低' | '中' | '高' = '低';
    let suggestion = '正常';
    
    if (ratio > 0.60) {
      riskLevel = '高';
      suggestion = '建议削减暴露';
    } else if (ratio > 0.40) {
      riskLevel = '中';
      suggestion = '风险偏高，注意控制';
    }
    
    exposures.push({ condition, amount, ratio, riskLevel, suggestion });
  });
  
  return exposures.sort((a, b) => b.amount - a.amount);
}

// 检测过度暴露
export function detectOverExposure(exposures: ConditionExposure[]): ConditionExposure[] {
  return exposures.filter(e => e.ratio > 0.40);
}

// 生成暴露告警
export function generateExposureWarnings(exposures: ConditionExposure[], budget: number): string[] {
  const warnings: string[] = [];
  const overExposed = detectOverExposure(exposures);
  
  if (overExposed.length === 0) {
    warnings.push('当前票组暴露分布合理，无过度集中风险。');
  } else {
    overExposed.forEach(e => {
      warnings.push(`${e.condition}：暴露 ${e.amount}元（${(e.ratio * 100).toFixed(0)}%），${e.suggestion}。`);
    });
  }
  
  const totalAllocated = exposures.reduce((sum, e) => Math.max(sum, e.amount), 0);
  if (totalAllocated < budget * 0.85) {
    warnings.push(`当前分配未用满预算，保留空仓 ${(budget - totalAllocated).toFixed(0)}元，合理控制风险。`);
  }
  
  return warnings;
}
