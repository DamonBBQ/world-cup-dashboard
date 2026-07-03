/**
 * Football Data API 服务层
 * 通过 Vite proxy 代理调用 football-data.org v4 API
 * 免费版包含 World Cup 数据
 * 文档: https://docs.football-data.org
 */

const API_BASE = '/api/football'

export interface ApiMatch {
  id: number
  utcDate: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED'
  matchday: number
  stage: string
  group: string | null
  lastUpdated: string
  homeTeam: {
    id: number
    name: string
    shortName: string
    tla: string
    crest: string
  }
  awayTeam: {
    id: number
    name: string
    shortName: string
    tla: string
    crest: string
  }
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  competition: {
    id: number
    name: string
    code: string
    emblem: string
  }
}

export interface ApiCompetition {
  id: number
  name: string
  code: string
  emblem: string
  area: { id: number; name: string; code: string; flag: string | null }
}

export interface ApiResponse<T> {
  count: number
  filters: Record<string, unknown>
  data: T
}

/**
 * 获取世界杯比赛列表
 * World Cup competition code: 'WC'
 * @param dateFrom 开始日期 YYYY-MM-DD
 * @param dateTo 结束日期 YYYY-MM-DD
 * @param status 状态过滤 SCHEDULED | LIVE | IN_PLAY | FINISHED
 */
export async function fetchWorldCupMatches(
  dateFrom?: string,
  dateTo?: string,
  status?: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'FINISHED'
): Promise<{ matches: ApiMatch[]; count: number }> {
  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (status) params.set('status', status)

  const query = params.toString()
  const url = `${API_BASE}/competitions/WC/matches${query ? `?${query}` : ''}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`API请求失败: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return { matches: data.matches || [], count: data.count || 0 }
}

/**
 * 获取今日比赛
 */
export async function fetchTodayMatches(): Promise<ApiMatch[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const { matches } = await fetchWorldCupMatches(todayStr, tomorrowStr)
  return matches
}

/**
 * 获取近期比赛（前后各7天）
 */
export async function fetchRecentMatches(): Promise<ApiMatch[]> {
  const now = new Date()
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const { matches } = await fetchWorldCupMatches(
    past.toISOString().split('T')[0],
    future.toISOString().split('T')[0]
  )
  return matches
}

/**
 * 获取世界杯小组赛积分榜
 */
export async function fetchStandings() {
  const res = await fetch(`${API_BASE}/competitions/WC/standings`)
  if (!res.ok) throw new Error(`API请求失败: ${res.status}`)
  const data = await res.json()
  return data.standings || []
}

/**
 * 获取世界杯球队列表
 */
export async function fetchTeams() {
  const res = await fetch(`${API_BASE}/competitions/WC/teams`)
  if (!res.ok) throw new Error(`API请求失败: ${res.status}`)
  const data = await res.json()
  return data.teams || []
}

/**
 * 将API比赛数据转换为前端Match格式
 */
export function convertApiMatchToMatch(apiMatch: ApiMatch) {
  const statusMap: Record<string, 'upcoming' | 'live' | 'finished'> = {
    SCHEDULED: 'upcoming',
    TIMED: 'upcoming',
    IN_PLAY: 'live',
    PAUSED: 'live',
    FINISHED: 'finished',
    SUSPENDED: 'live',
    POSTPONED: 'upcoming',
    CANCELLED: 'finished',
  }

  const stageMap: Record<string, 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final'> = {
    'GROUP_STAGE': 'group',
    'LAST_16': 'round16',
    'QUARTER_FINALS': 'quarterfinal',
    'SEMI_FINALS': 'semifinal',
    'FINAL': 'final',
  }

  const homeScore = apiMatch.score?.fullTime?.home
  const awayScore = apiMatch.score?.fullTime?.away
  const isLive = apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED'
  const isFinished = apiMatch.status === 'FINISHED'

  // 从比分推导胜负概率（简化版）
  let winProb = 33, drawProb = 34, loseProb = 33
  if (isFinished && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) { winProb = 100; drawProb = 0; loseProb = 0 }
    else if (homeScore < awayScore) { winProb = 0; drawProb = 0; loseProb = 100 }
    else { winProb = 0; drawProb = 100; loseProb = 0 }
  }

  const date = new Date(apiMatch.utcDate)
  const dateStr = date.toISOString().split('T')[0]
  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  })

  return {
    id: `api-${apiMatch.id}`,
    date: dateStr,
    time: timeStr,
    homeTeam: apiMatch.homeTeam.shortName || apiMatch.homeTeam.name,
    awayTeam: apiMatch.awayTeam.shortName || apiMatch.awayTeam.name,
    homeFlag: apiMatch.homeTeam.crest || '⚽',
    awayFlag: apiMatch.awayTeam.crest || '⚽',
    status: statusMap[apiMatch.status] || 'upcoming',
    stage: stageMap[apiMatch.stage] || 'group',
    homeScore: (isLive || isFinished) ? (homeScore ?? undefined) : undefined,
    awayScore: (isLive || isFinished) ? (awayScore ?? undefined) : undefined,
    winProb,
    drawProb,
    loseProb,
    confidence: 70, // 默认值，实际应由预测引擎计算
    riskLevel: 'medium' as const,
    recommendedPick: '待分析',
    possibleScores: [],
    overUnder: 'neutral' as const,
    keyFactors: [],
    analysis: '',
    matchday: apiMatch.matchday,
    group: apiMatch.group,
    competition: apiMatch.competition?.name || 'World Cup',
  }
}
