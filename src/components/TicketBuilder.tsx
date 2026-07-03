import { useState, useEffect, useCallback } from 'react';
import { mockMatches, riskLabels } from '../data/mockMatches';
import { generateTickets, createTicketRecord } from '../utils/ticketGenerator';
import { addTicket, getTickets, type TicketRecord } from '../utils/localStorage';
import { fetchLocalMatches, convertMatchToFrontend, type StandardMatch } from '../services/localData';
import SplitTicketBuilder from './SplitTicketBuilder';
import type { TicketOption } from '../utils/ticketGenerator';

interface DisplayMatch {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  status: 'upcoming' | 'live' | 'finished';
  stage: 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final';
  homeScore?: number;
  awayScore?: number;
  winProb: number;
  drawProb: number;
  loseProb: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedPick: string;
  possibleScores: string[];
  overUnder: 'over' | 'under' | 'neutral';
  keyFactors: string[];
  analysis: string;
  competitionCode?: string;
}

export default function TicketBuilder() {
  const [activeTab, setActiveTab] = useState<'smart' | 'split' | 'history'>('smart');
  const [amount, setAmount] = useState(100);
  const [style, setStyle] = useState('balanced');
  const [riskPreference, setRiskPreference] = useState('moderate');
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
  const [generated, setGenerated] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // 实时比赛数据
  const [liveMatches, setLiveMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const localMatches: StandardMatch[] = await fetchLocalMatches('WC');
      if (localMatches.length === 0) {
        setLiveMatches(mockMatches as DisplayMatch[]);
        setDataSource('mock');
      } else {
        const converted = localMatches.map(convertMatchToFrontend) as DisplayMatch[];
        setLiveMatches(converted);
        setDataSource('live');
      }
      setLastUpdate(new Date());
    } catch {
      setLiveMatches(mockMatches as DisplayMatch[]);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // 可选比赛：未开始 + 进行中（按时间排序），过滤对阵未确定的
  const availableMatches = liveMatches
    .filter(m => (m.status === 'upcoming' || m.status === 'live') && m.homeTeam && m.homeTeam !== 'None' && m.awayTeam && m.awayTeam !== 'None')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const handleToggleMatch = (id: string) => {
    setSelectedMatchIds(prev =>
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (selectedMatchIds.length < 2) {
      alert('请至少选择 2 场比赛');
      return;
    }
    if (amount <= 0 || amount > 100000) {
      alert('金额必须大于 0 且不超过 100000');
      return;
    }

    const selectedMatches = liveMatches.filter(m => selectedMatchIds.includes(m.id));
    // 将 DisplayMatch 转为 ticketGenerator 需要的格式
    const genInput = selectedMatches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      status: m.status,
      stage: m.stage,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      winProb: m.winProb,
      drawProb: m.drawProb,
      loseProb: m.loseProb,
      confidence: m.confidence,
      riskLevel: m.riskLevel,
      recommendedPick: m.recommendedPick,
      possibleScores: m.possibleScores,
      overUnder: m.overUnder,
      keyFactors: m.keyFactors,
      analysis: m.analysis,
      date: m.date,
      time: m.time,
    }));
    const options = generateTickets(genInput, amount, style, riskPreference);
    setTicketOptions(options);
    setGenerated(true);
  };

  const handleSaveTicket = (option: TicketOption) => {
    const ticket = createTicketRecord(option, new Date().toISOString().split('T')[0]);
    addTicket(ticket);
    setSavedIds(prev => new Set([...prev, option.id]));
    alert(`票组 ${option.label} 已保存到台账！`);
  };

  return (
    <section id="ticket" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary">推荐出票版块</h2>
          {dataSource === 'live' && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              实时数据
            </span>
          )}
          {dataSource === 'mock' && (
            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              模拟数据
            </span>
          )}
          <button
            onClick={loadMatches}
            disabled={loading}
            className="ml-auto px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-bg/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
        <p className="text-text-secondary">
          根据分析结果生成模拟票组方案
          {lastUpdate && (
            <span className="ml-2 text-xs text-text-secondary/60">
              · 最后更新: {lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-border">
        {[
          { id: 'smart', label: '智能生成票组' },
          { id: 'split', label: '小额多票拆单' },
          { id: 'history', label: '历史票组记录' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'smart' | 'split' | 'history')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Smart Generation Tab */}
      {activeTab === 'smart' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <h3 className="font-bold text-primary mb-6">参数设置</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  投入金额
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  min={1}
                  max={100000}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="输入金额"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  出票风格
                </label>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="conservative">稳健优先</option>
                  <option value="balanced">分散覆盖 + 防冷保护</option>
                  <option value="moderate">均衡组合</option>
                  <option value="aggressive">小额搏冷</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  风险偏好：{
                    riskPreference === 'conservative' ? '保守' :
                    riskPreference === 'moderate' ? '均衡' : '激进'
                  }
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={riskPreference === 'conservative' ? 0 : riskPreference === 'moderate' ? 1 : 2}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setRiskPreference(val === 0 ? 'conservative' : val === 1 ? 'moderate' : 'aggressive');
                  }}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>保守</span>
                  <span>均衡</span>
                  <span>激进</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  选择比赛（已选 {selectedMatchIds.length} 场）
                </label>
                {loading && (
                  <div className="text-center py-8 text-text-secondary">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <div className="text-sm">加载比赛...</div>
                  </div>
                )}
                {!loading && availableMatches.length === 0 && (
                  <div className="text-center py-8 text-text-secondary">
                    <div className="text-3xl mb-2">⚽</div>
                    <div className="text-sm">暂无可选比赛</div>
                    <div className="text-xs mt-1 text-text-secondary/60">请先运行同步脚本获取最新数据</div>
                  </div>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableMatches.map(match => (
                    <label
                      key={match.id}
                      className="flex items-center gap-3 p-3 bg-bg/50 rounded-lg cursor-pointer hover:bg-bg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMatchIds.includes(match.id)}
                        onChange={() => handleToggleMatch(match.id)}
                        className="w-4 h-4 accent-primary"
                      />
                      {match.homeFlag?.startsWith('http') ? (
                        <img src={match.homeFlag} alt="" className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-lg">{match.homeFlag}</span>
                      )}
                      <span className="flex-1 font-medium text-sm">
                        {match.homeTeam} vs {match.awayTeam}
                      </span>
                      <span className="text-xs text-text-secondary">{match.date} {match.time}</span>
                      <span className="text-xs text-text-secondary">{match.recommendedPick}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        match.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                        match.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {riskLabels[match.riskLevel]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors"
              >
                生成模拟票组
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <h3 className="font-bold text-primary mb-6">建议票组</h3>

            {!generated && (
              <div className="text-center py-12 text-text-secondary">
                <div className="text-4xl mb-4">🎯</div>
                <p>请设置参数并选择比赛，然后点击"生成模拟票组"</p>
              </div>
            )}

            {generated && ticketOptions.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <p>未找到符合条件的比赛组合，请调整选择</p>
              </div>
            )}

            <div className="space-y-4">
              {ticketOptions.map(option => (
                <div key={option.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-primary">
                        {option.id}组：{option.label}
                      </h4>
                      <p className="text-xs text-text-secondary">{option.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      option.riskLevel === '低风险' ? 'bg-green-100 text-green-700' :
                      option.riskLevel === '中风险' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {option.riskLevel}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {option.matches.map((match, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-bg/50 rounded-lg p-2">
                        <span>{match.homeTeam} vs {match.awayTeam}</span>
                        <span className="font-medium text-primary">{match.pick}</span>
                        <span className="text-text-secondary">¥{option.allocations[i]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-text-secondary mb-2">
                    {option.notes}
                  </div>
                  <div className="text-xs text-yellow-600 mb-3">
                    {option.disclaimer}
                  </div>

                  <button
                    onClick={() => handleSaveTicket(option)}
                    disabled={savedIds.has(option.id)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                      savedIds.has(option.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-accent text-primary hover:bg-accent-hover'
                    }`}
                  >
                    {savedIds.has(option.id) ? '已保存' : '保存到台账'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Split Ticket Tab */}
      {activeTab === 'split' && (
        <SplitTicketBuilder />
      )}

      {/* History Tab */}
      {activeTab === 'history' && <TicketHistoryTab />}
    </section>
  );
}

// ─── 历史票组记录子组件 ───────────────────────────────────
const statusLabels: Record<string, string> = {
  pending: '未结算',
  won: '已命中',
  lost: '未命中',
  partial: '部分命中',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

function TicketHistoryTab() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(() => {
    const data = getTickets();
    setTickets(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <div className="text-sm text-text-secondary">加载中...</div>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-text-secondary mb-1">暂无历史票组记录</p>
        <p className="text-xs text-text-secondary/60">在"智能生成"或"小额多票拆单"中保存票组后，记录将显示在这里</p>
      </div>
    );
  }

  // 按日期倒序
  const sorted = [...tickets].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 统计
  const totalInvested = tickets.reduce((s, t) => s + (t.amount || 0), 0);
  const totalReturn = tickets.reduce((s, t) => s + (t.netProfit || 0), 0);
  const wonCount = tickets.filter(t => t.status === 'won' || t.status === 'partial').length;
  const winRate = tickets.length > 0 ? Math.round((wonCount / tickets.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{tickets.length}</div>
          <div className="text-xs text-text-secondary mt-1">票组总数</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">¥{totalInvested}</div>
          <div className="text-xs text-text-secondary mt-1">总投入</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalReturn >= 0 ? '+' : ''}¥{totalReturn}
          </div>
          <div className="text-xs text-text-secondary mt-1">净盈亏</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-accent-bg">{winRate}%</div>
          <div className="text-xs text-text-secondary mt-1">命中率</div>
        </div>
      </div>

      {/* 票组列表 */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {sorted.map(ticket => (
            <div key={ticket.id} className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">{ticket.id}</span>
                  <span className="text-xs text-text-secondary">{ticket.date}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[ticket.status] || statusStyles.pending}`}>
                    {statusLabels[ticket.status] || ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-text-secondary">投入 ¥{ticket.amount}</span>
                  <span className={`font-medium ${(ticket.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(ticket.netProfit || 0) >= 0 ? '+' : ''}¥{ticket.netProfit || 0}
                  </span>
                </div>
              </div>

              {ticket.matches && ticket.matches.length > 0 && (
                <div className="space-y-1">
                  {ticket.matches.map((match, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-bg/40 rounded-lg px-3 py-1.5">
                      <span className="text-text-secondary">{match.homeTeam} vs {match.awayTeam}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">{match.pick}</span>
                        {match.odds && <span className="text-xs text-text-secondary">@{match.odds}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                <span>{ticket.matchCount} 场比赛</span>
                <span>·</span>
                <span>{ticket.style}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
