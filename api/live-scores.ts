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

type ProviderResult = {
  matches: StandardMatch[];
  error?: string;
  rawCount?: number;
};

/**
 * 世界杯配置
 *
 * API-FOOTBALL 免费套餐通常无法访问 2026 season，
 * 所以生产默认使用 ESPN World Cup。
 */
const WORLD_CUP_API_FOOTBALL_LEAGUE_ID = Number(
  process.env.WORLD_CUP_API_FOOTBALL_LEAGUE_ID || '1'
);

const WORLD_CUP_SEASON = Number(
  process.env.WORLD_CUP_SEASON || '2026'
);

const FOOTBALL_DATA_WORLD_CUP_CODE =
  process.env.FOOTBALL_DATA_WORLD_CUP_CODE || 'WC';

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

/**
 * 球队基础评分：仅用于算法预测概率，不是事实数据。
 * 事实数据只来自真实数据源。
 */
const TEAM_RATINGS: Record<string, number> = {
  Brazil: 92,
  Argentina: 90,
  France: 89,
  Spain: 87,
  England: 86,
  Portugal: 85,
  Germany: 84,
  Netherlands: 83,
  Belgium: 82,
  Italy: 82,
  Croatia: 78,
  Uruguay: 77,
  Mexico: 76,
  'United States': 75,
  USA: 75,
  Japan: 75,
  'South Korea': 72,
  Morocco: 74,
  Senegal: 73,
  Colombia: 76,
  Ecuador: 70,
  Switzerland: 79,
  Denmark: 77,
  Austria: 76,
  Poland: 73,
  Serbia: 74,
  Canada: 74,
  Cameroon: 71,
  Ghana: 72,
  Tunisia: 70,
  Iran: 71,
  'Saudi Arabia': 68,
  Qatar: 65,
  Australia: 72,
  'Costa Rica': 70,
  Wales: 73,
  Algeria: 72,
  Egypt: 73,
  Nigeria: 74,
  Mali: 70,
  'Ivory Coast': 72,
  'South Africa': 69,
  Norway: 76,
  Paraguay: 71,
  'Cape Verde': 62,
  'Cape Verde Islands': 62,
  'DR Congo': 65,
  'Congo DR': 65,
  'Bosnia and Herzegovina': 72,
  'Bosnia-Herzegovina': 72,
};

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function containsExcludedWorldCupKeyword(value: unknown): boolean {
  const text = normalizeText(value);
  return WORLD_CUP_EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
}

function isValidTeamName(team?: string): boolean {
  const name = String(team || '').trim();
  if (!name) return false;

  const invalid = ['None', 'TBD', '待定', 'Winner of', 'Loser of'];
  return !invalid.some(word => name.includes(word));
}

/**
 * 最终保险：只允许 FIFA World Cup。
 */
function isStandardWorldCupMatch(match: StandardMatch): boolean {
  const competition = normalizeText(match.competition);
  const stage = normalizeText(match.stage);
  const combined = `${competition} ${stage}`;

  if (!isValidTeamName(match.homeTeam.name) || !isValidTeamName(match.awayTeam.name)) {
    return false;
  }

  if (containsExcludedWorldCupKeyword(combined)) {
    return false;
  }

  return competition.includes('world cup') || competition.includes('fifa world cup');
}

/**
 * 胜平负概率：算法预测，不是事实数据。
 */
function calculateProbabilities(homeTeam: string, awayTeam: string): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  const homeRating = TEAM_RATINGS[homeTeam] || 70;
  const awayRating = TEAM_RATINGS[awayTeam] || 70;

  const adjustedDiff = homeRating - awayRating + 3; // 主场优势
  const drawRaw = Math.max(18, Math.min(36, 34 - Math.abs(adjustedDiff) * 0.45));
  const nonDraw = 100 - drawRaw;
  const homeShare = 1 / (1 + Math.exp(-adjustedDiff / 8));
  const awayShare = 1 - homeShare;

  let homeWin = Math.round(nonDraw * homeShare);
  let draw = Math.round(drawRaw);
  let awayWin = 100 - homeWin - draw;

  if (awayWin < 0) {
    awayWin = 0;
    draw = 100 - homeWin;
  }

  return { homeWin, draw, awayWin };
}

