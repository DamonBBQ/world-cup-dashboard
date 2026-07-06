import type { VercelRequest, VercelResponse } from '@vercel/node';
import { KNOCKOUT_FIXTURES } from './_world-cup-2026-fallback.js';

/**
 * 标准化比赛数据结构
 */
interface StandardMatch {
  id: string;
  date: string;
  time: string;
  competition: string;
  stage: string;
  homeTeam: { name: string; flag: string };
  awayTeam: { name: string; flag: string };
  homeScore: number | null;
  awayScore: number | null;
  status: 'NOT_STARTED' | 'LIVE' | 'FINISHED';
  elapsed: number | null;
  lastUpdated: string;
  probabilities: { homeWin: number; draw: number; awayWin: number };
  riskLevel: '低风险' | '中风险' | '高风险';
}

type ProviderResult = {
  matches: StandardMatch[];
  error?: string;
  rawCount?: number;
};

const WORLD_CUP_API_FOOTBALL_LEAGUE_ID = Number(process.env.WORLD_CUP_API_FOOTBALL_LEAGUE_ID || '1');
const WORLD_CUP_SEASON = Number(process.env.WORLD_CUP_SEASON || '2026');
const FOOTBALL_DATA_WORLD_CUP_CODE = process.env.FOOTBALL_DATA_WORLD_CUP_CODE || 'WC';

const WORLD_CUP_EXCLUDED_KEYWORDS = [
  'qualification', 'qualifiers', 'qualifier', 'club', 'women',
  'u17', 'u20', 'u21', 'friendly',
];

const TEAM_RATINGS: Record<string, number> = {
  Brazil: 92, Argentina: 90, France: 89, Spain: 87, England: 86,
  Portugal: 85, Germany: 84, Netherlands: 83, Belgium: 82, Italy: 82,
  Croatia: 78, Uruguay: 77, Mexico: 76, Colombia: 76, 'United States': 75,
  USA: 75, Japan: 75, Canada: 74, Nigeria: 74, Morocco: 74,
  Senegal: 73, Egypt: 73, Wales: 73, 'South Korea': 72, Australia: 72,
  'Ivory Coast': 72, 'South Africa': 69, Norway: 76, Austria: 76,
  Switzerland: 79, Denmark: 77, Serbia: 74, Poland: 73, Cameroon: 71,
  Ghana: 72, Ecuador: 70, Tunisia: 70, 'Costa Rica': 70, Mali: 70,
  Paraguay: 71, Iran: 71, 'Saudi Arabia': 68, Qatar: 65,
  'Cape Verde': 62, 'Cape Verde Islands': 62, 'DR Congo': 65, 'Congo DR': 65,
  'Bosnia and Herzegovina': 72, 'Bosnia-Herzegovina': 72,
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
  return !['None', 'TBD', '待定', 'Winner of', 'Loser of'].some(word => name.includes(word));
}

function isStandardWorldCupMatch(match: StandardMatch): boolean {
  const competition = normalizeText(match.competition);
  const stage = normalizeText(match.stage);
  const combined = `${competition} ${stage}`;
  if (!isValidTeamName(match.homeTeam.name) || !isValidTeamName(match.awayTeam.name)) return false;
  if (containsExcludedWorldCupKeyword(combined)) return false;
  return competition.includes('world cup') || competition.includes('fifa world cup');
}

function calculateProbabilities(homeTeam: string, awayTeam: string): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = TEAM_RATINGS[homeTeam] || 70;
  const awayRating = TEAM_RATINGS[awayTeam] || 70;
  const adjustedDiff = homeRating - awayRating + 3;
  const drawRaw = Math.max(18, Math.min(36, 34 - Math.abs(adjustedDiff) * 0.45));
  const nonDraw = 100 - drawRaw;
  const homeShare = 1 / (1 + Math.exp(-adjustedDiff / 8));
  const awayShare = 1 - homeShare;
  let homeWin = Math.round(nonDraw * homeShare);
  let draw = Math.round(drawRaw);
  let awayWin = 100 - homeWin - draw;
  if (awayWin < 0) { awayWin = 0; draw = 100 - homeWin; }
  return { homeWin, draw, awayWin };
}

