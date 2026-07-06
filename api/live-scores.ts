import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 标准化比赛数据结构
 */
interface StandardMatch {
  id: string;
  date: string;
  time: string;
  competition: string;
  stage: string;
  homeTeam: {
    name: string;
    flag: string;
  };
  awayTeam: {
    name: string;
    flag: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: 'NOT_STARTED' | 'LIVE' | 'FINISHED';
  elapsed: number | null;
  lastUpdated: string;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  riskLevel: '低风险' | '中风险' | '高风险';
}

// ═══════════════════════════════════════════════════════════════════════════
// 一、世界杯配置常量
// ═══════════════════════════════════════════════════════════════════════════

const WORLD_CUP_API_FOOTBALL_LEAGUE_ID = Number(
  process.env.WORLD_CUP_API_FOOTBALL_LEAGUE_ID || '1'
);

const WORLD_CUP_SEASON = Number(
  process.env.WORLD_CUP_SEASON || '2026'
);

const FOOTBALL_DATA_WORLD_CUP_CODE =
  process.env.FOOTBALL_DATA_WORLD_CUP_CODE || 'WC';

const WORLD_CUP_ALLOWED_NAMES = [
  'world cup',
  'fifa world cup',
  'fifa world cup 2026',
];

const WORLD_CUP_EXCLUDED_KEYWORDS = [
  'qualification',
  'qualifiers',
  'qualifier',
  'club',
  'women',
  'u17',
  'u20',
  'u21',
  'friendly',
];

// ═══════════════════════════════════════════════════════════════════════════
// 二、世界杯判断函数
// ═══════════════════════════════════════════════════════════════════════════

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function containsExcludedWorldCupKeyword(value: unknown): boolean {
  const text = normalizeText(value);
  return WORLD_CUP_EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * API-FOOTBALL 世界杯判断（三层过滤）
 */
function isApiFootballWorldCupFixture(fixture: any): boolean {
  const league = fixture?.league;
  const leagueId = Number(league?.id);
  const leagueName = normalizeText(league?.name);
  const leagueCountry = normalizeText(league?.country);
  const season = Number(league?.season);

  // 第一优先级：API-FOOTBALL 的世界杯 league id + season 精准过滤
  if (
    leagueId === WORLD_CUP_API_FOOTBALL_LEAGUE_ID &&
    season === WORLD_CUP_SEASON
  ) {
    return true;
  }

  // 第二层兜底：名称判断（仅限 World Area，即 country === 'world' 或空）
  const looksLikeWorldCup =
    WORLD_CUP_ALLOWED_NAMES.includes(leagueName) ||
    leagueName === 'world cup';

  const isWorldArea = leagueCountry === 'world' || leagueCountry === '';

  if (!looksLikeWorldCup || !isWorldArea) {
    return false;
  }

  // 第三层：排除世俱杯、预选赛、女足、青年赛等
  if (containsExcludedWorldCupKeyword(leagueName)) {
    return false;
  }

  return true;
}

/**
 * football-data.org 世界杯判断
 */
function isFootballDataWorldCupMatch(match: any): boolean {
  const competitionCode = normalizeText(match?.competition?.code);
  const competitionName = normalizeText(match?.competition?.name);
  const competitionId = String(match?.competition?.id || '');

  // football-data.org 通常用 WC 表示 FIFA World Cup
  if (competitionCode === normalizeText(FOOTBALL_DATA_WORLD_CUP_CODE)) {
    return true;
  }

  // 名称兜底，但排除其他"World Cup"衍生赛事
  const looksLikeWorldCup =
    competitionName === 'fifa world cup' ||
    competitionName === 'world cup' ||
    competitionName.includes('fifa world cup');

  if (!looksLikeWorldCup) {
    return false;
  }

  // 排除非成人男足世界杯
  if (containsExcludedWorldCupKeyword(competitionName)) {
    return false;
  }

  return Boolean(competitionId || competitionName);
}

/**
 * StandardMatch 世界杯判断（最终过滤层）
 */
function isStandardWorldCupMatch(match: StandardMatch): boolean {
  const competition = normalizeText(match.competition);
  if (!competition.includes('world cup')) return false;
  if (containsExcludedWorldCupKeyword(competition)) return false;
  return true;
}

/**
 * API-FOOTBALL 不支持的比赛状态
 */
function isApiFootballUnsupportedStatus(status: string): boolean {
  const s = String(status || '').toUpperCase();
  return [
    'PST', // Postponed 推迟
    'CANC', // Cancelled 取消
    'ABD', // Abandoned 腰斩
    'WO', // Walkover 判负
  ].includes(s);
}

// ═══════════════════════════════════════════════════════════════════════════
// 三、球队评分（用于计算概率）
// ═══════════════════════════════════════════════════════════════════════════

const TEAM_RATINGS: Record<string, number> = {
  'Brazil': 92, 'Argentina': 90, 'France': 89, 'Spain': 87, 'England': 86,
  'Portugal': 85, 'Germany': 84, 'Netherlands': 83, 'Belgium': 82, 'Italy': 82,
  'Croatia': 78, 'Uruguay': 77, 'Mexico': 76, 'United States': 75, 'Japan': 75,
  'South Korea': 72, 'Morocco': 74, 'Senegal': 73, 'Colombia': 76, 'Ecuador': 70,
  'Switzerland': 79, 'Denmark': 77, 'Austria': 76, 'Poland': 73, 'Serbia': 74,
  'Canada': 74, 'Cameroon': 71, 'Ghana': 72, 'Tunisia': 70, 'Iran': 71,
  'Saudi Arabia': 68, 'Qatar': 65, 'Australia': 72, 'Costa Rica': 70, 'Wales': 73,
  'Algeria': 72, 'Egypt': 73, 'Nigeria': 74, 'Mali': 70,
  'Ivory Coast': 72, 'South Africa': 69,
};

// ═══════════════════════════════════════════════════════════════════════════
// 四、概率计算
// ═══════════════════════════════════════════════════════════════════════════

function calculateProbabilities(homeTeam: string, awayTeam: string): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = TEAM_RATINGS[homeTeam] || 70;
  const awayRating = TEAM_RATINGS[awayTeam] || 70;
  
  const ratingDiff = homeRating - awayRating;
  const expFactor = Math.exp(-ratingDiff * 0.06);
  const homeWinProb = 100 / (1 + expFactor);
  const awayWinProb = 100 - homeWinProb;
  
  const closenessFactor = 1 - Math.min(Math.abs(ratingDiff) / 50, 1);
  const baseDrawProb = 20 + closenessFactor * 20;
  
  let total = homeWinProb + awayWinProb + baseDrawProb;
  let homeWin = Math.round((homeWinProb / total) * 100);
  let awayWin = Math.round((awayWinProb / total) * 100);
  let draw = 100 - homeWin - awayWin;
  
  homeWin = Math.max(5, homeWin);
  awayWin = Math.max(5, awayWin);
  draw = Math.max(0, 100 - homeWin - awayWin);
  
  total = homeWin + draw + awayWin;
  if (total !== 100) {
    if (homeWin >= awayWin && homeWin >= draw) {
      homeWin = 100 - draw - awayWin;
    } else if (awayWin >= homeWin && awayWin >= draw) {
      awayWin = 100 - homeWin - draw;
    } else {
      draw = 100 - homeWin - awayWin;
    }
  }
  
  return { homeWin, draw, awayWin };
}

function adjustProbabilitiesForLiveMatch(
  homeScore: number | null,
  awayScore: number | null,
  elapsed: number | null,
  homeRating: number,
  awayRating: number
): { homeWin: number; draw: number; awayWin: number } {
  const baseProb = calculateProbabilities(
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === homeRating) || '',
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === awayRating) || ''
  );
  
  if (homeScore === null || awayScore === null || elapsed === null) {
    return baseProb;
  }
  
  const scoreDiff = homeScore - awayScore;
  const mins = elapsed;
  
  if (mins < 45) {
    if (scoreDiff > 0) {
      return { homeWin: Math.min(90, baseProb.homeWin + 15), draw: Math.max(5, baseProb.draw - 5), awayWin: Math.max(5, baseProb.awayWin - 10) };
    } else if (scoreDiff < 0) {
      return { homeWin: Math.max(5, baseProb.homeWin - 10), draw: Math.max(5, baseProb.draw - 5), awayWin: Math.min(90, baseProb.awayWin + 15) };
    }
  } else if (mins < 90) {
    if (scoreDiff > 0) {
      return { homeWin: Math.min(95, baseProb.homeWin + 25), draw: Math.max(3, baseProb.draw - 8), awayWin: Math.max(2, baseProb.awayWin - 15) };
    } else if (scoreDiff < 0) {
      return { homeWin: Math.max(2, baseProb.homeWin - 15), draw: Math.max(3, baseProb.draw - 8), awayWin: Math.min(95, baseProb.awayWin + 25) };
    }
  } else {
    if (scoreDiff > 0) return { homeWin: 100, draw: 0, awayWin: 0 };
    else if (scoreDiff < 0) return { homeWin: 0, draw: 0, awayWin: 100 };
    else return { homeWin: 0, draw: 100, awayWin: 0 };
  }
  
  return baseProb;
}

