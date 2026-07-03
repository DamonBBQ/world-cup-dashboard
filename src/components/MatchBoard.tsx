import { useState, useCallback } from 'react';
import { useLiveScores, formatLastUpdated, getDataSourceColor, getDataSourceLabel } from '../hooks/useLiveScores';
import { stageLabels, statusLabels, riskLabels } from '../data/mockMatches';

type FilterType = 'all' | 'upcoming' | 'live' | 'finished';

/**
 * 将 API 返回的 StandardMatch 转换为组件需要的 DisplayMatch
 */
function convertToDisplayMatch(match: any): any {
  return {
    id: match.id,
    date: match.date,
    time: match.time,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeFlag: match.homeTeam.flag,
    awayFlag: match.awayTeam.flag,
    status: match.status === 'NOT_STARTED' ? 'upcoming' : match.status === 'LIVE' ? 'live' : 'finished',
    stage: mapStage(match.stage),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    winProb: match.probabilities.homeWin,
    drawProb: match.probabilities.draw,
    loseProb: match.probabilities.awayWin,
    confidence: calculateConfidence(match.probabilities),
    riskLevel: mapRiskLevel(match.riskLevel),
    recommendedPick: generateRecommendedPick(match.probabilities),
    possibleScores: generatePossibleScores(match.probabilities),
    overUnder: 'neutral',
    keyFactors: generateKeyFactors(match),
    analysis: generateAnalysis(match),
    matchday: undefined,
    group: null,
    competition: match.competition,
    competitionCode: undefined,
  };
}

function mapStage(stage: string): 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final' {
  if (stage.includes('Group')) return 'group';
  if (stage.includes('Round 16') || stage.includes('Last 16')) return 'round16';
  if (stage.includes('Quarter')) return 'quarterfinal';
  if (stage.includes('Semi')) return 'semifinal';
  if (stage.includes('Final')) return 'final';
  return 'group';
}

function mapRiskLevel(risk: string): 'low' | 'medium' | 'high' {
  if (risk === '低风险') return 'low';
  if (risk === '中风险') return 'medium';
  return 'high';
}

function calculateConfidence(probabilities: { homeWin: number; draw: number; awayWin: number }): number {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  return Math.round(maxProb * 0.9 + 10); // 简单映射
}

function generateRecommendedPick(probabilities: { homeWin: number; draw: number; awayWin: number }): string {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  if (probabilities.homeWin === maxProb) return '主胜';
  if (probabilities.awayWin === maxProb) return '客胜';
  return '平局';
}

function generatePossibleScores(probabilities: { homeWin: number; draw: number; awayWin: number }): string[] {
  // 简化版：根据概率生成可能的比分
  if (probabilities.homeWin >= 50) return ['2-1', '1-0', '2-0'];
  if (probabilities.awayWin >= 50) return ['0-1', '1-2', '0-2'];
  return ['1-1', '0-0', '2-2'];
}

function generateKeyFactors(match: any): string[] {
  const factors = [];
  
  if (match.status === 'LIVE') {
    factors.push(`第 ${match.elapsed} 分钟`);
    factors.push(`当前比分 ${match.homeScore}-${match.awayScore}`);
  }
  
  const maxProb = Math.max(match.probabilities.homeWin, match.probabilities.draw, match.probabilities.awayWin);
  if (maxProb >= 60) {
    factors.push('胜率较高');
  } else if (maxProb >= 45) {
    factors.push('胜负难料');
  } else {
    factors.push('势均力敌');
  }
  
  return factors;
}

function generateAnalysis(match: any): string {
  if (match.status === 'LIVE') {
    return `比赛进行中（第 ${match.elapsed} 分钟），当前比分 ${match.homeScore}-${match.awayScore}。`;
  } else if (match.status === 'FINISHED') {
    return `比赛已结束，最终比分 ${match.homeScore}-${match.awayScore}。`;
  } else {
    const maxProb = Math.max(match.probabilities.homeWin, match.probabilities.draw, match.probabilities.awayWin);
    if (match.probabilities.homeWin === maxProb) {
      return `${match.homeTeam.name} 胜率较高（${match.probabilities.homeWin}%），值得关注。`;
    } else if (match.probabilities.awayWin === maxProb) {
      return `${match.awayTeam.name} 胜率较高（${match.probabilities.awayWin}%），值得关注。`;
    } else {
      return `双方实力接近，平局概率 ${match.probabilities.draw}%。`;
    }
  }
}