function adjustProbabilitiesForLiveMatch(
  homeTeam: string, awayTeam: string,
  homeScore: number | null, awayScore: number | null, elapsed: number | null
): { homeWin: number; draw: number; awayWin: number } {
  const baseProb = calculateProbabilities(homeTeam, awayTeam);
  if (homeScore === null || awayScore === null || elapsed === null) return baseProb;
  const scoreDiff = homeScore - awayScore;
  if (elapsed >= 90) {
    if (scoreDiff > 0) return { homeWin: 100, draw: 0, awayWin: 0 };
    if (scoreDiff < 0) return { homeWin: 0, draw: 0, awayWin: 100 };
    return { homeWin: 0, draw: 100, awayWin: 0 };
  }
  let homeWin = baseProb.homeWin, draw = baseProb.draw, awayWin = baseProb.awayWin;
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
  if (total !== 100) draw += 100 - total;
  return { homeWin, draw, awayWin };
}

function getRiskLevel(probabilities: { homeWin: number; draw: number; awayWin: number }): '低风险' | '中风险' | '高风险' {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  if (maxProb >= 60) return '低风险';
  if (maxProb >= 45) return '中风险';
  return '高风险';
}

// ─────────────────────────────────────────────────────────────────────────────
// 北京时间 ↔ UTC 日期转换工具
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将北京时间日期（YYYY-MM-DD）转换为对应的 UTC 日期范围。
 * 北京时间 00:00 ~ 23:59 对应 UTC 前一天 16:00 到当天 15:59。
 * 为保险起见，查询 [utcPrev, utcToday] 两个 UTC 日期。
 */
