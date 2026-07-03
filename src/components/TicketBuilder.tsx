import { useState } from 'react';
import { useLiveScores } from '../hooks/useLiveScores';
import { formatLastUpdated, getDataSourceColor, getDataSourceLabel } from '../hooks/useLiveScores';
import SplitTicketBuilder from './SplitTicketBuilder';

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
    keyFactors: [],
    analysis: '',
  };
}

export default function TicketBuilder() {
  const [activeTab, setActiveTab] = useState<'smart' | 'split' | 'history'>('split');
  
  // 获取今天和明天的日期
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  
  // 使用实时数据 Hook
  const { matches, loading, error, dataSource, lastUpdated, refetch } = useLiveScores({
    date: today,
    autoRefresh: true,
  });
  
  // 转换为 DisplayMatch
  const displayMatches = matches.map(convertToDisplayMatch);
  
  // 可选比赛：未开始 + 进行中（按时间排序）
  const availableMatches = displayMatches.filter(m => 
    (m.status === 'upcoming' || m.status === 'live') && 
    m.homeTeam && 
    m.homeTeam !== 'None' && 
    m.awayTeam && 
    m.awayTeam !== 'None'
  ).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  
  return (
    <section id="tickets" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
            <span className="text-xl">🎫</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">智能出票系统</h2>
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
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-xs"
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
      
      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'split', label: '小额多票拆单' },
          { id: 'smart', label: '智能生成' },
          { id: 'history', label: '历史票组' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 加载状态 */}
      {loading && availableMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      ) : (
        <>
          {/* 小额多票拆单 */}
          {activeTab === 'split' && (
            <SplitTicketBuilder matches={availableMatches} />
          )}
          
          {/* 智能生成 */}
          {activeTab === 'smart' && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">智能生成票组</h3>
              <p className="text-gray-600">功能开发中...</p>
            </div>
          )}
          
          {/* 历史票组 */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">历史票组</h3>
              <p className="text-gray-600">功能开发中...</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