export default function MatchBoard() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }));
  
  // 使用实时数据 Hook
  const { matches, loading, error, dataSource, lastUpdated, refetch } = useLiveScores({
    date: selectedDate,
    autoRefresh: true,
  });
  
  // 转换为 DisplayMatch
  const displayMatches = matches.map(convertToDisplayMatch);
  
  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'upcoming', label: '未开始' },
    { id: 'live', label: '进行中' },
    { id: 'finished', label: '已结束' },
  ];
  
  const filteredMatches = displayMatches.filter(m => {
    if (selectedDate && m.date !== selectedDate) return false;
    if (activeFilter !== 'all' && m.status !== activeFilter) return false;
    return true;
  });
  
  // 统计
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  const todayMatches = displayMatches.filter(m => m.date === todayStr);
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
  }, {} as Record<string, any[]>);
  
  const sortedDates = Object.keys(groupedMatches).sort();
  
  return (
    <section id="matches" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
            <span className="text-xl">📅</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">今日赛果与进行中比赛</h2>
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
        
        {/* 最后更新时间 + 刷新按钮 */}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>最后更新：{formatLastUpdated(lastUpdated)}</span>
          <button
            onClick={refetch}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            数据更新失败：{error}。已保留上一次成功数据。
          </div>
        )}
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '今日比赛', value: todayMatches.length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: '进行中', value: liveCount, color: 'text-red-700', bg: 'bg-red-50' },
          { label: '已结束', value: finishedCount, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: '未开始', value: upcomingCount, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center`}>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* 过滤器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === f.id
                ? 'bg-green-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* 日期选择器 */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {['昨天', '今天', '明天'].map((label, idx) => {
          const d = new Date();
          d.setDate(d.getDate() + (idx - 1));
          const dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
          return (
            <button
              key={label}
              onClick={() => setSelectedDate(dateStr)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedDate === dateStr
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {label} ({dateStr.slice(5)})
            </button>
          );
        })}
      </div>
      
      {/* 加载状态 */}
      {loading && displayMatches.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      )}
      
      {/* 比赛列表 */}
      {sortedDates.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无比赛数据</p>
          {dataSource === 'mock' && (
            <p className="text-sm mt-2">当前使用模拟数据，请配置 API Key 以获取实时数据</p>
          )}
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-4">{date}</h3>
            <div className="grid gap-4">
              {groupedMatches[date].map(match => (
                <div key={match.id} className="bg-white rounded-2xl shadow hover:shadow-md transition p-6">
                  {/* 比赛卡片内容 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(match.status)}
                      {getRiskBadge(match.riskLevel)}
                    </div>
                    <span className="text-sm text-gray-500">{match.time}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 text-center">
                      <div className="font-semibold text-green-900">{match.homeTeam}</div>
                      {match.homeFlag && <span className="text-2xl">{match.homeFlag}</span>}
                    </div>
                    
                    <div className="px-6 text-center">
                      {match.status === 'live' ? (
                        <div className="text-3xl font-bold text-red-600">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      ) : match.status === 'finished' ? (
                        <div className="text-3xl font-bold text-gray-900">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      ) : (
                        <div className="text-lg text-gray-400">vs</div>
                      )}
                      {match.status === 'live' && match.elapsed && (
                        <div className="text-xs text-red-500 mt-1">第 {match.elapsed} 分钟</div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-center">
                      <div className="font-semibold text-green-900">{match.awayTeam}</div>
                      {match.awayFlag && <span className="text-2xl">{match.awayFlag}</span>}
                    </div>
                  </div>
                  
                  {/* 概率条 */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-600">主胜</div>
                      <div className="font-bold text-green-700">{match.winProb}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">平局</div>
                      <div className="font-bold text-yellow-700">{match.drawProb}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">客胜</div>
                      <div className="font-bold text-blue-700">{match.loseProb}%</div>
                    </div>
                  </div>
                  
                  {/* 信心分 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">预测信心</span>
                    </div>
                    {getConfidenceBar(match.confidence)}
                  </div>
                  
                  {/* 分析 */}
                  <div className="text-sm text-gray-600">
                    {match.analysis}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