function beijingDateToUtcRange(beijingDate: string): string[] {
  // 用显式时区字符串，避免 toLocaleString 精度问题
  const startUtc = new Date(`${beijingDate}T00:00:00+08:00`);
  const endUtc = new Date(`${beijingDate}T23:59:59+08:00`);

  return Array.from(new Set([
    startUtc.toISOString().slice(0, 10),
    endUtc.toISOString().slice(0, 10),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// 数据源函数（均接受 UTC 日期列表 + 北京目标日期）
// ─────────────────────────────────────────────────────────────────────────────

function normalizeEspnStatus(statusType: any): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  const name = normalizeText(statusType?.name);
  const state = normalizeText(statusType?.state);
  const completed = Boolean(statusType?.completed);
  if (completed || state === 'post' || name.includes('final') || name.includes('full time')) return 'FINISHED';
  if (state === 'in' || name.includes('in progress') || name.includes('halftime') || name.includes('half')) return 'LIVE';
  return 'NOT_STARTED';
}

function isEspnWorldCupEvent(event: any): boolean {
  const text = [
    event?.league?.name, event?.league?.slug, event?.name, event?.shortName,
  ].map(normalizeText).join(' ');
  return !containsExcludedWorldCupKeyword(text);
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function convertEspnEvent(event: any, beijingTargetDate: string): StandardMatch | null {
  const competitors = event?.competitions?.[0]?.competitors || [];
  if (!Array.isArray(competitors) || competitors.length < 2) return null;
  const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
  const homeTeam = home?.team?.displayName || home?.team?.shortDisplayName || home?.team?.name || '';
  const awayTeam = away?.team?.displayName || away?.team?.shortDisplayName || away?.team?.name || '';
  if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) return null;
  const homeScore = toNullableNumber(home?.score);
  const awayScore = toNullableNumber(away?.score);
  const matchStatus = normalizeEspnStatus(event?.status?.type);
  const eventDate = new Date(event?.date);
  const safeDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;
  const dateStr = safeDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  if (dateStr !== beijingTargetDate) return null; // 关键：北京时间过滤
  const timeStr = safeDate.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  let probabilities;
  if (matchStatus === 'LIVE') {
    probabilities = adjustProbabilitiesForLiveMatch(homeTeam, awayTeam, homeScore, awayScore, null);
  } else if (matchStatus === 'FINISHED' && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
    else if (homeScore < awayScore) probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
    else probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
  } else {
    probabilities = calculateProbabilities(homeTeam, awayTeam);
  }
  return {
    id: `espn-worldcup-${event.id}`,
    date: dateStr, time: timeStr,
    competition: 'FIFA World Cup',
    stage: event?.season?.slug || event?.week?.text || event?.name || 'World Cup',
    homeTeam: { name: homeTeam, flag: home?.team?.logo || '' },
    awayTeam: { name: awayTeam, flag: away?.team?.logo || '' },
    homeScore, awayScore, status: matchStatus, elapsed: null,
    lastUpdated: new Date().toISOString(), probabilities, riskLevel: getRiskLevel(probabilities),
  };
}

async function fetchFromEspnWorldCup(
  utcDates: string[], beijingTargetDate: string
): Promise<ProviderResult> {
  try {
    const results = await Promise.all(
      utcDates.map(async utcDate => {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${utcDate.replace(/-/g, '')}`,
          { headers: { Accept: 'application/json', 'User-Agent': 'world-cup-dashboard/1.0' } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data.events) ? data.events : [];
      })
    );
    const matches = results.flat()
      .filter(isEspnWorldCupEvent)
      .map(e => convertEspnEvent(e, beijingTargetDate))
      .filter((m): m is StandardMatch => Boolean(m))
      .filter(isStandardWorldCupMatch);
    return { matches, rawCount: results.flat().length };
  } catch (error: any) {
    console.error('ESPN error:', error);
    return { matches: [], error: `ESPN: ${error.message}` };
  }
}

function normalizeApiFootballStatus(status: string): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  const s = String(status || '').toUpperCase();
  if (['1H','HT','2H','ET','BT','P','LIVE','INT','SUSP','BREAK'].includes(s)) return 'LIVE';
  if (['FT','AET','PEN','AWARDED'].includes(s)) return 'FINISHED';
  return 'NOT_STARTED';
}

function isApiFootballUnsupportedStatus(status: string): boolean {
  return ['PST', 'CANC', 'ABD', 'WO'].includes(String(status || '').toUpperCase());
}

function isApiFootballWorldCupFixture(fixture: any): boolean {
  const league = fixture?.league;
  const leagueId = Number(league?.id);
  const leagueName = normalizeText(league?.name);
  const leagueCountry = normalizeText(league?.country);
  const season = Number(league?.season);
  if (leagueId === WORLD_CUP_API_FOOTBALL_LEAGUE_ID && season === WORLD_CUP_SEASON) return true;
  const looksLikeWorldCup = leagueName === 'world cup' || leagueName === 'fifa world cup' || leagueName.includes('fifa world cup');
  if (!looksLikeWorldCup || leagueCountry !== 'world' && leagueCountry !== '') return false;
  if (containsExcludedWorldCupKeyword(leagueName)) return false;
  return true;
}

async function fetchFromApiFootball(
  utcDates: string[], beijingTargetDate: string
): Promise<ProviderResult> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return { matches: [], error: 'API_FOOTBALL_KEY 未配置' };
  try {
    const results = await Promise.all(
      utcDates.map(async utcDate => {
        const params = new URLSearchParams({ date: utcDate, league: String(WORLD_CUP_API_FOOTBALL_LEAGUE_ID), season: String(WORLD_CUP_SEASON), timezone: 'Asia/Shanghai' });
        const response = await fetch(
          `https://v3.football.api-sports.io/fixtures?${params.toString()}`,
          { headers: { 'x-apisports-key': apiKey } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.errors && Object.keys(data.errors).length > 0) throw new Error(Object.values(data.errors).filter(Boolean).join('; '));
        return Array.isArray(data.response) ? data.response : [];
      })
    );
    const fixtures = results.flat()
      .filter(isApiFootballWorldCupFixture)
      .filter((f: any) => !isApiFootballUnsupportedStatus(f?.fixture?.status?.short));
    const matches: StandardMatch[] = fixtures
      .map((fixture: any) => {
        const homeTeam = fixture?.teams?.home?.name || '';
        const awayTeam = fixture?.teams?.away?.name || '';
        if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) return null;
        const homeScore = toNullableNumber(fixture?.goals?.home);
        const awayScore = toNullableNumber(fixture?.goals?.away);
        const rawStatus = fixture?.fixture?.status?.short;
        const matchStatus = normalizeApiFootballStatus(rawStatus);
        const elapsed = toNullableNumber(fixture?.fixture?.status?.elapsed);
        let probabilities;
        if (matchStatus === 'LIVE') {
          probabilities = adjustProbabilitiesForLiveMatch(homeTeam, awayTeam, homeScore, awayScore, elapsed);
        } else if (matchStatus === 'FINISHED' && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          else if (awayScore > homeScore) probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          else probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }
        const fixtureDate = String(fixture?.fixture?.date || '');
        // API-FOOTBALL 返回的时间是 UTC，转换为北京时间日期
        const datePart = fixtureDate
          ? new Date(fixtureDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
          : '';
        if (datePart !== beijingTargetDate) return null;
        const timePart = fixtureDate.includes('T') ? fixtureDate.split('T')[1].substring(0, 5) : '';
        return {
          id: `api-football-${fixture.fixture.id}`,
          date: datePart, time: timePart,
          competition: fixture?.league?.name || 'FIFA World Cup',
          stage: fixture?.league?.round || 'World Cup',
          homeTeam: { name: homeTeam, flag: fixture?.teams?.home?.logo || '' },
          awayTeam: { name: awayTeam, flag: fixture?.teams?.away?.logo || '' },
          homeScore, awayScore, status: matchStatus, elapsed,
          lastUpdated: new Date().toISOString(), probabilities, riskLevel: getRiskLevel(probabilities),
        };
      })
      .filter((m): m is StandardMatch => Boolean(m))
      .filter(isStandardWorldCupMatch);
    return { matches, rawCount: results.flat().length };
  } catch (error: any) {
    console.error('API-FOOTBALL error:', error);
    return { matches: [], error: `API-FOOTBALL: ${error.message}` };
  }
}

function isFootballDataWorldCupMatch(match: any): boolean {
  const competitionCode = normalizeText(match?.competition?.code);
  const competitionName = normalizeText(match?.competition?.name);
  if (competitionCode === normalizeText(FOOTBALL_DATA_WORLD_CUP_CODE)) return true;
  const looksLikeWorldCup = competitionName === 'fifa world cup' || competitionName === 'world cup' || competitionName.includes('fifa world cup');
  if (!looksLikeWorldCup) return false;
  if (containsExcludedWorldCupKeyword(competitionName)) return false;
  return true;
}

async function fetchFromFootballData(
  utcDates: string[], beijingTargetDate: string
): Promise<ProviderResult> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) return { matches: [], error: 'FOOTBALL_DATA_KEY 未配置' };
  try {
    const results = await Promise.all(
      utcDates.map(async utcDate => {
        const response = await fetch(
          `https://api.football-data.org/v4/competitions/${FOOTBALL_DATA_WORLD_CUP_CODE}/matches?dateFrom=${utcDate}&dateTo=${utcDate}&season=${WORLD_CUP_SEASON}`,
          { headers: { 'X-Auth-Token': apiKey } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data.matches) ? data.matches : [];
      })
    );
    const rawMatches = results.flat();
    const worldCupMatches = rawMatches.filter(isFootballDataWorldCupMatch);
    const matches: StandardMatch[] = worldCupMatches
      .map((match: any) => {
        const homeTeam = match?.homeTeam?.name || '';
        const awayTeam = match?.awayTeam?.name || '';
        if (!isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) return null;
        const homeScore = toNullableNumber(match?.score?.fullTime?.home);
        const awayScore = toNullableNumber(match?.score?.fullTime?.away);
        const status = String(match?.status || '');
        let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' = 'NOT_STARTED';
        if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') matchStatus = 'LIVE';
        else if (status === 'FINISHED') matchStatus = 'FINISHED';
        const elapsed = toNullableNumber(match?.minute);
        let probabilities;
        if (matchStatus === 'LIVE') {
          probabilities = adjustProbabilitiesForLiveMatch(homeTeam, awayTeam, homeScore, awayScore, elapsed);
        } else if (matchStatus === 'FINISHED' && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) probabilities = { homeWin: 100, draw: 0, awayWin: 0 };
          else if (awayScore > homeScore) probabilities = { homeWin: 0, draw: 0, awayWin: 100 };
          else probabilities = { homeWin: 0, draw: 100, awayWin: 0 };
        } else {
          probabilities = calculateProbabilities(homeTeam, awayTeam);
        }
        const utcDateStr = String(match?.utcDate || '');
        // football-data 返回 UTC，转换为北京时间日期
        const datePart = utcDateStr
          ? new Date(utcDateStr).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
          : '';
        if (datePart !== beijingTargetDate) return null;
        const timePart = utcDateStr.includes('T') ? utcDateStr.split('T')[1].substring(0, 5) : '';
        return {
          id: `football-data-${match.id}`,
          date: datePart, time: timePart,
          competition: match?.competition?.name || 'FIFA World Cup',
          stage: match?.stage || 'World Cup',
          homeTeam: { name: homeTeam, flag: '' },
          awayTeam: { name: awayTeam, flag: '' },
          homeScore, awayScore, status: matchStatus, elapsed,
          lastUpdated: new Date().toISOString(), probabilities, riskLevel: getRiskLevel(probabilities),
        };
      })
      .filter((m): m is StandardMatch => Boolean(m))
      .filter(isStandardWorldCupMatch);
    return { matches, rawCount: rawMatches.length };
  } catch (error: any) {
    console.error('football-data error:', error);
    return { matches: [], error: `football-data: ${error.message}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// static-knockout 兜底数据源（已是北京时间，无需 UTC 转换）
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFromStaticKnockout(beijingDate: string): Promise<ProviderResult> {
  const filtered = KNOCKOUT_FIXTURES.filter(m => m.date === beijingDate);
  const matches: StandardMatch[] = filtered.map(match => {
    const probabilities = calculateProbabilities(match.homeTeam.name, match.awayTeam.name);
    return {
      id: `static-${match.id}`,
      date: match.date,
      time: match.time,
      competition: 'FIFA World Cup',
      stage: match.stage,
      homeTeam: { name: match.homeTeam.name, flag: match.homeTeam.flag },
      awayTeam: { name: match.awayTeam.name, flag: match.awayTeam.flag },
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      elapsed: match.elapsed,
      lastUpdated: new Date().toISOString(),
      probabilities,
      riskLevel: getRiskLevel(probabilities),
    };
  });
  return { matches, rawCount: filtered.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// 缓存控制 & 错误构造
// ─────────────────────────────────────────────────────────────────────────────

function setNoCacheHeaders(res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function buildUnavailableError(errors: string[]): string {
  if (errors.find(e => e.includes('Free plans do not have access'))) {
    return 'API-FOOTBALL 免费套餐暂不支持 2026 世界杯，且备用世界杯数据源暂未返回数据。请稍后刷新或检查备用数据源。';
  }
  if (errors.length > 0) return errors.join('；');
  return '世界杯实时数据暂不可用。可能原因：当天没有世界杯比赛、数据源暂时无数据或接口不可用。';
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  setNoCacheHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ matches: [], dataSource: 'none', lastUpdated: new Date().toISOString(), error: 'Method not allowed' });
  }

  const rawDate = req.query.date;
  if (!rawDate || typeof rawDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return res.status(400).json({ matches: [], dataSource: 'none', lastUpdated: new Date().toISOString(), error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const beijingDate: string = rawDate;
  const utcDates = beijingDateToUtcRange(beijingDate); // [前1 UTC天, 当UTC天]

  const provider = process.env.LIVE_SCORE_PROVIDER || 'espn-worldcup';
  let matches: StandardMatch[] = [];
  let dataSource = 'none';
  let error: string | null = null;
  let espnRawCount = 0, apiFootballRawCount = 0, footballDataRawCount = 0;
  const errors: string[] = [];

  async function tryProvider(name: string): Promise<boolean> {
    let result: ProviderResult;
    if (name === 'espn-worldcup') {
      result = await fetchFromEspnWorldCup(utcDates, beijingDate);
      espnRawCount = result.rawCount || 0;
    } else if (name === 'football-data') {
      result = await fetchFromFootballData(utcDates, beijingDate);
      footballDataRawCount = result.rawCount || 0;
    } else if (name === 'api-football') {
      result = await fetchFromApiFootball(utcDates, beijingDate);
      apiFootballRawCount = result.rawCount || 0;
    } else if (name === 'static-knockout') {
      // static-knockout 已是北京时间，直接传入 beijingDate
      result = await fetchFromStaticKnockout(beijingDate);
    } else {
      return false;
    }
    if (result.error) errors.push(result.error);
    if (result.matches.length > 0) {
      matches = result.matches;
      dataSource = name;
      error = null;
      return true;
    }
    return false;
  }

  try {
    let providerOrder: string[];
    if (provider === 'api-football') {
      providerOrder = ['api-football', 'espn-worldcup', 'football-data', 'static-knockout'];
    } else if (provider === 'football-data') {
      providerOrder = ['football-data', 'espn-worldcup', 'api-football', 'static-knockout'];
    } else {
      // 默认：ESPN World Cup → football-data → API-FOOTBALL → 本地兜底
      providerOrder = ['espn-worldcup', 'football-data', 'api-football', 'static-knockout'];
    }

    for (const name of providerOrder) {
      const ok = await tryProvider(name);
      if (ok) break;
    }

    if (matches.length === 0) {
      dataSource = 'none';
      error = buildUnavailableError(errors);
    }

    return res.status(200).json({
      matches,
      dataSource,
      lastUpdated: new Date().toISOString(),
      error,
      debug: {
        provider,
        providerOrder,
        requestedDate: beijingDate,
        utcDatesQueried: utcDates,
        timezone: 'Asia/Shanghai',
        espnRawCount,
        apiFootballRawCount,
        footballDataRawCount,
        returnedCount: matches.length,
        hasApiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
        hasFootballDataKey: Boolean(process.env.FOOTBALL_DATA_KEY),
        errors,
      },
    });
  } catch (err: any) {
    console.error('API error:', err);
    return res.status(200).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: `世界杯实时数据接口异常: ${err.message}`,
      debug: { provider, requestedDate: beijingDate, returnedCount: 0 },
    });
  }
}
