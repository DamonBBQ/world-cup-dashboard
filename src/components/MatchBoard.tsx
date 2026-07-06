import { useState } from 'react';
import { useLiveScores, type StandardMatch } from '../hooks/useLiveScores';
import { formatLastUpdated, getDataSourceColor, getDataSourceLabel, hasRealData } from '../hooks/useLiveScores';
import { isWorldCupCompetitionName } from '../utils/worldCupFilter';

// 状态标签映射
const STATUS_LABELS: Record<string, string> = {
  upcoming: '未开始',
  live: '进行中',
  finished: '已结束',
};

// 风险等级标签映射
const RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

type FilterType = 'all' | 'upcoming' | 'live' | 'finished';

/**
 * 将 API 返回的 StandardMatch 转换为组件需要的 DisplayMatch
 */
function convertToDisplayMatch(match: StandardMatch): any {
  const status: 'upcoming' | 'live' | 'finished' = 
    match.status === 'NOT_STARTED' ? 'upcoming' : 
    match.status === 'LIVE' ? 'live' : 'finished';
  
  return {
    id: match.id,
    date: match.date,
    time: match.time,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeFlag: match.homeTeam.flag,
    awayFlag: match.awayTeam.flag,
    status,
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
    elapsed: match.elapsed,
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
  return Math.round(maxProb * 0.9 + 10);
}

function generateRecommendedPick(probabilities: { homeWin: number; draw: number; awayWin: number }): string {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  if (probabilities.homeWin === maxProb) return '主胜';
  if (probabilities.awayWin === maxProb) return '客胜';
  return '平局';
}

function generatePossibleScores(probabilities: { homeWin: number; draw: number; awayWin: number }): string[] {
  if (probabilities.homeWin >= 50) return ['2-1', '1-0', '2-0'];
  if (probabilities.awayWin >= 50) return ['0-1', '1-2', '0-2'];
  return ['1-1', '0-0', '2-2'];
}

function generateKeyFactors(match: StandardMatch): string[] {
  const factors = [];
  
  if (match.status === 'LIVE') {
    factors.push(`第 ${match.elapsed || 0} 分钟`);
    if (match.homeScore !== null && match.awayScore !== null) {
      factors.push(`当前比分 ${match.homeScore}-${match.awayScore}`);
    } else {
      factors.push('比分暂未返回');
    }
  }
  
  const maxProb = Math.max(
    match.probabilities.homeWin, 
    match.probabilities.draw, 
    match.probabilities.awayWin
  );
  if (maxProb >= 60) {
    factors.push('胜率较高');
  } else if (maxProb >= 45) {
    factors.push('胜负难料');
  } else {
    factors.push('势均力敌');
  }
  
  return factors;
}

function generateAnalysis(match: StandardMatch): string {
  if (match.status === 'LIVE') {
    const score = match.homeScore !== null && match.awayScore !== null 
      ? `${match.homeScore}-${match.awayScore}` 
      : '比分暂未返回';
    return `比赛进行中（第 ${match.elapsed || 0} 分钟），当前比分 ${score}。`;
  } else if (match.status === 'FINISHED') {
    const score = match.homeScore !== null && match.awayScore !== null 
      ? `${match.homeScore}-${match.awayScore}` 
      : '比分暂未返回';
    return `比赛已结束，最终比分 ${score}。`;
  } else {
    const maxProb = Math.max(
      match.probabilities.homeWin, 
      match.probabilities.draw, 
      match.probabilities.awayWin
    );
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
  
  // 获取北京时间今天的 UTC 日期字符串（用于 API 查询）
  const getBeijingTodayUTC = () => {
    const now = new Date();
    // 北京时间 = UTC + 8小时
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingNow.toLocaleDateString('sv-SE', { timeZone: 'UTC' });
  };
  
  // 获取北京时间某个日期的 UTC 日期（用于 API 查询）
  // 北京时间 00:00-07:59 对应 UTC 前一天
  const getBeijingDateToUTC = (beijingDate: Date) => {
    const beijingDayStart = new Date(beijingDate);
    beijingDayStart.setHours(0, 0, 0, 0);
    // 转换为 UTC
    const utcDayStart = new Date(beijingDayStart.getTime() - 8 * 60 * 60 * 1000);
    return utcDayStart.toLocaleDateString('sv-SE', { timeZone: 'UTC' });
  };
  
  // 初始值：北京时间今天的 UTC 日期
  const [selectedDate, setSelectedDate] = useState(() => {
    return getBeijingTodayUTC();
  });
  
  // selectedDate 是 UTC 日期，转换为北京时间显示用
  const selectedBeijingDate = new Date(new Date(selectedDate + 'T00:00:00Z').getTime() + 8 * 60 * 60 * 1000);
  
  // 使用实时数据 Hook
  // date 参数使用 UTC 日期（selectedDate），ESPN API 接受 UTC 日期
  const { matches, loading, error, dataSource, lastUpdated, refetch } = useLiveScores({
    date: selectedDate,
    autoRefresh: true,
  });
  
  // 转换为 DisplayMatch，并做前端防御过滤
  const displayMatches = matches
    .filter(match => isWorldCupCompetitionName(match.competition))
    .map(convertToDisplayMatch);
  
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
  
  // 统计：基于 selectedDate（UTC 日期）
  // 北京时间 00:00-07:59 的比赛在 UTC 前一天，所以 selectedDate 对应北京时间 selectedBeijingDate
  const selectedDateMatches = displayMatches.filter(m => m.date === selectedDate);
  const liveCount = selectedDateMatches.filter(m => m.status === 'live').length;
  const finishedCount = selectedDateMatches.filter(m => m.status === 'finished').length;
  const upcomingCount = selectedDateMatches.filter(m => m.status === 'upcoming').length;
  const totalMatches = selectedDateMatches.length;
  
  // 检查是否有真实数据
  const hasReal = hasRealData(dataSource, matches);
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700',
      live: 'bg-red-100 text-red-700 animate-pulse',
      finished: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.upcoming}`}>
        {STATUS_LABELS[status] || status}
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
        {RISK_LABELS[risk] || risk}
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
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">数据来源：</span>
              <span className={`font-medium ${getDataSourceColor(dataSource)}`}>
                {getDataSourceLabel(dataSource)}
              </span>
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
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
        
        {/* 无真实数据提示 */}
        {!hasReal && !loading && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            实时数据暂不可用。请检查 API Key 配置、数据套餐权限，或当天是否有比赛。
          </div>
        )}
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '当日比赛', value: totalMatches, color: 'text-green-700', bg: 'bg-green-50' },
          { label: '进行中', value: liveCount, color: 'text-red-700', bg: 'bg-red-50', warn: liveCount > 0 && totalMatches === 0 },
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
          // 计算北京时间基准日期
          const beijingBase = new Date();
          const beijingNow = new Date(beijingBase.getTime() + 8 * 60 * 60 * 1000);
          const beijingDay = new Date(beijingNow);
          beijingDay.setDate(beijingNow.getDate() + (idx - 1));
          beijingDay.setHours(0, 0, 0, 0);
          
          // 北京时间该天的 UTC 日期（用于 API 查询）
          const utcDateStr = beijingDay.toLocaleDateString('sv-SE', { timeZone: 'UTC' });
          
          // 北京时间该天的显示格式
          const displayStr = beijingDay.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
          
          return (
            <button
              key={label}
              onClick={() => setSelectedDate(utcDateStr)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedDate === utcDateStr
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {label} ({displayStr.slice(5)})
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
      
      {/* 无数据提示 */}
      {sortedDates.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">暂无实时比赛数据</p>
          <p className="text-sm">可能原因：今天没有比赛、API Key 无效、数据套餐不支持该赛事、或数据源暂时不可用。</p>
        </div>
      )}
      
      {/* 比赛列表 */}
      {sortedDates.length > 0 && (
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
                          {match.homeScore !== null ? match.homeScore : '?'} - {match.awayScore !== null ? match.awayScore : '?'}
                        </div>
                      ) : match.status === 'finished' ? (
                        <div className="text-3xl font-bold text-gray-900">
                          {match.homeScore !== null ? match.homeScore : '?'} - {match.awayScore !== null ? match.awayScore : '?'}
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
                      <span className="text-xs text-gray-400">算法预测</span>
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
