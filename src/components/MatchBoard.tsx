import { useState, useEffect, useCallback } from 'react';
import { mockMatches, stageLabels, statusLabels, riskLabels } from '../data/mockMatches';
import { fetchLocalMatches, convertMatchToFrontend, type StandardMatch } from '../services/localData';

type FilterType = 'all' | 'upcoming' | 'live' | 'finished';

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
  matchday?: number | string;
  group?: string | null;
  competition?: string;
  competitionCode?: string;
}

export default function MatchBoard() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }));
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localMatches: StandardMatch[] = await fetchLocalMatches('WC');
      if (localMatches.length === 0) {
        setMatches(mockMatches as DisplayMatch[]);
        setDataSource('mock');
      } else {
        const converted = localMatches.map(convertMatchToFrontend);
        setMatches(converted);
        setDataSource('live');
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('加载比赛数据失败:', err);
      setMatches(mockMatches as DisplayMatch[]);
      setDataSource('mock');
      setError(err instanceof Error ? err.message : '加载失败，已切换到模拟数据');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'upcoming', label: '未开始' },
    { id: 'live', label: '进行中' },
    { id: 'finished', label: '已结束' },
  ];

  // 赛事固定为WC，无需筛选按钮

  const filteredMatches = matches.filter(m => {
    // 过滤掉对阵未确定的比赛（None vs None）
    if (!m.homeTeam || m.homeTeam === 'None' || !m.awayTeam || m.awayTeam === 'None') return false;
    if (selectedDate && m.date !== selectedDate) return false;
    if (activeFilter !== 'all' && m.status !== activeFilter) return false;
    return true;
  });

  // 统计
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });


  const todayMatches = matches.filter(m => m.date === todayStr);
  const liveCount = todayMatches.filter(m => m.status === 'live').length;
  const finishedCount = todayMatches.filter(m => m.status === 'finished').length;
  const upcomingCount = todayMatches.filter(m => m.status === 'upcoming').length;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700',
      live: 'bg-red-100 text-red-700 animate-pulse',
      finished: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.upcoming}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getRiskBadge = (risk: string) => {
    const styles: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[risk] || styles.medium}`}>
        {riskLabels[risk] || risk}
      </span>
    );
  };

  const getConfidenceBar = (confidence: number) => {
    const color = confidence >= 75 ? 'bg-green-500' : confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${confidence}%` }} />
        </div>
        <span className="text-sm font-medium w-10 text-right">{confidence}</span>
      </div>
    );
  };

  // 按日期分组
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    if (!acc[match.date]) acc[match.date] = [];
    acc[match.date].push(match);
    return acc;
  }, {} as Record<string, DisplayMatch[]>);

  const sortedDates = Object.keys(groupedMatches).sort();

  return (
    <section id="matches" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary">今日赛果与进行中比赛</h2>
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
        </div>
        <p className="text-text-secondary">
          实时追踪比赛状态与概率变化
          {lastUpdate && (
            <span className="ml-2 text-xs text-text-secondary/60">
              · 最后更新: {lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </p>
      </div>

      {/* 今日统计 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
          <div className="text-xs text-text-secondary mt-1">未开始</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{liveCount}</div>
          <div className="text-xs text-text-secondary mt-1">进行中</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{finishedCount}</div>
          <div className="text-xs text-text-secondary mt-1">已结束</div>
        </div>
      </div>

      {error && dataSource === 'mock' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          ⚠️ {error}。请先运行同步脚本: <code className="px-1.5 py-0.5 bg-card border border-border rounded">python3 scripts/ingest/fetch_football_data.py</code>
        </div>
      )}

      {loading && matches.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <div className="text-text-secondary">加载比赛数据...</div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedDate === yesterdayStr ? 'bg-primary text-white' : 'bg-bg text-text-secondary hover:bg-border'}`}
              >
                昨天
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedDate === todayStr ? 'bg-primary text-white' : 'bg-bg text-text-secondary hover:bg-border'}`}
              >
                今天
              </button>
              <button
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedDate === tomorrowStr ? 'bg-primary text-white' : 'bg-bg text-text-secondary hover:bg-border'}`}
              >
                明天
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {filters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === filter.id ? 'bg-primary text-white' : 'bg-bg text-text-secondary hover:bg-border'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              onClick={loadMatches}
              disabled={loading}
              className="sm:ml-auto px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg/50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? '刷新中...' : '刷新'}
            </button>
          </div>

        </div>

        <div className="divide-y divide-border">
          {filteredMatches.length === 0 && !loading && (
            <div className="px-4 py-12 text-center text-text-secondary">
              <div className="text-4xl mb-2">⚽</div>
              <div>所选日期暂无比赛</div>
              <div className="text-xs mt-1">尝试切换日期或查看全部比赛</div>
            </div>
          )}

          {sortedDates.map(date => (
            <div key={date}>
              <div className="px-4 sm:px-6 py-2 bg-bg/50 text-xs text-text-secondary font-medium">
                {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                })}
              </div>
              {groupedMatches[date].map(match => (
                <div key={match.id} className="p-4 sm:p-6 hover:bg-bg/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-center min-w-[60px]">
                        <div className="text-sm font-medium">{match.time}</div>
                        <div className="text-xs text-text-secondary">
                          {stageLabels[match.stage]}
                          {match.group && ` · ${match.group}`}
                        </div>
                        {match.competitionCode && (
                          <div className="text-xs text-text-secondary/70 mt-0.5">{match.competitionCode}</div>
                        )}
                      </div>

                      <div className="flex-1 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 justify-end sm:justify-start">
                          {match.homeFlag?.startsWith('http') ? (
                            <img src={match.homeFlag} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-2xl">{match.homeFlag}</span>
                          )}
                          <span className="font-medium text-sm sm:text-base">{match.homeTeam}</span>
                        </div>

                        <div className="text-center px-4">
                          {match.status === 'finished' || match.status === 'live' ? (
                            <div className={`text-xl font-bold ${match.status === 'live' ? 'text-red-500' : ''}`}>
                              {match.homeScore} - {match.awayScore}
                            </div>
                          ) : (
                            <div className="text-sm text-text-secondary">VS</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-1 justify-start sm:justify-end">
                          <span className="font-medium text-sm sm:text-base">{match.awayTeam}</span>
                          {match.awayFlag?.startsWith('http') ? (
                            <img src={match.awayFlag} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-2xl">{match.awayFlag}</span>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-3">
                        {getStatusBadge(match.status)}
                        {getRiskBadge(match.riskLevel)}
                      </div>
                    </div>

                    <div className="sm:w-48">
                      <div className="text-xs text-text-secondary mb-1">胜/平/负概率</div>
                      {getConfidenceBar(match.confidence)}
                      <div className="flex gap-2 mt-1 text-xs text-text-secondary">
                        <span>胜{match.winProb}%</span>
                        <span>平{match.drawProb}%</span>
                        <span>负{match.loseProb}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:hidden items-center gap-2 mt-3">
                    {getStatusBadge(match.status)}
                    {getRiskBadge(match.riskLevel)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-text-secondary text-center">
        数据来源: {dataSource === 'live' ? 'football-data.org (脚本同步)' : '本地模拟数据'}
        {lastUpdate && ` · 最后更新: ${lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
        · 仅供数据分析，不构成投注建议
      </div>
    </section>
  );
}
