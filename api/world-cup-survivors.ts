import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SurvivorTeam {
  name: string;
  flag: string;
  abbreviation?: string;
  lastMatchId?: string;
  lastMatchStatus?: 'NOT_STARTED' | 'LIVE' | 'FINISHED';
  source: 'espn-worldcup';
}

interface MatchEvent {
  id: string;
  date: string;
  status: 'NOT_STARTED' | 'LIVE' | 'FINISHED';
  homeTeam: SurvivorTeam;
  awayTeam: SurvivorTeam;
  homeScore: number | null;
  awayScore: number | null;
  winnerName: string | null;
  loserName: string | null;
}

// 从世界杯开幕日（小�组赛第一天）开始，确保淘汰推断有完整数据
const WORLD_CUP_KNOCKOUT_START =
  process.env.WORLD_CUP_KNOCKOUT_START || '2026-06-11';

const WORLD_CUP_FINAL_DATE =
  process.env.WORLD_CUP_FINAL_DATE || '2026-07-19';

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

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeTeamName(value: unknown): string {
  const name = String(value || '').trim();

  const aliasMap: Record<string, string> = {
    USA: 'United States',
    'U.S.': 'United States',
    USMNT: 'United States',
    'United States of America': 'United States',
    'Congo DR': 'DR Congo',
    'Congo, DR': 'DR Congo',
    'Democratic Republic of Congo': 'DR Congo',
    'Cape Verde Islands': 'Cape Verde',
    Türkiye: 'Turkey',
  };

  return aliasMap[name] || name;
}

function isInvalidTeamName(value: unknown): boolean {
  const name = String(value || '').trim();

  if (!name) return true;

  const invalidWords = ['TBD', 'None', 'Winner of', 'Loser of', '待定'];

  return invalidWords.some(word => name.includes(word));
}

function containsExcludedKeyword(value: unknown): boolean {
  const text = normalizeText(value);
  return WORLD_CUP_EXCLUDED_KEYWORDS.some(keyword => text.includes(keyword));
}

function normalizeEspnStatus(
  statusType: any
): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
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

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDateForEspn(date: string): string {
  return date.replace(/-/g, '');
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return dates;
  }

  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    dates.push(cursor.toISOString().slice(0, 10));
  }

  return dates;
}

function isEspnWorldCupEvent(event: any): boolean {
  const leagueName = normalizeText(event?.league?.name);
  const leagueSlug = normalizeText(event?.league?.slug);
  const eventName = normalizeText(event?.name);
  const shortName = normalizeText(event?.shortName);

  const text = `${leagueName} ${leagueSlug} ${eventName} ${shortName}`;

  if (containsExcludedKeyword(text)) {
    return false;
  }

  return true;
}

function extractTeam(competitor: any): SurvivorTeam | null {
  const rawName =
    competitor?.team?.displayName ||
    competitor?.team?.shortDisplayName ||
    competitor?.team?.name ||
    '';

  const name = normalizeTeamName(rawName);

  if (isInvalidTeamName(name)) {
    return null;
  }

  return {
    name,
    flag: competitor?.team?.logo || '',
    abbreviation: competitor?.team?.abbreviation || '',
    source: 'espn-worldcup',
  };
}

function convertEspnEvent(event: any): MatchEvent | null {
  if (!isEspnWorldCupEvent(event)) {
    return null;
  }

  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  if (!Array.isArray(competitors) || competitors.length < 2) {
    return null;
  }

  const homeCompetitor =
    competitors.find((c: any) => c.homeAway === 'home') ||
    competitors[0];

  const awayCompetitor =
    competitors.find((c: any) => c.homeAway === 'away') ||
    competitors[1];

  const homeTeam = extractTeam(homeCompetitor);
  const awayTeam = extractTeam(awayCompetitor);

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const homeScore = toNullableNumber(homeCompetitor?.score);
  const awayScore = toNullableNumber(awayCompetitor?.score);
  const status = normalizeEspnStatus(event?.status?.type);

  let winnerName: string | null = null;
  let loserName: string | null = null;

  if (status === 'FINISHED' && event.winnerName && event.loserName) {
    const winnerCompetitor = competitors.find((c: any) => c.winner === true);

    if (winnerCompetitor) {
      const winnerTeam = extractTeam(winnerCompetitor);
      winnerName = winnerTeam?.name || null;

      if (winnerName === homeTeam.name) {
        loserName = awayTeam.name;
      } else if (winnerName === awayTeam.name) {
        loserName = homeTeam.name;
      }
    } else if (
      homeScore !== null &&
      awayScore !== null &&
      homeScore !== awayScore
    ) {
      winnerName = homeScore > awayScore ? homeTeam.name : awayTeam.name;
      loserName = homeScore > awayScore ? awayTeam.name : homeTeam.name;
    }
  }

  return {
    id: String(event?.id || ''),
    date: String(event?.date || ''),
    status,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    winnerName,
    loserName,
  };
}

