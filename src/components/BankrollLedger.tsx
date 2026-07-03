import { useState, useEffect } from 'react';
import { getTickets, updateTicketStatus, deleteTicket, getBankroll, calculateBankrollFromTickets } from '../utils/localStorage';
import { importBatchTickets } from '../utils/batchImportTickets';
import type { TicketRecord } from '../data/mockMatches';

export default function BankrollLedger() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [bankroll, setBankroll] = useState(getBankroll());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const t = getTickets();
    setTickets(t);
    setBankroll(calculateBankrollFromTickets(t));
  };

  const handleStatusChange = (id: string, status: TicketRecord['status']) => {
    const netProfit = status === 'won'
      ? tickets.find(t => t.id === id)!.amount
      : status === 'lost'
      ? -tickets.find(t => t.id === id)!.amount
      : 0;
    updateTicketStatus(id, status, netProfit);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除此票组记录？')) {
      deleteTicket(id);
      loadData();
    }
  };

  const handleBatchImport = () => {
    if (confirm('确定导入 2026-07-02 实战票组（10张）？\n\n票5为已命中，其余为未命中。')) {
      const result = importBatchTickets();
      if (result.success) {
        alert(result.message);
        loadData();
      } else {
        alert(result.message);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      won: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700',
      partial: 'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      pending: '未结算',
      won: '已命中',
      lost: '未命中',
      partial: '部分命中',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <section id="bankroll" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">资金台账与票组结构</h2>
        <p className="text-text-secondary">追踪资金投入与票组记录</p>
      </div>

      {/* localStorage 跨设备提示 */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-lg">⚠️</span>
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">数据存储说明</p>
            <p>当前使用浏览器 localStorage 保存票组、资金台账、复盘记录。</p>
            <p>部署到 Vercel 后，<strong>手机和电脑不会自动同步同一份数据</strong>（每台设备独立存储）。</p>
            <p className="text-amber-700">如需跨设备同步，后续需接入数据库或账号系统。</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={handleBatchImport}
          className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          导入实战票组 (10张)
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">资金概览</h3>
          <div className="space-y-3">
            {[
              { label: '初始资金', value: bankroll.initial, color: 'text-primary' },
              { label: '已投入金额', value: bankroll.invested, color: 'text-yellow-600' },
              { label: '已回款金额', value: bankroll.returned, color: 'text-green-600' },
              { label: '当前净盈亏', value: bankroll.currentBalance - bankroll.initial, color: bankroll.currentBalance - bankroll.initial >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: '可用余额', value: bankroll.currentBalance, color: 'text-primary' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">{item.label}</span>
                <span className={`font-bold ${item.color}`}>
                  ¥{item.value.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">投入占比</span>
                <span className="font-bold text-primary">
                  {bankroll.initial > 0 ? ((bankroll.invested / bankroll.initial) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="font-bold text-primary">票组记录表</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">编号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">日期</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">金额</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">场数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">风格</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">状态</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">净盈亏</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                      暂无票组记录，请先在"推荐出票版块"生成并保存票组
                    </td>
                  </tr>
                )}
                {tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-bg/30">
                    <td className="px-4 py-3 font-mono text-xs">{ticket.id.slice(0, 12)}</td>
                    <td className="px-4 py-3">{ticket.date}</td>
                    <td className="px-4 py-3 text-right font-medium">¥{ticket.amount}</td>
                    <td className="px-4 py-3 text-center">{ticket.matchCount}</td>
                    <td className="px-4 py-3">{ticket.style}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(ticket.status)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      ticket.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {ticket.netProfit >= 0 ? '+' : ''}{ticket.netProfit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <select
                          value={ticket.status}
                          onChange={e => handleStatusChange(ticket.id, e.target.value as TicketRecord['status'])}
                          className="text-xs px-2 py-1 border border-border rounded"
                        >
                          <option value="pending">未结算</option>
                          <option value="won">已命中</option>
                          <option value="lost">未命中</option>
                          <option value="partial">部分命中</option>
                        </select>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