function adjustProbabilitiesForLiveMatch(
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
  elapsed: number | null
): {
  homeWin: number;
  draw: number;
  awayWin: number;
} {
  const baseProb = calculateProbabilities(homeTeam, awayTeam);

  if (homeScore === null || awayScore === null || elapsed === null) {
    return baseProb;
  }

  const scoreDiff = homeScore - awayScore;

  if (elapsed >= 90) {
    if (scoreDiff > 0) return { homeWin: 100, draw: 0, awayWin: 0 };
    if (scoreDiff < 0) return { homeWin: 0, draw: 0, awayWin: 100 };
    return { homeWin: 0, draw: 100, awayWin: 0 };
  }

  let homeWin = baseProb.homeWin;
  let draw = baseProb.draw;
  let awayWin = baseProb.awayWin;

  if (scoreDiff > 0) {
    const boost = elapsed >= 60 ? 28 : elapsed >= 45 ? 22 : 15;
    homeWin = Math.min(95, homeWin + boost);
    awayWin = Math.max(2, awayWin - Math.round(boost * 0.65));
    draw = Math.max(3, 100 - homeWin - awayWin);
  } else if (scoreDiff < 0) {
    const boost = elapsed >= 60 ? 28 : elapsed >= 45 ? 22 : 15;
    awayWin = Math.min(95, awayWin + boost);
    homeWin = Math.max(2, homeWin - Math.round(boost * 0.65));
    draw = Math.max(3, 100 - homeWin - awayWin);
  }

  const total = homeWin + draw + awayWin;
  if (total !== 100) {
    draw += 100 - total;
  }

  return { homeWin, draw, awayWin };
}

function getRiskLevel(probabilities: {
  homeWin: number;
  draw: number;
  awayWin: number;
}): '低风险' | '中风险' | '高风险' {
  const maxProb = Math.max(
    probabilities.homeWin,
    probabilities.draw,
    probabilities.awayWin
  );

  if (maxProb >= 60) return '低风险';
  if (maxProb >= 45) return '中风险';
  return '高风险';
}

/**
 * ESPN World Cup 状态转换
 */
function normalizeEspnStatus(statusType: any): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  const name = normalizeText(statusType?.name);
  const state = normalizeText(statusType?.state);
  const completed = Boolean(statusType?.completed);

  if (
    completed ||
    state === 'post' ||
    name.includes('final') ||
    name.includes('full time')
  ) {
    return 'FINISHED';
  }

  if (
    state === 'in' ||
    name.includes('in progress') ||
    name.includes('halftime') ||
    name.includes('half')
  ) {
    return 'LIVE';
  }

  return 'NOT_STARTED';
}

/**
 * ESPN soccer fifa.world 一般已经是世界杯维度，
 * 但这里仍做防御过滤，避免混入其他 World Cup 衍生赛事。
 */