function getRiskLevel(probabilities: { homeWin: number; draw: number; awayWin: number }): '低风险' | '中风险' | '高风险' {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  if (maxProb >= 60) return '低风险';
  if (maxProb >= 45) return '中风险';
  return '高风险';
}

// ═══════════════════════════════════════════════════════════════════════════
// 五、状态标准化
// ═══════════════════════════════════════════════════════════════════════════

function normalizeApiFootballStatus(status: string): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP', 'BREAK'];
  if (liveStatuses.includes(status)) return 'LIVE';
  
  const finishedStatuses = ['FT', 'AET', 'PEN', 'AWARDED'];
  if (finishedStatuses.includes(status)) return 'FINISHED';
  
  return 'NOT_STARTED';
}

// ═══════════════════════════════════════════════════════════════════════════
// 六、API-FOOTBALL 数据获取（仅限世界杯）
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromApiFootball(date: string): Promise<{ matches: StandardMatch[]; error?: string }> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    return { matches: [], error: 'API_FOOTBALL_KEY 环境变量未配置' };
  }
  
  try {
    // 修改：添加 league + season 参数，只拉世界杯
    const params = new URLSearchParams({
      date,
      league: String(WORLD_CUP_API_FOOTBALL_LEAGUE_ID),
      season: String(WORLD_CUP_SEASON),
      timezone: 'Asia/Shanghai',
    });
    
    const url = `https://v3.football.api-sports.io/fixtures?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });
    
    if (!response.ok) {
      return { matches: [], error: `API-FOOTBALL 请求失败: HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errorMsg = Object.values(data.errors).filter(Boolean).join('; ');
      return { matches: [], error: `API-FOOTBALL 错误: ${errorMsg}` };
    }
    
    const allFixtures = data.response || [];
    
    // 第一层：世界杯判断过滤
    const fixtures = allFixtures.filter(isApiFootballWorldCupFixture);
    
    // 第二层：排除不支持的状态（推迟、取消等）
    const validFixtures = fixtures.filter(
      (fixture: any) => !isApiFootballUnsupportedStatus(fixture?.fixture?.status?.short)
    );
    
    const matches: StandardMatch[] = validFixtures.map((fixture: any) => {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      const rawStatus = fixture.fixture.status.short;
      const matchStatus = normalizeApiFootballStatus(rawStatus);
      const elapsed = fixture.fixture.status.elapsed || null;
      
      let probabilities;
      if (matchStatus === 'LIVE') {
        probabilities = adjustProbabilitiesForLiveMatch(
          homeScore, awayScore, elapsed,
          TEAM_RATINGS[homeTeam] || 70, TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
        if (homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          else if (homeScore < awayScore) probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          else probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }
      } else {
        probabilities = calculateProbabilities(homeTeam, awayTeam);
      }
      
      return {
        id: `api-football-${fixture.fixture.id}`,
        date: fixture.fixture.date.split('T')[0],
        time: fixture.fixture.date.split('T')[1].substring(0, 5),
        competition: fixture.league.name,
        stage: fixture.league.round || 'Regular Season',
        homeTeam: { name: homeTeam, flag: fixture.teams.home.flag || '' },
        awayTeam: { name: awayTeam, flag: fixture.teams.away.flag || '' },
        homeScore,
        awayScore,
        status: matchStatus,
        elapsed,
        lastUpdated: new Date().toISOString(),
        probabilities,
        riskLevel: getRiskLevel(probabilities),
      };
    });
    
    return { matches };
  } catch (error: any) {
    console.error('Error fetching from API-FOOTBALL:', error);
    return { matches: [], error: `API-FOOTBALL 请求异常: ${error.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 七、football-data.org 数据获取（仅限世界杯）
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromFootballData(date: string): Promise<{ matches: StandardMatch[]; error?: string }> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  
  if (!apiKey) {
    return { matches: [], error: 'FOOTBALL_DATA_KEY 环境变量未配置' };
  }
  
  try {
    // 修改：使用 competition 子资源，只拉世界杯
    const url = `https://api.football-data.org/v4/competitions/${FOOTBALL_DATA_WORLD_CUP_CODE}/matches?dateFrom=${date}&dateTo=${date}&season=${WORLD_CUP_SEASON}`;
    
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
    });
    
    if (!response.ok) {
      return { matches: [], error: `football-data.org 请求失败: HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    const rawMatches = data.matches || [];
    // 第一层：世界杯判断过滤
    const worldCupMatches = rawMatches.filter(isFootballDataWorldCupMatch);
    
    const matches: StandardMatch[] = worldCupMatches.map((match: any) => {
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;
      const homeScore = match.score?.fullTime?.home;
      const awayScore = match.score?.fullTime?.away;
      const status = match.status;
      
      let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' = 'NOT_STARTED';
      if (status === 'IN_PLAY' || status === 'PAUSED') matchStatus = 'LIVE';
      else if (status === 'FINISHED') matchStatus = 'FINISHED';
      
      const elapsed = match.minute || null;
      
      let probabilities;
      if (matchStatus === 'LIVE') {
        probabilities = adjustProbabilitiesForLiveMatch(
          homeScore, awayScore, elapsed,
          TEAM_RATINGS[homeTeam] || 70, TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
        if (homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          else if (homeScore < awayScore) probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          else probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }
      } else {
        probabilities = calculateProbabilities(homeTeam, awayTeam);
      }
      
      return {
        id: `football-data-${match.id}`,
        date: match.utcDate.split('T')[0],
        time: match.utcDate.split('T')[1].substring(0, 5),
        competition: match.competition.name,
        stage: match.stage || 'Regular Season',
        homeTeam: { name: homeTeam, flag: '' },
        awayTeam: { name: awayTeam, flag: '' },
        homeScore,
        awayScore,
        status: matchStatus,
        elapsed,
        lastUpdated: new Date().toISOString(),
        probabilities,
        riskLevel: getRiskLevel(probabilities),
      };
    });
    
    return { matches };
  } catch (error: any) {
    console.error('Error fetching from football-data.org:', error);
    return { matches: [], error: `football-data.org 请求异常: ${error.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 八、缓存控制
// ═══════════════════════════════════════════════════════════════════════════

function setNoCacheHeaders(res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// ═══════════════════════════════════════════════════════════════════════════
// 九、HTTP Handler
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { date } = req.query;
  
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Missing date parameter' });
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  try {
    let matches: StandardMatch[] = [];
    let dataSource = 'none';
    let error: string | null = null;
    let apiFootballCount = 0;
    let footballDataCount = 0;
    let removedNonWorldCupCount = 0;
    
    const provider = process.env.LIVE_SCORE_PROVIDER || 'api-football';
    
    if (provider === 'api-football') {
      const result = await fetchFromApiFootball(date);
      if (result.matches.length > 0) {
        matches = result.matches;
        dataSource = 'api-football';
        apiFootballCount = result.matches.length;
      } else if (result.error) {
        error = result.error;
      }
      
      if (matches.length === 0 && process.env.FOOTBALL_DATA_KEY) {
        const backupResult = await fetchFromFootballData(date);
        if (backupResult.matches.length > 0) {
          matches = backupResult.matches;
          dataSource = 'football-data';
          footballDataCount = backupResult.matches.length;
          error = null;
        }
      }
    } else if (provider === 'football-data') {
      const result = await fetchFromFootballData(date);
      if (result.matches.length > 0) {
        matches = result.matches;
        dataSource = 'football-data';
        footballDataCount = result.matches.length;
      } else if (result.error) {
        error = result.error;
      }
      
      if (matches.length === 0 && process.env.API_FOOTBALL_KEY) {
        const backupResult = await fetchFromApiFootball(date);
        if (backupResult.matches.length > 0) {
          matches = backupResult.matches;
          dataSource = 'api-football';
          apiFootballCount = backupResult.matches.length;
          error = null;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 十、最终世界杯过滤（第三层保险）
    // ═══════════════════════════════════════════════════════════════════════
    const beforeWorldCupFilterCount = matches.length;
    matches = matches.filter(isStandardWorldCupMatch);
    removedNonWorldCupCount = beforeWorldCupFilterCount - matches.length;
    
    if (matches.length === 0) {
      if (beforeWorldCupFilterCount > 0) {
        error = `真实数据源返回了 ${beforeWorldCupFilterCount} 场比赛，但都不是 FIFA World Cup，已全部过滤。`;
      } else if (!error) {
        error = '世界杯真实数据源未返回比赛。可能原因：当天没有世界杯比赛、API Key 权限不足、league/season 配置不正确。';
      }
      dataSource = 'none';
    }
    
    setNoCacheHeaders(res);
    
    const isDev = process.env.NODE_ENV === 'development';
    const debug = isDev ? {
      provider,
      requestedDate: date,
      timezone: 'Asia/Shanghai',
      worldCupLeagueId: WORLD_CUP_API_FOOTBALL_LEAGUE_ID,
      worldCupSeason: WORLD_CUP_SEASON,
      footballDataWorldCupCode: FOOTBALL_DATA_WORLD_CUP_CODE,
      apiFootballCount,
      footballDataCount,
      removedNonWorldCupCount,
      returnedCount: matches.length,
      hasApiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
      hasFootballDataKey: Boolean(process.env.FOOTBALL_DATA_KEY),
    } : {
      provider,
      requestedDate: date,
      worldCupLeagueId: WORLD_CUP_API_FOOTBALL_LEAGUE_ID,
      worldCupSeason: WORLD_CUP_SEASON,
      removedNonWorldCupCount,
      returnedCount: matches.length,
      hasApiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
      hasFootballDataKey: Boolean(process.env.FOOTBALL_DATA_KEY),
    };
    
    return res.status(200).json({
      matches,
      dataSource,
      lastUpdated: new Date().toISOString(),
      error,
      debug,
    });
  } catch (error: any) {
    console.error('API error:', error);
    setNoCacheHeaders(res);
    return res.status(200).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: `实时数据接口异常: ${error.message}`,
    });
  }
}
