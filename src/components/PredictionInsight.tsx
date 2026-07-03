import { useState, useMemo } from 'react';
import { useLiveScores } from '../hooks/useLiveScores';
import { formatLastUpdated, getDataSourceColor, getDataSourceLabel } from '../hooks/useLiveScores';

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

/**
 * 将 API 返回的 StandardMatch 转换为组件需要的 DisplayMatch
 */
function convertToDisplayMatch(match: any): DisplayMatch {
  return {
    id: match.id,
    date: match.date,
    time: match.time,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeFlag: match.homeTeam.flag,
    awayFlag: match.awayTeam.flag,
    status: match.status === 'NOT_STARTED' ? 'upcoming' : match.status === 'LIVE' ? 'live' : 'finished',
    stage: 'group',
    homeScore: match.homeScore ?? undefined,
    awayScore: match.awayScore ?? undefined,
    winProb: match.probabilities.homeWin,
    drawProb: match.probabilities.draw,
    loseProb: match.probabilities.awayWin,
    confidence: Math.round(Math.max(match.probabilities.homeWin, match.probabilities.draw, match.probabilities.awayWin) * 0.9),
    riskLevel: match.riskLevel === '低风险' ? 'low' : match.riskLevel === '中风险' ? 'medium' : 'high',
    recommendedPick: match.probabilities.homeWin >= 45 ? '主胜' : match.probabilities.awayWin >= 45 ? '客胜' : '平局',
    possibleScores: ['1-0', '2-1', '1-1'],
    overUnder: 'neutral',
    keyFactors: [
      `胜率 ${(Math.max(match.probabilities.homeWin, match.probabilities.draw, match.probabilities.awayWin))}%`,
      match.status === 'LIVE' ? `第 ${match.elapsed} 分钟` : '未开始',
    ],
    analysis: match.status === 'LIVE' 
      ? `比赛进行中，当前 ${match.homeScore}-${match.awayScore}`
      : `预测：${match.homeTeam.name} 胜率 ${match.probabilities.homeWin}%`,
  };
}

export default function PredictionInsight() {
  // 获取今天和明天的日期
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  
  // 使用实时数据 Hook
  const { matches, loading, error, dataSource, lastUpdated, refetch } = useLiveScores({
    date: today,
    autoRefresh: true,
  });
  
  // 转换为 DisplayMatch
  const displayMatches = matches.map(convertToDisplayMatch);
  
  // 过滤掉对阵未确定的比赛
  const validMatches = displayMatches.filter(m => m.homeTeam && m.homeTeam !== 'None' && m.awayTeam && m.awayTeam !== 'None');
  
  // 优先展示未开始和进行中的比赛，按时间排序
  const featuredMatches = validMatches
    .filter(m => m.status !== 'finished')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  
  // 如果未开始的不够，补充已结束的
  const displayCount = 8;
  const showMatches = featuredMatches.length >= 4
    ? featuredMatches.slice(0, displayCount)
    : [...featuredMatches, ...validMatches.filter(m => m.status === 'finished').slice(0, displayCount - featuredMatches.length)];
  
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
  
  return (
    <section id="predictions" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
            <span className="text-xl">🧠</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">预测与策略洞察</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>数据来源：</span>
              <span className={`font-medium ${getDataSourceColor(dataSource)}`}>
                {getDataSourceLabel(dataSource)}
              </span>
              {dataSource === 'mock' && (
                <span className="text-yellow-600 text-xs">（非实时数据）</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>最后更新：{formatLastUpdated(lastUpdated)}</span>
          <button
            onClick={refetch}
            disabled={loading}
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-xs"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            数据更新失败：{error}。已保留上一次成功数据。
          </div>
        )}
      </div>
      
      {loading && showMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {showMatches.map(match => (
            <div key={match.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(match.status)}
                  <span className="text-sm text-gray-500">{match.time}</span>
                </div>
                {getOverUnderBadge(match.overUnder)}
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-center">
                  <div className="font-semibold text-green-900">{match.homeTeam}</div>
                </div>
                
                <div className="px-6 text-center">
                  {match.status === 'live' ? (
                    <div className="text-2xl font-bold text-red-600">
                      {match.homeScore} - {match.awayScore}
                    </div>
                  ) : match.status === 'finished' ? (
                    <div className="text-2xl font-bold text-gray-900">
                      {match.homeScore} - {match.awayScore}
                    </div>
                  ) : (
                    <div className="text-lg text-gray-400">vs</div>
                  )}
                </div>
                
                <div className="flex-1 text-center">
                  <div className="font-semibold text-green-900">{match.awayTeam}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">胜平负概率</span>
                </div>
                {getProbabilityBar(match.winProb, match.drawProb, match.loseProb)}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>主胜 {match.winProb}%</span>
                  <span>平局 {match.drawProb}%</span>
                  <span>客胜 {match.loseProb}%</span>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {match.analysis}
              </div>
            </div>
          ))}
          
          {showMatches.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <p>暂无比赛数据</p>
              {dataSource === 'mock' && (
                <p className="text-sm mt-2">当前使用模拟数据，请配置 API Key 以获取实时数据</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