function isEspnWorldCupEvent(event: any): boolean {
  const leagueName = normalizeText(event?.league?.name);
  const leagueSlug = normalizeText(event?.league?.slug);
  const eventName = normalizeText(event?.name);
  const shortName = normalizeText(event?.shortName);

  const text = `${leagueName} ${leagueSlug} ${eventName} ${shortName}`;

  if (containsExcludedWorldCupKeyword(text)) {
    return false;
  }

  return true;
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function convertEspnEventToStandardMatch(event: any): StandardMatch | null {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  if (!Array.isArray(competitors) || competitors.length < 2) {
    return null;
  }

  const home =
    competitors.find((c: any) => c.homeAway === 'home') ||
    competitors[0];

  const away =
    competitors.find((c: any) => c.homeAway === 'away') ||
    competitors[1];

  const homeTeam =
    home?.team?.displayName ||
    home?.team?.shortDisplayName ||
    home?.team?.name ||
    '';

  const awayTeam =
    away?.team?.displayName ||
    away?.team?.shortDisplayName ||
    away?.team?.name ||
    '';

  if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
    return null;
  }

  const homeScore = toNullableNumber(home?.score);
  const awayScore = toNullableNumber(away?.score);
  const matchStatus = normalizeEspnStatus(event?.status?.type);

  const eventDate = new Date(event?.date);
  const safeDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;

  const dateStr = safeDate.toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai',
  });

  const timeStr = safeDate.toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  let probabilities;

  if (matchStatus === 'LIVE') {
    probabilities = adjustProbabilitiesForLiveMatch(
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      null
    );
  } else if (
    matchStatus === 'FINISHED' &&
    homeScore !== null &&
    awayScore !== null
  ) {
    if (homeScore > awayScore) {
      probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
    } else if (homeScore < awayScore) {
      probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
    } else {
      probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
    }
  } else {
    probabilities = calculateProbabilities(homeTeam, awayTeam);
  }

  return {
    id: `espn-worldcup-${event.id}`,
    date: dateStr,
    time: timeStr,
    competition: 'FIFA World Cup',
    stage:
      event?.season?.slug ||
      event?.week?.text ||
      event?.name ||
      'World Cup',
    homeTeam: {
      name: homeTeam,
      flag: home?.team?.logo || '',
    },
    awayTeam: {
      name: awayTeam,
      flag: away?.team?.logo || '',
    },
    homeScore,
    awayScore,
    status: matchStatus,
    elapsed: null,
    lastUpdated: new Date().toISOString(),
    probabilities,
    riskLevel: getRiskLevel(probabilities),
  };
}

/**
 * ESPN World Cup 数据源。
 * 这是 API-FOOTBALL 免费套餐不支持 2026 时的主数据源。
 */
