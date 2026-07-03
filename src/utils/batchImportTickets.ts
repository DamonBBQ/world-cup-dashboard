import type { TicketRecord } from '../data/mockMatches';
import { addTicket } from './localStorage';

/**
 * 批量导入实战票组 - 2026-07-02 西班牙/葡萄牙/瑞士场次
 * 比赛结果：
 * - 西班牙 3:0 奥地利
 * - 葡萄牙 2:1 克罗地亚（总进球3球）
 * - 瑞士 vs 阿尔及利亚（未完整，但不影响）
 */

const BATCH_DATE = '2026-07-02';

const ticketsData: Omit<TicketRecord, 'id'>[] = [
  // 票1: 西班牙2:1 × 葡萄牙1:1, 2倍, 4元 - 未命中
  {
    date: BATCH_DATE,
    amount: 4,
    matchCount: 2,
    style: '比分2串1',
    status: 'lost',
    netProfit: -4,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '2:1', odds: 5.8 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '1:1', odds: 5.4 },
    ],
  },
  // 票2: 西班牙2:1 × 葡萄牙1:1 × 瑞士1:1, 2倍, 4元 - 未命中
  {
    date: BATCH_DATE,
    amount: 4,
    matchCount: 3,
    style: '比分3串1',
    status: 'lost',
    netProfit: -4,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '2:1', odds: 5.8 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '1:1', odds: 5.4 },
      { matchId: 'm-swiss-algeria', homeTeam: '瑞士', awayTeam: '阿尔及利亚', pick: '1:1', odds: 5.35 },
    ],
  },
  // 票3: 西班牙2:1 × 葡萄牙1:0 × 瑞士2:1, 2倍, 4元 - 未命中
  {
    date: BATCH_DATE,
    amount: 4,
    matchCount: 3,
    style: '比分3串1',
    status: 'lost',
    netProfit: -4,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '2:1', odds: 5.8 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '1:0', odds: 8.0 },
      { matchId: 'm-swiss-algeria', homeTeam: '瑞士', awayTeam: '阿尔及利亚', pick: '2:1', odds: 5.4 },
    ],
  },
  // 票4: 西班牙2:1 × 葡萄牙1:0, 3倍, 12元 - 未命中
  {
    date: BATCH_DATE,
    amount: 12,
    matchCount: 2,
    style: '比分2串1',
    status: 'lost',
    netProfit: -12,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '2:1', odds: 5.8 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '1:0', odds: 8.0 },
    ],
  },
  // 票5: 西班牙胜 × 葡萄牙总进球0球/3球, 4倍, 16元 - 已命中
  {
    date: BATCH_DATE,
    amount: 16,
    matchCount: 2,
    style: '混合过关2串1复式',
    status: 'won',
    netProfit: 16, // 假设2倍回报，净赚16
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '胜', odds: 1.19 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球0球/3球', odds: 3.6 },
    ],
  },
  // 票6: 西班牙2球/3球 × 葡萄牙1球/2球, 2倍, 16元 - 未命中
  {
    date: BATCH_DATE,
    amount: 16,
    matchCount: 2,
    style: '总进球2串1',
    status: 'lost',
    netProfit: -16,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '总进球2球/3球', odds: 3.6 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球1球/2球', odds: 3.4 },
    ],
  },
  // 票7: 西班牙胜 × 葡萄牙1球/2球, 5倍, 20元 - 未命中
  {
    date: BATCH_DATE,
    amount: 20,
    matchCount: 2,
    style: '混合过关2串1',
    status: 'lost',
    netProfit: -20,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '胜', odds: 1.19 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球1球/2球', odds: 3.4 },
    ],
  },
  // 票8: 西班牙半全场胜平 × 葡萄牙1球/2球 × 瑞士1球/2球, 2倍, 16元 - 未命中
  {
    date: BATCH_DATE,
    amount: 16,
    matchCount: 3,
    style: '混合过关3串1',
    status: 'lost',
    netProfit: -16,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '半全场胜平', odds: 3.75 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球1球/2球', odds: 3.4 },
      { matchId: 'm-swiss-algeria', homeTeam: '瑞士', awayTeam: '阿尔及利亚', pick: '总进球1球/2球', odds: 4.5 },
    ],
  },
  // 票9: 西班牙胜 × 葡萄牙0球/3球, 4倍, 16元 - 未命中（葡萄牙不是0球）
  {
    date: BATCH_DATE,
    amount: 16,
    matchCount: 2,
    style: '混合过关2串1',
    status: 'lost',
    netProfit: -16,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '胜', odds: 1.19 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球0球/3球', odds: 3.3 },
    ],
  },
  // 票10: 西班牙1:0/2:0/2:1 × 葡萄牙1球/2球, 1倍, 12元 - 未命中
  {
    date: BATCH_DATE,
    amount: 12,
    matchCount: 2,
    style: '比分+总进球2串1复式',
    status: 'lost',
    netProfit: -12,
    matches: [
      { matchId: 'm-spain-austria', homeTeam: '西班牙', awayTeam: '奥地利', pick: '1:0/2:0/2:1', odds: 6.7 },
      { matchId: 'm-portugal-croatia', homeTeam: '葡萄牙', awayTeam: '克罗地亚', pick: '总进球1球/2球', odds: 3.4 },
    ],
  },
];

export function importBatchTickets(): { success: boolean; message: string } {
  try {
    let imported = 0;
    for (const ticketData of ticketsData) {
      const ticket: TicketRecord = {
        ...ticketData,
        id: `batch-${Date.now()}-${imported}`,
      };
      addTicket(ticket);
      imported++;
    }
    return {
      success: true,
      message: `成功导入 ${imported} 张票组记录`,
    };
  } catch (error) {
    return {
      success: false,
      message: `导入失败: ${error}`,
    };
  }
}

// 暴露到全局，方便控制台调用
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).importBatchTickets = importBatchTickets;
}

export default importBatchTickets;
