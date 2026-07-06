import { useCallback, useEffect, useState, useMemo } from 'react';
import { getTeamRating, buildSyntheticOddsForMatches, getFullOddsMap } from '../services/localData';
import { useLiveScores, type StandardMatch } from '../hooks/useLiveScores';
import {
  generateExampleTickets,
  generateSplitTickets,
  rebuildSanitizedResultFromTickets,
  analyzeTicketStructure,
  formatTicketTextForBetSlip,
  saveTicketGroupToLedger,
  makeMatchId,
  getStatusLabel,
  buildGoalCenterProtection,
  getLocalValidationStatus,
  getLocalGoalReviews,
  saveLocalGoalReview,
  summarizeCorrections,
  type AutoCorrection,
  type SplitTicket,
  type SelectableMatch,
  type SanitizedResult,
  type ReviewSuggestion,
  type GoalCenterProtection,
  type LocalGoalReview,
} from '../utils/ticketSplitEngine';
import { addTicket } from '../utils/localStorage';

interface SplitTicketBuilderProps {
  /** 从父组件传入的实时比赛数据 */
  liveMatches?: StandardMatch[];
  /** 父组件的加载状态 */
  liveLoading?: boolean;
  /** 父组件的错误信息 */
  liveError?: string | null;
  /** 父组件的刷新函数 */
  onRefreshMatches?: () => void;
  /** 保存到台账后的回调 */
  onSaveToLedger?: () => void;
}

// ── 状态标准化 ──
function normalizeMatchStatus(status?: string): string {
  const s = String(status || '').toUpperCase();
  if (['TIMED', 'SCHEDULED', 'SCHEDULED_TIME'].includes(s)) return 'TIMED';
  if (['LIVE', 'IN_PLAY', 'INPLAY', '1H', '2H', 'HT', 'PAUSED'].includes(s)) return 'IN_PLAY';
  if (['FINISHED', 'FINISH', 'COMPLETE', 'COMPLETED', 'FT', 'FULL_TIME'].includes(s)) return 'FINISHED';
  if (['POSTPONED'].includes(s)) return 'POSTPONED';
  if (['SUSPENDED'].includes(s)) return 'SUSPENDED';
  if (['CANCELLED', 'CANCELED'].includes(s)) return 'CANCELLED';
  if (['AWARDED'].includes(s)) return 'AWARDED';
  return s || 'UNKNOWN';
}

function isPreMatchStatus(status?: string): boolean {
  return ['TIMED', 'SCHEDULED'].includes(normalizeMatchStatus(status));
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  TIMED: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PLAY: 'bg-green-100 text-green-700',
  LIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  FINISHED: 'bg-gray-100 text-gray-500',
  COMPLETE: 'bg-gray-100 text-gray-500',
  COMPLETED: 'bg-gray-100 text-gray-500',
  AWARDED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-700',
  POSTPONED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  UNKNOWN: 'bg-gray-100 text-gray-500',
};

const RISK_BADGE_CLASS: Record<string, string> = {
  低: 'bg-green-100 text-green-700',
  中: 'bg-yellow-100 text-yellow-700',
  中高: 'bg-orange-100 text-orange-700',
  高: 'bg-red-100 text-red-700',
};

