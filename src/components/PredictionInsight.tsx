import { useState, useEffect, useCallback } from 'react';
import { mockMatches, stageLabels } from '../data/mockMatches';
import { fetchLocalMatches, convertMatchToFrontend, type StandardMatch } from '../services/localData';

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

export default function PredictionInsight() {
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const localMatches: StandardMatch[] = await fetchLocalMatches('WC');
      if (localMatches.length === 0) {
        setMatches(mockMatches as DisplayMatch[]);
        setDataSource('mock');
      } else {
        const converted = localMatches.map(convertMatchToFrontend) as DisplayMatch[];
        setMatches(converted);
        setDataSource('live');
      }
      setLastUpdate(new Date());
    } catch {
      setMatches(mockMatches as DisplayMatch[]);
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // 过滤掉对阵未确定的比赛
  const validMatches = matches.filter(m => m.homeTeam && m.homeTeam !== 'None' && m.awayTeam && m.awayTeam !== 'None');

  // 优先展示未开始和进行中的比赛，按时间排序
  const featuredMatches = validMatches
    .filter(m => m.status !== 'finished')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // 如果未开始的不够，补充已结束的
  const displayMatches = featuredMatches.length >= 4
    ? featuredMatches.slice(0, 8)
    : [...featuredMatches, ...validMatches.filter(m => m.status === 'finished').slice(0, 8 - featuredMatches.length)];

  const getProbabilityBar = (win: number, draw: number, lose: number) => {
    const total = win + draw + lose;
    if (total === 0) return null;
    return (
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        <div className="bg-green-500 transition-all" style={{ width: `${(win / total) * 100}%` }} />
        <div className="bg-yellow-500 transition-all" style={{ width: `${(draw / total) * 100}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${(lose / total) * 100}%` }} />
      </div>
    );
  };

  const getOverUnderBadge = (ou: string) => {
    const styles: Record<string, string> = {
      over: 'bg-blue-100 text-blue-700',
      under: 'bg-purple-100 text-purple-700',
      neutral: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      over: '大球倾向',
      under: '小球倾向',
      neutral: '大小均衡',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[ou] || styles.neutral}`}>
        {labels[ou] || labels.neutral}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700',
      live: 'bg-red-100 text-red-700 animate-pulse',
      finished: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      upcoming: '未开始',
      live: '进行中',
      finished: '已结束',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.upcoming}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <section id="prediction" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary">预测与策略洞察</h2>
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
          基于多维数据的比赛预测与策略建议
          {lastUpdate && (
            <span className="ml-2 text-xs text-text-secondary/60">
              · 最后更新: {lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </p>
      </div>

      {loading && displayMatches.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <div className="text-text-secondary">加载预测数据...</div>
        </div>
      )}

      {displayMatches.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-text-secondary">暂无可预测的比赛数据</div>
          <div className="text-xs mt-1 text-text-secondary/60">请先运行同步脚本获取最新比赛数据</div>
        </div>
      )}

      <div className="space-y-4">
        {displayMatches.map(match => (
          <div key={match.id} className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {match.homeFlag?.startsWith('http') ? (
                    <img src={match.homeFlag} alt="" className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-2xl">{match.homeFlag}</span>
                  )}
                  <span className="font-bold text-lg">{match.homeTeam}</span>
                  <span className="text-text-secondary">vs</span>
                  <span className="font-bold text-lg">{match.awayTeam}</span>
                  {match.awayFlag?.startsWith('http') ? (
                    <img src={match.awayFlag} alt="" className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-2xl">{match.awayFlag}</span>
                  )}
                  {getStatusBadge(match.status)}
                  <span className="text-xs text-text-secondary">
                    {match.date} {match.time}
                    {match.stage && ` · ${stageLabels[match.stage] || match.stage}`}
                  </span>
                </div>

                {(match.status === 'live' || match.status === 'finished') && match.homeScore !== undefined && (
                  <div className="mb-3 text-2xl font-bold text-primary">
                    {match.homeScore} - {match.awayScore}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-text-secondary mb-1">胜/平/负概率</div>
                    {getProbabilityBar(match.winProb, match.drawProb, match.loseProb)}
                    <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                      <span>胜 {match.winProb}%</span>
                      <span>平 {match.drawProb}%</span>
                      <span>负 {match.loseProb}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-text-secondary mb-1">推荐方向</div>
                    <div className="font-medium text-sm text-primary">{match.recommendedPick}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {match.keyFactors.map((factor, i) => (
                    <span key={i} className="px-2 py-1 bg-bg rounded-lg text-xs text-text-secondary">
                      {factor}
                    </span>
                  ))}
                  <span className="px-2 py-1 rounded-lg text-xs">
                    {getOverUnderBadge(match.overUnder)}
                  </span>
                </div>

                {match.analysis && (
                  <div className="text-sm text-text-secondary leading-relaxed">
                    {match.analysis}
                  </div>
                )}

                {match.possibleScores.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {match.possibleScores.map((score, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                        {score}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:w-32 flex lg:flex-col items-center justify-center gap-2 bg-bg/50 rounded-xl p-4">
                <div className="text-3xl font-bold text-primary">{match.confidence}</div>
                <div className="text-xs text-text-secondary text-center">模型信心分</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      match.confidence >= 75 ? 'bg-green-500' : match.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${match.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-text-secondary text-center">
        数据来源: {dataSource === 'live' ? 'football-data.org (脚本同步)' : '本地模拟数据'}
        · 仅供分析参考，不构成投注建议
      </div>
    </section>
  );
}
