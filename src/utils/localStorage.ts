import type { TicketRecord } from '../data/mockMatches';
export type { TicketRecord };

const TICKETS_KEY = 'worldcup_tickets';
const BANKROLL_KEY = 'worldcup_bankroll';

export interface BankrollData {
  initial: number;
  invested: number;
  returned: number;
  currentBalance: number;
}

// ── 扩展 TicketRecord 字段（向后兼容） ──
// TicketRecord 已在 mockMatches.ts 定义，此处补充可选字段
// 如果 mockMatches.ts 的 TicketRecord 没有这些字段，通过 declaration merging 补充
declare module '../data/mockMatches' {
  interface TicketRecord {
    returnAmount?: number;
    settleNote?: string;
    settledAt?: string;
  }
}

export function getTickets(): TicketRecord[] {
  try {
    const data = localStorage.getItem(TICKETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTickets(tickets: TicketRecord[]): void {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export function addTicket(ticket: TicketRecord): void {
  const tickets = getTickets();
  tickets.unshift(ticket);
  saveTickets(tickets);
}

export function updateTicketStatus(
  id: string,
  status: TicketRecord['status'],
  netProfit: number,
  returnAmount?: number,
  settleNote?: string
): void {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === id);
  if (idx !== -1) {
    tickets[idx].status = status;
    tickets[idx].netProfit = netProfit;
    if (returnAmount !== undefined) tickets[idx].returnAmount = returnAmount;
    if (settleNote !== undefined) tickets[idx].settleNote = settleNote;
    tickets[idx].settledAt = new Date().toISOString();
    saveTickets(tickets);
  }
}

export function deleteTicket(id: string): void {
  const tickets = getTickets().filter(t => t.id !== id);
  saveTickets(tickets);
}

export function getBankroll(): BankrollData {
  try {
    const data = localStorage.getItem(BANKROLL_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return {
    initial: 1000,
    invested: 0,
    returned: 0,
    currentBalance: 1000,
  };
}

export function saveBankroll(data: BankrollData): void {
  localStorage.setItem(BANKROLL_KEY, JSON.stringify(data));
}

/**
 * 从票组记录计算资金台账
 * 不再默认命中就是 2 倍回款。
 * 使用 returnAmount 字段（如果存在），否则为 0。
 */
export function calculateBankrollFromTickets(tickets: TicketRecord[]): BankrollData {
  const initial = 1000;
  const invested = tickets.reduce((sum, t) => sum + t.amount, 0);
  // 只统计已结算的票的回款
  const returned = tickets
    .filter(t => t.status === 'won' || t.status === 'partial')
    .reduce((sum, t) => sum + (t.returnAmount || 0), 0);
  const currentBalance = initial - invested + returned;

  return { initial, invested, returned, currentBalance };
}
