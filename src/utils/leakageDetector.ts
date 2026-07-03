// 漏洞检测：场景模拟、下行情景检测、防守票建议

import type { SplitTicket } from './ticketSplitEngine';

export interface ScoreScenario {
  name: string;
  scores: { match: string; home: number; away: number }[];
  description: string;
}

export interface ScenarioResult {
  scenario: ScoreScenario;
  hitTickets: string[];
  deadTickets: string[];
  totalDrawdown: number;
  needsDefensive: boolean;
  defensiveSuggestion: string;
}

// 模拟比分场景
export function simulateScoreScenario(
  name: string,
  scores: { match: string; home: number; away: number }[],
  description: string
): ScoreScenario {
  return { name, scores, description };
}

// 评估票组在场景下的表现
export function evaluateTicketGroupUnderScenario(
  tickets: SplitTicket[],
  scenario: ScoreScenario
): ScenarioResult {
  const hitTickets: string[] = [];
  const deadTickets: string[] = [];
  let totalDrawdown = 0;

  tickets.forEach(ticket => {
    let allLegsHit = true;

    ticket.legs.forEach(leg => {
      const scenarioScore = scenario.scores.find(s =>
        leg.match.includes(s.match.split(' vs ')[0]) || leg.match.includes(s.match.split(' vs ')[1])
      );

      if (!scenarioScore) {
        allLegsHit = false;
        return;
      }

      const totalGoals = scenarioScore.home + scenarioScore.away;
      const scoreStr = `${scenarioScore.home}:${scenarioScore.away}`;
      const homeWin = scenarioScore.home > scenarioScore.away;
      const draw = scenarioScore.home === scenarioScore.away;
      let legHit = false;

      leg.selections.forEach(sel => {
        if (leg.market === '胜平负') {
          if (sel.includes('胜') && homeWin) legHit = true;
          else if (sel.includes('平') && draw) legHit = true;
        } else if (leg.market === '总进球') {
          const goalNum = parseInt(sel);
          if (!isNaN(goalNum) && totalGoals === goalNum) legHit = true;
          else if (sel === '4+球' && totalGoals >= 4) legHit = true;
        } else if (leg.market === '比分') {
          if (sel === scoreStr) legHit = true;
        } else if (leg.market === '半全场') {
          legHit = true;
        }
      });

      if (!legHit) allLegsHit = false;
    });

    if (allLegsHit) {
      hitTickets.push(ticket.id);
    } else {
      deadTickets.push(ticket.id);
      totalDrawdown += ticket.amount;
    }
  });

  const needsDefensive = deadTickets.length > tickets.length * 0.6;

  let defensiveSuggestion = '';
  if (needsDefensive) {
    const totalGoalsInScenario = scenario.scores.reduce((sum, s) => sum + s.home + s.away, 0);
    if (totalGoalsInScenario <= 2) {
      defensiveSuggestion = '建议补充：总进球0/3球、平局、比分1:1';
    } else if (totalGoalsInScenario >= 5) {
      defensiveSuggestion = '建议补充：总进球4+球、大比分防守';
    } else {
      defensiveSuggestion = '建议补充：比分1:1、总进球3球';
    }
  }

  return {
    scenario,
    hitTickets,
    deadTickets,
    totalDrawdown,
    needsDefensive,
    defensiveSuggestion
  };
}

// 检测下行情景
export function detectDownsideScenarios(tickets: SplitTicket[]): ScenarioResult[] {
  const scenarios: ScoreScenario[] = [
    {
      name: '强队1:0小胜',
      scores: [
        { match: '西班牙 vs 奥地利', home: 1, away: 0 },
        { match: '葡萄牙 vs 克罗地亚', home: 1, away: 0 },
        { match: '瑞士 vs 阿尔及利亚', home: 1, away: 0 }
      ],
      description: '三场都是1:0，低进球场景'
    },
    {
      name: '强队2:0完胜',
      scores: [
        { match: '西班牙 vs 奥地利', home: 2, away: 0 },
        { match: '葡萄牙 vs 克罗地亚', home: 2, away: 0 },
        { match: '瑞士 vs 阿尔及利亚', home: 2, away: 0 }
      ],
      description: '三场都是2:0，中等进球'
    },
    {
      name: '双方1:1平局',
      scores: [
        { match: '西班牙 vs 奥地利', home: 1, away: 1 },
        { match: '葡萄牙 vs 克罗地亚', home: 1, away: 1 },
        { match: '瑞士 vs 阿尔及利亚', home: 1, away: 1 }
      ],
      description: '三场平局，低进球'
    },
    {
      name: '0:0互交白卷',
      scores: [
        { match: '西班牙 vs 奥地利', home: 0, away: 0 },
        { match: '葡萄牙 vs 克罗地亚', home: 0, away: 0 },
        { match: '瑞士 vs 阿尔及利亚', home: 0, away: 0 }
      ],
      description: '三场0:0，极低进球'
    },
    {
      name: '2:1激战',
      scores: [
        { match: '西班牙 vs 奥地利', home: 2, away: 1 },
        { match: '葡萄牙 vs 克罗地亚', home: 2, away: 1 },
        { match: '瑞士 vs 阿尔及利亚', home: 2, away: 1 }
      ],
      description: '三场2:1，中高进球'
    },
    {
      name: '2:2对攻',
      scores: [
        { match: '西班牙 vs 奥地利', home: 2, away: 2 },
        { match: '葡萄牙 vs 克罗地亚', home: 2, away: 2 },
        { match: '瑞士 vs 阿尔及利亚', home: 2, away: 2 }
      ],
      description: '三场2:2，高进球'
    },
    {
      name: '3球偏离',
      scores: [
        { match: '西班牙 vs 奥地利', home: 3, away: 0 },
        { match: '葡萄牙 vs 克罗地亚', home: 3, away: 0 },
        { match: '瑞士 vs 阿尔及利亚', home: 3, away: 0 }
      ],
      description: '三场3:0，高进球偏离'
    },
    {
      name: '4+球极端',
      scores: [
        { match: '西班牙 vs 奥地利', home: 4, away: 1 },
        { match: '葡萄牙 vs 克罗地亚', home: 4, away: 1 },
        { match: '瑞士 vs 阿尔及利亚', home: 4, away: 1 }
      ],
      description: '三场4:1，极端高进球'
    }
  ];

  return scenarios.map(s => evaluateTicketGroupUnderScenario(tickets, s));
}

// 建议防守票
export function suggestDefensiveTickets(results: ScenarioResult[]): string[] {
  const suggestions: string[] = [];
  const dangerousScenarios = results.filter(r => r.needsDefensive);

  dangerousScenarios.forEach(r => {
    if (r.defensiveSuggestion) {
      suggestions.push(`${r.scenario.name}：${r.defensiveSuggestion}（预计回撤 ${r.totalDrawdown}元）`);
    }
  });

  if (suggestions.length === 0) {
    suggestions.push('当前票组覆盖较好，无需额外防守票。');
  }

  return suggestions;
}