async function fetchEspnEventsByDate(
  date: string
): Promise<MatchEvent[]> {
  const espnDate = formatDateForEspn(date);
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${espnDate}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'world-cup-dashboard/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN World Cup 请求失败: HTTP ${response.status}`);
  }

  const data = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];

  return events
    .map(convertEspnEvent)
    .filter(
      (event: MatchEvent | null): event is MatchEvent => Boolean(event)
    );
}

function sortEventsChronologically(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();

    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;

    return ta - tb;
  });
}

function computeSurvivors(events: MatchEvent[]): SurvivorTeam[] {
  const activeTeams = new Map<string, SurvivorTeam>();
  const eliminatedTeams = new Set<string>();

  const sortedEvents = sortEventsChronologically(events);

  for (const event of sortedEvents) {
    const participants = [event.homeTeam, event.awayTeam];

    for (const team of participants) {
      if (!eliminatedTeams.has(team.name)) {
        activeTeams.set(team.name, {
          ...team,
          lastMatchId: event.id,
          lastMatchStatus: event.status,
        });
      }
    }

    if (event.status === 'FINISHED' && event.winnerName && event.loserName) {
      eliminatedTeams.add(event.loserName);
      activeTeams.delete(event.loserName);

      const winner =
        event.winnerName === event.homeTeam.name
          ? event.homeTeam
          : event.awayTeam;

      activeTeams.set(event.winnerName, {
        ...winner,
        lastMatchId: event.id,
        lastMatchStatus: event.status,
      });
    }
  }

  return [...activeTeams.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  setNoCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      teams: [],
      error: 'Method not allowed',
      lastUpdated: new Date().toISOString(),
    });
  }

  const rawStartDate = req.query.startDate;
  const rawEndDate = req.query.endDate;

  const startDate: string =
    typeof rawStartDate === 'string' && rawStartDate.length === 10
      ? rawStartDate
      : WORLD_CUP_KNOCKOUT_START;

  const endDate: string =
    typeof rawEndDate === 'string' && rawEndDate.length === 10
      ? rawEndDate
      : WORLD_CUP_FINAL_DATE;

  try {
    const dates = enumerateDates(startDate, endDate);

    const allEventsNested = await Promise.all(
      dates.map(date =>
        fetchEspnEventsByDate(date).catch(error => {
          console.error(
            `[world-cup-survivors] ${date} failed:`,
            error
          );
          return [] as MatchEvent[];
        })
      )
    );

    const events = allEventsNested.flat();
    const teams = computeSurvivors(events);

    if (teams.length === 0) {
      return res.status(200).json({
        teams: [],
        error:
          '剩余球队数据暂不可用：世界杯赛程数据源暂未返回可计算结果。',
        lastUpdated: new Date().toISOString(),
        debug: {
          startDate,
          endDate,
          eventCount: events.length,
          source: 'espn-worldcup',
        },
      });
    }

    return res.status(200).json({
      teams,
      error: null,
      lastUpdated: new Date().toISOString(),
      debug: {
        startDate,
        endDate,
        eventCount: events.length,
        teamCount: teams.length,
        source: 'espn-worldcup',
      },
    });
  } catch (error: any) {
    console.error('[world-cup-survivors] API error:', error);

    return res.status(200).json({
      teams: [],
      error: `剩余球队数据暂不可用：${error.message}`,
      lastUpdated: new Date().toISOString(),
    });
  }
}