export default function SplitTicketBuilder({
  liveMatches: externalMatches,
  liveLoading: externalLoading,
  liveError: externalError,
  onRefreshMatches: externalRefresh,
  onSaveToLedger,
}: SplitTicketBuilderProps) {
  const [tickets, setTickets] = useState<SplitTicket[]>([]);
  const [totalBudget, setTotalBudget] = useState(100);
  const [maxSingleTicket, setMaxSingleTicket] = useState(20);
  const [ticketCount, setTicketCount] = useState(10);
  const [includeScoreTickets, setIncludeScoreTickets] = useState(true);
  const [scoreTicketRatio, setScoreTicketRatio] = useState(12);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeTicketStructure> | null>(null);
  const [savedGroupId, setSavedGroupId] = useState<string | null>(null);
  const [riskPreference, setRiskPreference] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [availableMatches, setAvailableMatches] = useState<SelectableMatch[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  /** 派生状态：始终从 selectedMatchIds + availableMatches 计算 */
  const selectedMatches: SelectableMatch[] = availableMatches.filter(m => selectedMatchIds.has(m.id));
  const [result, setResult] = useState<SanitizedResult | null>(null);

  // ── 比赛加载状态 ──
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [rawMatchCount, setRawMatchCount] = useState(0);
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  /** 合成赔率表（比赛加载后构建） */
  const [oddsMap, setOddsMap] = useState<Record<string, string | undefined>>({});

  /**
   * 将实时 API 数据转换为 SelectableMatch 格式
   */
  const convertToSelectableMatches = useCallback((matches: StandardMatch[]): SelectableMatch[] => {
    // 过滤无效对阵
    const valid = matches.filter(m => {
      if (!m.homeTeam?.name || !m.awayTeam?.name) return false;
      if (m.homeTeam.name === 'None' || m.awayTeam.name === 'None') return false;
      if (m.homeTeam.name === 'TBD' || m.awayTeam.name === 'TBD') return false;
      return true;
    });

    // 转换为 SelectableMatch
    return valid.map(m => {
      const homeName = m.homeTeam.name;
      const awayName = m.awayTeam.name;
      
      // 标准化状态
      let rawStatus = 'TIMED';
      if (m.status === 'LIVE') rawStatus = 'IN_PLAY';
      else if (m.status === 'FINISHED') rawStatus = 'FINISHED';

      // 构建 ISO 日期时间
      const utcDate = `${m.date}T${m.time}:00.000Z`;

      return {
        id: m.id,
        home: homeName,
        away: awayName,
        homeRating: getTeamRating(homeName),
        awayRating: getTeamRating(awayName),
        rawStatus,
        competition: m.competition || 'WC',
        utcDate,
      };
    });
  }, []);

  /**
   * 处理传入的实时数据
   */
  useEffect(() => {
    if (externalMatches && externalMatches.length > 0) {
      // 使用传入的实时数据
      const converted = convertToSelectableMatches(externalMatches);
      
      // 构建合成赔率
      const synthetic = buildSyntheticOddsForMatches(externalMatches as any);
      setOddsMap(synthetic);
      
      // 只保留赛前比赛（NOT_STARTED）
      const preMatch = converted.filter(m => isPreMatchStatus(m.rawStatus));
      
      // 按时间排序
      preMatch.sort((a, b) => new Date(a.utcDate || 0).getTime() - new Date(b.utcDate || 0).getTime());
      
      setAvailableMatches(preMatch);
      setMatchesLoading(false);
      setMatchesError(null);
      setRawMatchCount(converted.length);
      setFilteredOutCount(converted.length - preMatch.length);
      
      // 默认选中前 4 场
      const defaultIds = preMatch.slice(0, 4).map(m => m.id);
      setSelectedMatchIds(new Set(defaultIds));
      
      console.log('[SplitTicketBuilder] 使用实时数据:', {
        total: converted.length,
        preMatch: preMatch.length,
        dataSource: 'live'
      });
    } else if (!externalLoading && externalError) {
      // 外部数据加载失败
      setMatchesError(externalError);
      setAvailableMatches([]);
      setSelectedMatchIds(new Set());
      setMatchesLoading(false);
    } else if (!externalLoading && (!externalMatches || externalMatches.length === 0)) {
      // 外部数据为空（没有真实数据）
      setMatchesError('暂无实时数据，请检查 API Key 配置');
      setAvailableMatches([]);
      setSelectedMatchIds(new Set());
      setMatchesLoading(false);
    }
  }, [externalMatches, externalLoading, externalError, convertToSelectableMatches]);

  const handleRefresh = () => {
    if (externalRefresh) {
      externalRefresh();
    }
  };

  const handleLoadExample = () => {
    const exampleTickets = generateExampleTickets();
    setTickets(exampleTickets);
    setResult(null);
    setAnalysis(analyzeTicketStructure(exampleTickets));
    setSavedGroupId(null);
  };

  const handleGenerate = () => {
    if (selectedMatches.length < 2) {
      alert('请至少选择2场比赛');
      return;
    }

    // 检查是否有非赛前比赛被选中
    const nonPreMatch = selectedMatches.filter(m => !isPreMatchStatus(m.rawStatus));
    if (nonPreMatch.length > 0) {
      const names = nonPreMatch.map(m => `${m.home} vs ${m.away}（${getStatusLabel(m.rawStatus)}）`).join('、');
      alert(`以下比赛不是赛前状态，不可用于生成赛前模拟票组：\n${names}`);
      return;
    }

    const res = generateSplitTickets({
      totalBudget,
      maxSingleTicket,
      ticketCount,
      selectedMatches,
      includeScoreTickets,
      scoreTicketRatio,
      riskPreference,
    });

    setResult(res);
    setTickets(res.tickets);
    setAnalysis(analyzeTicketStructure(res.tickets));
    setSavedGroupId(null);
  };

  const handleClear = () => {
    setTickets([]);
    setAnalysis(null);
    setSavedGroupId(null);
    setResult(null);
  };

  const handleCopyText = async () => {
    const totalAllocated = tickets.reduce((s, t) => s + t.amount, 0);
    const remaining = totalBudget - totalAllocated;
    const text = formatTicketTextForBetSlip(tickets, {
      totalBudget,
      allocatedAmount: totalAllocated,
      emptyBudget: remaining,
    }, oddsMap);
    try {
      await navigator.clipboard.writeText(text);
      alert('出票文案已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const handleSaveToLedger = () => {
    if (tickets.length === 0) { alert('请先生成票组'); return; }
    const groupTicket = saveTicketGroupToLedger(tickets);
    addTicket(groupTicket);
    setSavedGroupId(groupTicket.id);
    alert('整组票已保存到资金台账！');
    if (onSaveToLedger) onSaveToLedger();
  };

  const handleDeleteTicket = (id: string) => {
    const updated = tickets.filter(t => t.id !== id);
    setTickets(updated);

    // 同步刷新 result
    if (updated.length > 0) {
      const rebuilt = rebuildSanitizedResultFromTickets(updated, totalBudget, ticketCount, selectedMatches);
      setResult(rebuilt);
      setAnalysis(analyzeTicketStructure(updated));
    } else {
      setResult(null);
      setAnalysis(null);
    }
  };

  const getStrategyColor = (tag: string) => {
    const colorMap: Record<string, string> = {
      '主线覆盖': '#183D2B',
      '防冷保护': '#DFFF4A',
      '比分小搏': '#07110B',
      '低进球保护': '#183D2B',
      '混合覆盖': '#6B6B6B',
      '比分方向覆盖': '#07110B',
      '进球数分支保护': '#DFFF4A',
      '低比分保护': '#07110B',
      '比分反向保护': '#6B6B6B',
    };
    return colorMap[tag] || '#183D2B';
  };

  const totalAllocated = tickets.reduce((sum, t) => sum + t.amount, 0);
  const remaining = totalBudget - totalAllocated;
  const maxTicket = tickets.length > 0 ? Math.max(...tickets.map(t => t.amount)) : 0;
  const scoreRatio = totalBudget > 0 ? (analysis?.scoreBetAmount || 0) / totalBudget * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── 参数设置区 ── */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-primary mb-6">参数设置</h3>

        {/* 可选比赛 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            选择参与组票的比赛
          </label>
          {matchesLoading ? (
            <div className="text-sm text-text-secondary/60 py-2">正在加载比赛数据...</div>
          ) : matchesError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="font-semibold mb-1">暂无可选赛前比赛</div>
              <div className="text-xs leading-relaxed">{matchesError}</div>
              <div className="mt-1 text-xs text-amber-600">
                原始比赛数：{rawMatchCount}；被过滤比赛数：{filteredOutCount}
              </div>
              <button
                onClick={handleRefresh}
                className="mt-2 px-3 py-1 text-xs border border-amber-400 text-amber-700 rounded hover:bg-amber-100 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : availableMatches.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              当前没有待开比赛可用于赛前模拟。进行中或已结束比赛仅可用于复盘。
              <button
                onClick={handleRefresh}
                className="ml-2 px-3 py-1 text-xs border border-gray-400 text-gray-600 rounded hover:bg-gray-100 transition-colors"
              >
                重新加载
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availableMatches.map((m) => {
                const selected = selectedMatchIds.has(m.id);
                const isPreMatch = isPreMatchStatus(m.rawStatus);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (!isPreMatch) return;
                      const next = new Set(selectedMatchIds);
                      if (selected) next.delete(m.id);
                      else next.add(m.id);
                      setSelectedMatchIds(next);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                      !isPreMatch
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        : selected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-card text-text-secondary border-border hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{m.home}</span>
                      <span className="mx-0.5 opacity-60">vs</span>
                      <span className="font-medium">{m.away}</span>
                    </div>
                    <div className="mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGE_CLASS[m.rawStatus] || 'bg-gray-100 text-gray-500'}`}>
                        {getStatusLabel(m.rawStatus)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="text-xs text-text-secondary/60 mt-2">
            仅「待开」状态的比赛可用于赛前模拟票组。「进行中」「已结束」仅供复盘。
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">总预算（元）</label>
            <input type="number" value={totalBudget} onChange={e => setTotalBudget(Number(e.target.value))} min={20} max={100000}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">单票最高金额（元）</label>
            <input type="number" value={maxSingleTicket} onChange={e => setMaxSingleTicket(Number(e.target.value))} min={4} max={100}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">票数</label>
            <input type="number" value={ticketCount} onChange={e => setTicketCount(Number(e.target.value))} min={4} max={20}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">比分票预算占比：{scoreTicketRatio}%</label>
            <input type="range" min={5} max={30} value={scoreTicketRatio} onChange={e => setScoreTicketRatio(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeScoreTickets} onChange={e => setIncludeScoreTickets(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm">是否加入比分票</span>
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">风险偏好</label>
          <div className="flex gap-2">
            {([
              { value: 'conservative', label: '保守' },
              { value: 'moderate', label: '稳健' },
              { value: 'aggressive', label: '进取' },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setRiskPreference(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${riskPreference === opt.value ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-bg'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleGenerate} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">生成小额多票方案</button>
          <button onClick={handleLoadExample} className="px-6 py-2 border-2 border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors">载入示例票组</button>
          <button onClick={handleClear} className="px-6 py-2 border border-border rounded-lg text-sm font-medium hover:bg-bg transition-colors">清空方案</button>
        </div>
      </div>

      {/* ── 票组结果区 ── */}
      {tickets.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">

          <div>
            <h3 className="font-bold text-primary mb-4">票组结果</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {[
                { label: '总预算', value: `${totalBudget}元` },
                { label: '已分配', value: `${totalAllocated}元` },
                { label: '空仓', value: `${remaining}元` },
                { label: '实际票数', value: `${tickets.length}张` },
                { label: '最高单票', value: `${maxTicket}元` },
                { label: '比分票占比', value: `${scoreRatio.toFixed(1)}%` }
              ].map((stat, i) => (
                <div key={i} className="bg-bg/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-text-secondary">{stat.label}</div>
                  <div className="text-lg font-bold text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 合法性检查 ── */}
          {result && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-blue-800 mb-3">票组合法性检查</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                <div><span className="text-blue-600">选择比赛：</span><span className="font-semibold text-blue-900">{result.legalitySummary.matchCount}场</span></div>
                <div><span className="text-blue-600">3串1状态：</span><span className={`font-semibold ${result.legalitySummary.tripleDisabled ? 'text-red-700' : 'text-green-700'}`}>{result.legalitySummary.tripleReason}</span></div>
                <div><span className="text-blue-600">非法同场重复：</span><span className={`font-semibold ${result.legalitySummary.illegalSameMatch ? 'text-red-700' : 'text-green-700'}`}>{result.legalitySummary.illegalSameMatch ? '有' : '无'}</span></div>
                <div><span className="text-blue-600">互斥条件：</span><span className="font-semibold text-green-700">无</span></div>
                <div><span className="text-blue-600">目标票数：</span><span className="font-semibold text-blue-900">{result.legalitySummary.targetTickets}张</span></div>
                <div><span className="text-blue-600">实际生成：</span><span className={`font-semibold ${result.legalitySummary.actualTickets < result.legalitySummary.targetTickets ? 'text-amber-700' : 'text-green-700'}`}>{result.legalitySummary.actualTickets}张</span></div>
                <div><span className="text-blue-600">重复候选票：</span><span className={`font-semibold ${result.legalitySummary.repeatedCandidatesFiltered > 0 ? 'text-amber-700' : 'text-green-700'}`}>{result.legalitySummary.repeatedCandidatesFiltered > 0 ? `已过滤${result.legalitySummary.repeatedCandidatesFiltered}张` : '无'}</span></div>
                <div><span className="text-blue-600">最终重复票：</span><span className="font-semibold text-green-700">无</span></div>
                <div className="col-span-4"><span className="text-blue-600">空仓金额：</span><span className={`font-semibold ${result.legalitySummary.emptyBudget > 0 ? 'text-amber-700' : 'text-green-700'}`}>{result.legalitySummary.emptyBudget}元{result.legalitySummary.emptyBudgetReason && <span className="text-amber-700 ml-1">（{result.legalitySummary.emptyBudgetReason}）</span>}</span></div>
              </div>

              {result.warnings.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="bg-blue-100 border border-blue-200 rounded-lg p-2.5">
                      <div className="text-xs font-semibold text-blue-800">
                        {w.type === 'triple_disabled' && '🔒 '}{w.type === 'repeated_filtered' && '🔁 '}{w.type === 'under_ticket' && '📉 '}{w.type === 'empty_budget' && '📦 '}{w.type === 'live_match' && '⚠️ '}{w.type === 'min_stake_error' && '❌ '}
                        {w.message}
                      </div>
                      {w.detail && <div className="text-xs text-blue-700 mt-0.5 leading-relaxed">{w.detail}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 三档中心保护层（外部参考规则） ── */}
          {result && result.goalCenterProtections.length > 0 && (
            <GoalCenterProtectionPanel
              protections={result.goalCenterProtections}
              selectedMatches={selectedMatches}
            />
          )}

          {/* ── 自动修正摘要（仅在有修正时显示） ── */}
          {result && result.autoCorrections && result.autoCorrections.length > 0 && (
            <div className="bg-purple-50 border border-purple-300 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔧</span>
                <span className="text-sm font-bold text-purple-800">已自动修正</span>
                <span className="px-1.5 py-0.5 bg-purple-200 text-purple-700 text-xs rounded border border-purple-400 font-medium">
                  {result.autoCorrections.length}项
                </span>
              </div>
              <div className="text-xs text-purple-700 space-y-1 leading-relaxed">
                {(() => {
                  const lines = summarizeCorrections(result.autoCorrections, result.conditionExposures);
                  return lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{line}</span>
                    </div>
                  ));
                })()}
              </div>
              {result.autoCorrections.length > 0 && (
                <div className="text-xs text-purple-500 mt-2 pt-2 border-t border-purple-200">
                  已重新计算条件暴露，当前显示为修正后状态
                </div>
              )}
            </div>
          )}

          {/* ── 条件暴露分析 ── */}
          {result && result.conditionExposures.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-red-800 mb-1">⚠ 条件暴露分析</div>
              <div className="text-xs text-red-600 mb-3">关联金额表示包含该条件的票面总金额，不代表该条件单独投入金额。平摊估算为按 leg 数量均摊后的估算值。</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-1.5 pr-3 text-red-600 font-medium">条件</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">出现票数</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">关联金额</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">平摊估算</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">占总预算</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">占已分配</th>
                      <th className="text-center py-1.5 px-2 text-red-600 font-medium">风险</th>
                      <th className="text-left py-1.5 pl-2 text-red-600 font-medium">建议动作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.conditionExposures.map((exp, i) => (
                      <tr key={i} className={`border-b border-red-100 ${exp.riskLevel === '过高' ? 'bg-red-100' : exp.riskLevel === '偏高' ? 'bg-amber-50' : ''}`}>
                        <td className="py-1.5 pr-3 font-medium text-red-900">{exp.label}</td>
                        <td className="text-center py-1.5 px-2">{exp.ticketCount}张</td>
                        <td className="text-center py-1.5 px-2 font-semibold">{exp.linkedAmount}元</td>
                        <td className="text-center py-1.5 px-2 text-gray-600">{exp.allocatedShare}元</td>
                        <td className="text-center py-1.5 px-2">{exp.budgetRatio}%</td>
                        <td className={`text-center py-1.5 px-2 font-semibold ${exp.allocatedRatio > 40 ? 'text-red-700' : 'text-gray-700'}`}>{exp.allocatedRatio}%</td>
                        <td className="text-center py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-white ${exp.riskLevel === '过高' ? 'bg-red-600' : exp.riskLevel === '偏高' ? 'bg-amber-500' : 'bg-green-500'}`}>{exp.riskLevel}</span>
                        </td>
                        <td className="py-1.5 pl-2 text-red-700 leading-relaxed">{exp.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 人工复核建议 ── */}
          {result && result.reviewSuggestions && result.reviewSuggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-amber-900 mb-3">📋 人工复核建议</div>
              <div className="space-y-2">
                {result.reviewSuggestions.map((s: ReviewSuggestion, i: number) => {
                  const sevColor = s.severity === 'danger'
                    ? 'border-red-300 bg-red-50'
                    : s.severity === 'warning'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-blue-200 bg-blue-50';
                  const sevIcon = s.severity === 'danger' ? '🔴' : s.severity === 'warning' ? '🟡' : '🔵';
                  return (
                    <div key={i} className={`border rounded-lg p-2.5 ${sevColor}`}>
                      <div className="text-xs font-semibold text-gray-800">
                        {sevIcon} {s.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 leading-relaxed">{s.detail}</div>
                      {s.affectedTickets.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          影响票：{s.affectedTickets.map(t => t.split('，')[0]).join('；')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 票组列表 ── */}
          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div key={ticket.id} className="border border-border rounded-lg p-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: getStrategyColor(ticket.strategyTag) }} />
                <div className="ml-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-primary">T{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-sm font-medium">{ticket.ticketType}</span>
                      <span className="text-xs px-2 py-1 rounded bg-bg text-text-secondary">{ticket.strategyTag}</span>
                      <span className={`text-xs px-2 py-1 rounded ${RISK_BADGE_CLASS[ticket.riskLevel] || 'bg-gray-100'}`}>{ticket.riskLevel}风险</span>
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">覆盖 {ticket.coverageScore}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xl font-bold text-primary">{ticket.amount}元</div>
                      <div className="text-xs text-text-secondary">{ticket.multiplier}倍</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary mb-1">{ticket.title}</div>
                  <div className="text-xs text-text-secondary mb-2">
                    公式：{ticket.baseStake}元 × {ticket.multiplier}倍 × {ticket.combinationCount}注 = {ticket.amount}元
                    {ticket.legs.length === 3 && <span className="ml-2 text-amber-600 font-semibold">（需命中全部3场）</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteTicket(ticket.id)} className="text-xs px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50">删除</button>
                  </div>
                  <div className="text-xs text-yellow-600 mt-2">{ticket.disclaimer}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── 结构分析 ── */}
          {analysis && (
            <div className="bg-bg/50 rounded-xl p-6">
              <h4 className="font-bold text-primary mb-4">结构分析</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: '主线覆盖金额', value: `${analysis.mainLineAmount}元` },
                  { label: '防冷保护金额', value: `${analysis.coldProtectionAmount}元` },
                  { label: '比分小搏金额', value: `${analysis.scoreBetAmount}元` },
                  { label: '混合覆盖金额', value: `${analysis.mixedCoverageAmount}元` }
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-border">
                    <div className="text-xs text-text-secondary">{stat.label}</div>
                    <div className="text-lg font-bold text-primary">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: '总票数', value: `${analysis.totalTickets}张` },
                  { label: '总金额', value: `${analysis.totalAmount}元` },
                  { label: '平均单票', value: `${analysis.averageAmount.toFixed(0)}元` },
                  { label: '最高单票', value: `${analysis.maxSingleAmount}元` }
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-border">
                    <div className="text-xs text-text-secondary">{stat.label}</div>
                    <div className="text-lg font-bold text-primary">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-text-secondary leading-relaxed">{analysis.analysisText}</div>
            </div>
          )}

          {/* ── 底部操作 ── */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleCopyText} className="px-6 py-2 border-2 border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors">复制出票文案</button>
            <button onClick={handleSaveToLedger} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">保存整组到台账</button>
          </div>

          {savedGroupId && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">已保存！组合编号：{savedGroupId}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 三档中心保护层展示组件（外部参考规则）
// ═══════════════════════════════════════════════

interface GoalCenterProtectionPanelProps {
  protections: GoalCenterProtection[];
  selectedMatches: SelectableMatch[];
}

function GoalCenterProtectionPanel({ protections, selectedMatches }: GoalCenterProtectionPanelProps) {
  const validation = getLocalValidationStatus();

  return (
    <div className="bg-[#F5F0EB] border border-[#183D2B] rounded-xl p-4 mb-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <span className="text-sm font-bold text-[#183D2B]">总进球中心保护层</span>
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-300 font-medium">
            外部参考规则
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {validation.label}
        </div>
      </div>

      {/* 外部参考说明 */}
      <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>⚠️ 外部参考说明：</strong>"三档中心保护层"参考外部大样本结论（30%测试筛后2750场命中80.91%，40%测试筛后2482场命中83.48%）。
          <span className="text-amber-700">
            本系统目前没有原始样本复现，该规则作为候选启发式使用，并通过后续本地复盘逐步验证。
          </span>
        </p>
      </div>

      {/* 每场比赛的保护层 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        {protections.map((gcp) => (
          <GoalProtectionCard key={gcp.matchId} gcp={gcp} />
        ))}
      </div>

      {/* 验证进度条 */}
      <LocalValidationProgress validation={validation} />
    </div>
  );
}

interface GoalProtectionCardProps {
  gcp: GoalCenterProtection;
}

function GoalProtectionCard({ gcp }: GoalProtectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [actualGoals, setActualGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveReview = () => {
    const goals = actualGoals.trim();
    if (goals === '' || isNaN(Number(goals))) return;
    const totalGoals = Number(goals);
    const hitCenter = gcp.mainRange.some(g => g === `${totalGoals}球`);
    const hitLow = gcp.lowProtect.some(g => g === `${totalGoals}球`);
    const hitHigh = gcp.highProtect.some(g => g === `${totalGoals}球`);
    const review: LocalGoalReview = {
      matchId: gcp.matchId,
      matchName: gcp.matchName,
      predictedMainRange: gcp.mainRange,
      predictedLowProtect: gcp.lowProtect,
      predictedHighProtect: gcp.highProtect,
      actualTotalGoals: totalGoals,
      hitCenter,
      hitProtection: hitLow || hitHigh,
      hitAnyLayer: hitCenter || hitLow || hitHigh,
      reviewTime: new Date().toISOString(),
    };
    setSaving(true);
    saveLocalGoalReview(review);
    setTimeout(() => { setSaving(false); setSaved(true); }, 500);
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-3">
      {/* 比赛名 + 期望进球 */}
      <div className="mb-2">
        <div className="text-xs font-semibold text-[#183D2B] leading-tight">{gcp.matchName}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          期望进球 <span className="font-bold text-[#183D2B]">{gcp.expectedGoals}</span>
          <span className="ml-1 text-purple-600 text-xs">({gcp.reason.split('，')[0]})</span>
        </div>
      </div>

      {/* 四个区间 */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <LayerBadge label="主区间" options={gcp.mainRange} color="green" />
        <LayerBadge label="低位保护" options={gcp.lowProtect} color="blue" />
        <LayerBadge label="高位保护" options={gcp.highProtect} color="amber" />
        <LayerBadge label="宽覆盖" options={gcp.wideCover} color="gray" />
      </div>

      {/* 规则状态标签 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
          {gcp.ruleStatus === 'external_reference' ? '📎 外部参考' : gcp.ruleStatus === 'candidate' ? '🔎 候选启发式' : '✅ 本地已验证'}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {expanded ? '收起 ▲' : '复盘 ▼'}
        </button>
      </div>

      {/* 复盘区 */}
      {expanded && (
        <div className="border-t border-gray-100 pt-2 mt-1">
          <div className="text-xs text-gray-500 mb-1.5">
            实际总进球：
            <input
              type="number"
              min="0"
              max="15"
              value={actualGoals}
              onChange={e => setActualGoals(e.target.value)}
              placeholder="输入数字"
              className="ml-1 w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-center"
            />
            <span className="ml-1 text-gray-400">球</span>
            <button
              onClick={handleSaveReview}
              disabled={saving || saved || actualGoals.trim() === ''}
              className={`ml-2 px-2 py-0.5 rounded text-xs ${saved ? 'bg-green-100 text-green-700 border border-green-300' : saving ? 'bg-gray-100 text-gray-400' : 'bg-[#183D2B] text-white hover:bg-[#1a4d35]'}`}
            >
              {saved ? '✓ 已保存' : saving ? '保存中...' : '记录复盘'}
            </button>
          </div>
          <div className="text-xs text-gray-400 leading-relaxed">
            本地验证样本 {getLocalValidationStatus().sampleCount} 场
          </div>
        </div>
      )}
    </div>
  );
}

interface LayerBadgeProps {
  label: string;
  options: string[];
  color: 'green' | 'blue' | 'amber' | 'gray';
}

function LayerBadge({ label, options, color }: LayerBadgeProps) {
  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`rounded border px-1.5 py-1 ${colorMap[color]}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-xs font-semibold mt-0.5">{options.join('/')}</div>
    </div>
  );
}

function LocalValidationProgress({
  validation,
}: {
  validation: { status: string; sampleCount: number; hitRate: number | null; label: string };
}) {
  const thresholds = [
    { count: 30, label: '初步观察', color: 'bg-amber-400' },
    { count: 100, label: '本地可参考', color: 'bg-blue-400' },
    { count: 300, label: '本地已验证', color: 'bg-green-400' },
  ];

  return (
    <div className="border-t border-gray-200 pt-2.5 mt-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">本地复盘验证进度</span>
        <span className="text-xs text-gray-500">{validation.label}</span>
      </div>
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-gray-200">
        {thresholds.map((t, i) => {
          const prevThreshold = i === 0 ? 0 : thresholds[i - 1].count;
          const width = Math.min(100, Math.max(0, ((validation.sampleCount - prevThreshold) / (t.count - prevThreshold)) * 100));
          return (
            <div
              key={t.label}
              className={`h-full ${validation.sampleCount >= t.count ? t.color : 'bg-gray-100'}`}
              style={{ width: `${100 / thresholds.length}%`, flexShrink: 0 }}
              title={`${t.label}（需${t.count}场，当前${validation.sampleCount}场）`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-0.5">
        {thresholds.map((t) => (
          <span key={t.label} className="text-xs text-gray-400">
            {t.label}（{t.count}场）
          </span>
        ))}
      </div>
      {validation.hitRate !== null && (
        <div className="text-xs text-green-700 mt-1 font-medium">
          当前命中率：{(validation.hitRate * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