async function fetchFromEspnWorldCup(date: string): Promise<ProviderResult> {
  try {
    const espnDate = date.replace(/-/g, '');
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${espnDate}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'world-cup-dashboard/1.0',
      },
    });

    if (!response.ok) {
      return {
        matches: [],
        error: `ESPN World Cup 请求失败: HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];

    const matches = events
      .filter(isEspnWorldCupEvent)
      .map(convertEspnEventToStandardMatch)
      .filter((match: StandardMatch | null): match is StandardMatch => Boolean(match))
      .filter(isStandardWorldCupMatch);

    return {
      matches,
      rawCount: events.length,
    };
  } catch (error: any) {
    console.error('Error fetching from ESPN World Cup:', error);

    return {
      matches: [],
      error: `ESPN World Cup 请求异常: ${error.message}`,
    };
  }
}

/**
 * API-FOOTBALL 状态标准化
 */
function normalizeApiFootballStatus(status: string): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  const s = String(status || '').toUpperCase();

  const liveStatuses = [
    '1H',
    'HT',
    '2H',
    'ET',
    'BT',
    'P',
    'LIVE',
    'INT',
    'SUSP',
    'BREAK',
  ];

  if (liveStatuses.includes(s)) {
    return 'LIVE';
  }

  const finishedStatuses = ['FT', 'AET', 'PEN', 'AWARDED'];
  if (finishedStatuses.includes(s)) {
    return 'FINISHED';
  }

  return 'NOT_STARTED';
}

function isApiFootballUnsupportedStatus(status: string): boolean {
  const s = String(status || '').toUpperCase();

  return [
    'PST',
    'CANC',
    'ABD',
    'WO',
  ].includes(s);
}

function isApiFootballWorldCupFixture(fixture: any): boolean {
  const league = fixture?.league;
  const leagueId = Number(league?.id);
  const leagueName = normalizeText(league?.name);
  const leagueCountry = normalizeText(league?.country);
  const season = Number(league?.season);

  if (
    leagueId === WORLD_CUP_API_FOOTBALL_LEAGUE_ID &&
    season === WORLD_CUP_SEASON
  ) {
    return true;
  }

  const looksLikeWorldCup =
    leagueName === 'world cup' ||
    leagueName === 'fifa world cup' ||
    leagueName.includes('fifa world cup');

  const isWorldArea = leagueCountry === 'world' || leagueCountry === '';

  if (!looksLikeWorldCup || !isWorldArea) {
    return false;
  }

  if (containsExcludedWorldCupKeyword(leagueName)) {
    return false;
  }

  return true;
}

/**
 * API-FOOTBALL：付费后可用。
 * 免费版 2026 大概率会返回无权限错误。
 */
async function fetchFromApiFootball(date: string): Promise<ProviderResult> {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return {
      matches: [],
      error: 'API_FOOTBALL_KEY 环境变量未配置',
    };
  }

  try {
    const params = new URLSearchParams({
      date,
      league: String(WORLD_CUP_API_FOOTBALL_LEAGUE_ID),
      season: String(WORLD_CUP_SEASON),
      timezone: 'Asia/Shanghai',
    });

    const url =
      `https://v3.football.api-sports.io/fixtures?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    if (!response.ok) {
      return {
        matches: [],
        error: `API-FOOTBALL 请求失败: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      const errorMsg = Object.values(data.errors).filter(Boolean).join('; ');

      return {
        matches: [],
        error: `API-FOOTBALL 错误: ${errorMsg}`,
      };
    }

    const allFixtures = Array.isArray(data.response) ? data.response : [];

    const fixtures = allFixtures
      .filter(isApiFootballWorldCupFixture)
      .filter((fixture: any) => {
        const rawStatus = fixture?.fixture?.status?.short;
        return !isApiFootballUnsupportedStatus(rawStatus);
      });

    const matches: StandardMatch[] = fixtures
      .map((fixture: any) => {
        const homeTeam = fixture?.teams?.home?.name || '';
        const awayTeam = fixture?.teams?.away?.name || '';

        if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
          return null;
        }

        const homeScore = toNullableNumber(fixture?.goals?.home);
        const awayScore = toNullableNumber(fixture?.goals?.away);
        const rawStatus = fixture?.fixture?.status?.short;
        const matchStatus = normalizeApiFootballStatus(rawStatus);
        const elapsed = toNullableNumber(fixture?.fixture?.status?.elapsed);

        let probabilities;

        if (matchStatus === 'LIVE') {
          probabilities = adjustProbabilitiesForLiveMatch(
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            elapsed
          );
        } else if (
          matchStatus === 'FINISHED' &&
          homeScore !== null &&
          awayScore !== null
        ) {
          if (homeScore > awayScore) {
            probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          } else if (homeScore < awayScore) {
            probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          } else {
            probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
          }
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }

        const fixtureDate = String(fixture?.fixture?.date || '');
        const datePart = fixtureDate.split('T')[0] || date;
        const timePart =
          fixtureDate.includes('T')
            ? fixtureDate.split('T')[1].substring(0, 5)
            : '';

        return {
          id: `api-football-${fixture.fixture.id}`,
          date: datePart,
          time: timePart,
          competition: fixture?.league?.name || 'FIFA World Cup',
          stage: fixture?.league?.round || 'World Cup',
          homeTeam: {
            name: homeTeam,
            flag: fixture?.teams?.home?.logo || '',
          },
          awayTeam: {
            name: awayTeam,
            flag: fixture?.teams?.away?.logo || '',
          },
          homeScore,
          awayScore,
          status: matchStatus,
          elapsed,
          lastUpdated: new Date().toISOString(),
          probabilities,
          riskLevel: getRiskLevel(probabilities),
        };
      })
      .filter((match: StandardMatch | null): match is StandardMatch => Boolean(match))
      .filter(isStandardWorldCupMatch);

    return {
      matches,
      rawCount: allFixtures.length,
    };
  } catch (error: any) {
    console.error('Error fetching from API-FOOTBALL:', error);

    return {
      matches: [],
      error: `API-FOOTBALL 请求异常: ${error.message}`,
    };
  }
}

function isFootballDataWorldCupMatch(match: any): boolean {
  const competitionCode = normalizeText(match?.competition?.code);
  const competitionName = normalizeText(match?.competition?.name);

  if (competitionCode === normalizeText(FOOTBALL_DATA_WORLD_CUP_CODE)) {
    return true;
  }

  const looksLikeWorldCup =
    competitionName === 'fifa world cup' ||
    competitionName === 'world cup' ||
    competitionName.includes('fifa world cup');

  if (!looksLikeWorldCup) {
    return false;
  }

  if (containsExcludedWorldCupKeyword(competitionName)) {
    return false;
  }

  return true;
}

/**
 * football-data.org 世界杯备用源。
 */
async function fetchFromFootballData(date: string): Promise<ProviderResult> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;

  if (!apiKey) {
    return {
      matches: [],
      error: 'FOOTBALL_DATA_KEY 环境变量未配置',
    };
  }

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${FOOTBALL_DATA_WORLD_CUP_CODE}/matches?dateFrom=${date}&dateTo=${date}&season=${WORLD_CUP_SEASON}`,
      {
        headers: {
          'X-Auth-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      return {
        matches: [],
        error: `football-data.org 请求失败: HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const rawMatches = Array.isArray(data.matches) ? data.matches : [];

    const worldCupMatches = rawMatches.filter(isFootballDataWorldCupMatch);

    const matches: StandardMatch[] = worldCupMatches
      .map((match: any) => {
        const homeTeam = match?.homeTeam?.name || '';
        const awayTeam = match?.awayTeam?.name || '';

        if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
          return null;
        }

        const homeScore = toNullableNumber(match?.score?.fullTime?.home);
        const awayScore = toNullableNumber(match?.score?.fullTime?.away);
        const status = String(match?.status || '');

        let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' = 'NOT_STARTED';

        if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') {
          matchStatus = 'LIVE';
        } else if (status === 'FINISHED') {
          matchStatus = 'FINISHED';
        }

        const elapsed = toNullableNumber(match?.minute);

        let probabilities;

        if (matchStatus === 'LIVE') {
          probabilities = adjustProbabilitiesForLiveMatch(
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            elapsed
          );
        } else if (
          matchStatus === 'FINISHED' &&
          homeScore !== null &&
          awayScore !== null
        ) {
          if (homeScore > awayScore) {
            probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          } else if (homeScore < awayScore) {
            probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          } else {
            probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
          }
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }

        const utcDate = String(match?.utcDate || '');

        return {
          id: `football-data-${match.id}`,
          date: utcDate.split('T')[0] || date,
          time: utcDate.includes('T') ? utcDate.split('T')[1].substring(0, 5) : '',
          competition: match?.competition?.name || 'FIFA World Cup',
          stage: match?.stage || 'World Cup',
          homeTeam: {
            name: homeTeam,
            flag: '',
          },
          awayTeam: {
            name: awayTeam,
            flag: '',
          },
          homeScore,
          awayScore,
          status: matchStatus,
          elapsed,
          lastUpdated: new Date().toISOString(),
          probabilities,
          riskLevel: getRiskLevel(probabilities),
        };
      })
      .filter((match: StandardMatch | null): match is StandardMatch => Boolean(match))
      .filter(isStandardWorldCupMatch);

    return {
      matches,
      rawCount: rawMatches.length,
    };
  } catch (error: any) {
    console.error('Error fetching from football-data.org:', error);

    return {
      matches: [],
      error: `football-data.org 请求异常: ${error.message}`,
    };
  }
}

/**
 * 禁用缓存：实时数据不能被 Vercel/CDN/浏览器缓存。
 */
function setNoCacheHeaders(res: VercelResponse): void {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function buildUnavailableError(errors: string[]): string {
  const apiFootballPermissionError = errors.find(error =>
    error.includes('Free plans do not have access to this season')
  );

  if (apiFootballPermissionError) {
    return 'API-FOOTBALL 免费套餐暂不支持 2026 世界杯，且备用世界杯数据源暂未返回数据。请稍后刷新或检查备用数据源。';
  }

  if (errors.length > 0) {
    return errors.join('；');
  }

  return '世界杯实时数据暂不可用。可能原因：当天没有世界杯比赛、数据源暂时无数据或接口不可用。';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  setNoCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: 'Missing date parameter',
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: 'Invalid date format. Use YYYY-MM-DD',
    });
  }

  // 强制类型收窄：此时 date 必定是 string
  const queryDate: string = date as string;

  const provider = process.env.LIVE_SCORE_PROVIDER || 'espn-worldcup';

  let matches: StandardMatch[] = [];
  let dataSource = 'none';
  let error: string | null = null;

  let espnRawCount = 0;
  let apiFootballRawCount = 0;
  let footballDataRawCount = 0;
  let removedNonWorldCupCount = 0;

  const errors: string[] = [];

  async function tryProvider(name: string): Promise<boolean> {
    let result: ProviderResult;

    if (name === 'espn-worldcup') {
      result = await fetchFromEspnWorldCup(queryDate);
      espnRawCount = result.rawCount || 0;
    } else if (name === 'football-data') {
      result = await fetchFromFootballData(queryDate);
      footballDataRawCount = result.rawCount || 0;
    } else if (name === 'api-football') {
      result = await fetchFromApiFootball(queryDate);
      apiFootballRawCount = result.rawCount || 0;
    } else {
      return false;
    }

    if (result.error) {
      errors.push(result.error);
    }

    const beforeFilter = result.matches.length;
    const worldCupMatches = result.matches.filter(isStandardWorldCupMatch);
    removedNonWorldCupCount += beforeFilter - worldCupMatches.length;

    if (worldCupMatches.length > 0) {
      matches = worldCupMatches;
      dataSource = name;
      error = null;
      return true;
    }

    return false;
  }

  try {
    let providerOrder: string[];

    if (provider === 'api-football') {
      // API-FOOTBALL 免费版 2026 大概率失败，所以失败后必须自动 fallback。
      providerOrder = ['api-football', 'espn-worldcup', 'football-data'];
    } else if (provider === 'football-data') {
      providerOrder = ['football-data', 'espn-worldcup', 'api-football'];
    } else {
      // 默认：ESPN World Cup 主源，最适合免费阶段。
      providerOrder = ['espn-worldcup', 'football-data', 'api-football'];
    }

    for (const name of providerOrder) {
      const ok = await tryProvider(name);
      if (ok) break;
    }

    if (matches.length === 0) {
      dataSource = 'none';
      error = buildUnavailableError(errors);
    }

    const debug = {
      provider,
      providerOrder,
      requestedDate: queryDate,
      timezone: 'Asia/Shanghai',
      worldCupSeason: WORLD_CUP_SEASON,
      worldCupApiFootballLeagueId: WORLD_CUP_API_FOOTBALL_LEAGUE_ID,
      footballDataWorldCupCode: FOOTBALL_DATA_WORLD_CUP_CODE,
      espnRawCount,
      apiFootballRawCount,
      footballDataRawCount,
      removedNonWorldCupCount,
      returnedCount: matches.length,
      hasApiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
      hasFootballDataKey: Boolean(process.env.FOOTBALL_DATA_KEY),
      errors,
    };

    return res.status(200).json({
      matches,
      dataSource,
      lastUpdated: new Date().toISOString(),
      error,
      debug,
    });
  } catch (err: any) {
    console.error('API error:', err);

    return res.status(200).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: `世界杯实时数据接口异常: ${err.message}`,
      debug: {
        provider,
        requestedDate: date,
        returnedCount: 0,
      },
    });
  }
}
