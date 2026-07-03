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

/**
 * 球队基础评分（用于计算概率）
 */
const TEAM_RATINGS: Record<string, number> = {
  'Brazil': 92, 'Argentina': 90, 'France': 89, 'Spain': 87, 'England': 86,
  'Portugal': 85, 'Germany': 84, 'Netherlands': 83, 'Belgium': 82, 'Italy': 82,
  'Croatia': 78, 'Uruguay': 77, 'Mexico': 76, 'United States': 75, 'Japan': 75,
  'South Korea': 72, 'Morocco': 74, 'Senegal': 73, 'Colombia': 76, 'Ecuador': 70,
  'Switzerland': 79, 'Denmark': 77, 'Austria': 76, 'Poland': 73, 'Serbia': 74,
  'Canada': 74, 'Cameroon': 71, 'Ghana': 72, 'Tunisia': 70, 'Iran': 71,
  'Saudi Arabia': 68, 'Qatar': 65, 'Australia': 72, 'Costa Rica': 70, 'Wales': 73,
  'Algeria': 72, 'Egypt': 73, 'Nigeria': 74, 'Mali': 70,
  'Ivory Coast': 72, 'South Africa': 69, 'Al Ahly': 65, 'Wydad Casablanca': 64,
};

/**
 * 计算胜平负概率（基于球队评分）
 */
function calculateProbabilities(homeTeam: string, awayTeam: string): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = TEAM_RATINGS[homeTeam] || 70;
  const awayRating = TEAM_RATINGS[awayTeam] || 70;
  
  const diff = homeRating - awayRating;
  
  // 逻辑斯蒂函数：将实力差转换为概率
  const homeWinProb = 50 + diff * 0.8;
  const awayWinProb = 50 - diff * 0.8;
  const drawProb = 100 - homeWinProb - awayWinProb;
  
  // 确保概率在合理范围内
  const normalizedHome = Math.max(20, Math.min(70, homeWinProb));
  const normalizedAway = Math.max(20, Math.min(70, awayWinProb));
  const normalizedDraw = Math.max(10, 100 - normalizedHome - normalizedAway);
  
  // 归一化
  const total = normalizedHome + normalizedDraw + normalizedAway;
  
  return {
    homeWin: Math.round((normalizedHome / total) * 100),
    draw: Math.round((normalizedDraw / total) * 100),
    awayWin: Math.round((normalizedAway / total) * 100),
  };
}

/**
 * 根据实时比分和比赛时间调整概率
 */
function adjustProbabilitiesForLiveMatch(
  homeScore: number,
  awayScore: number,
  elapsed: number,
  homeRating: number,
  awayRating: number
): { homeWin: number; draw: number; awayWin: number } {
  // 基础概率（基于球队实力）
  const baseProb = calculateProbabilities(
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === homeRating) || '',
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === awayRating) || ''
  );
  
  // 根据比分调整
  const scoreDiff = homeScore - awayScore;
  
  if (elapsed < 45) {
    // 上半场：比分影响较小
    if (scoreDiff > 0) {
      return {
        homeWin: Math.min(85, baseProb.homeWin + 15),
        draw: Math.max(10, baseProb.draw - 5),
        awayWin: Math.max(5, baseProb.awayWin - 10),
      };
    } else if (scoreDiff < 0) {
      return {
        homeWin: Math.max(5, baseProb.homeWin - 10),
        draw: Math.max(10, baseProb.draw - 5),
        awayWin: Math.min(85, baseProb.awayWin + 15),
      };
    }
  } else if (elapsed < 90) {
    // 下半场：比分影响较大
    if (scoreDiff > 0) {
      return {
        homeWin: Math.min(90, baseProb.homeWin + 25),
        draw: Math.max(5, baseProb.draw - 10),
        awayWin: Math.max(2, baseProb.awayWin - 15),
      };
    } else if (scoreDiff < 0) {
      return {
        homeWin: Math.max(2, baseProb.homeWin - 15),
        draw: Math.max(5, baseProb.draw - 10),
        awayWin: Math.min(90, baseProb.awayWin + 25),
      };
    }
  } else {
    // 补时或结束后：比分影响最大
    if (scoreDiff > 0) {
      return {
        homeWin: 100,
        draw: 0,
        awayWin: 0,
      };
    } else if (scoreDiff < 0) {
      return {
        homeWin: 0,
        draw: 0,
        awayWin: 100,
      };
    } else {
      return {
        homeWin: 0,
        draw: 100,
        awayWin: 0,
      };
    }
  }
  
  return baseProb;
}

/**
 * 判断风险等级
 */
function getRiskLevel(probabilities: { homeWin: number; draw: number; awayWin: number }): '低风险' | '中风险' | '高风险' {
  const maxProb = Math.max(probabilities.homeWin, probabilities.draw, probabilities.awayWin);
  if (maxProb >= 60) return '低风险';
  if (maxProb >= 45) return '中风险';
  return '高风险';
}

/**
 * 从 API-FOOTBALL 获取数据
 */
async function fetchFromApiFootball(date: string): Promise<StandardMatch[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    console.warn('API_FOOTBALL_KEY not configured');
    return [];
  }
  
  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      {
        headers: {
          'x-apisports-key': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API-FOOTBALL error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      throw new Error(`API-FOOTBALL errors: ${JSON.stringify(data.errors)}`);
    }
    
    return (data.response || []).map((fixture: any) => {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      const status = fixture.fixture.status.short;
      
      let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' = 'NOT_STARTED';
      if (status === '1H' || status === '2H' || status === 'LIVE') {
        matchStatus = 'LIVE';
      } else if (status === 'FT' || status === 'AET' || status === 'PEN') {
        matchStatus = 'FINISHED';
      }
      
      const elapsed = fixture.fixture.status.elapsed || null;
      
      let probabilities;
      if (matchStatus === 'LIVE') {
        probabilities = adjustProbabilitiesForLiveMatch(
          homeScore || 0,
          awayScore || 0,
          elapsed || 0,
          TEAM_RATINGS[homeTeam] || 70,
          TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
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
        id: `api-football-${fixture.fixture.id}`,
        date: fixture.fixture.date.split('T')[0],
        time: fixture.fixture.date.split('T')[1].substring(0, 5),
        competition: fixture.league.name,
        stage: fixture.league.round || 'Regular Season',
        homeTeam: {
          name: homeTeam,
          flag: fixture.teams.home.flag || '',
        },
        awayTeam: {
          name: awayTeam,
          flag: fixture.teams.away.flag || '',
        },
        homeScore,
        awayScore,
        status: matchStatus,
        elapsed,
        lastUpdated: new Date().toISOString(),
        probabilities,
        riskLevel: getRiskLevel(probabilities),
      };
    });
  } catch (error) {
    console.error('Error fetching from API-FOOTBALL:', error);
    return [];
  }
}

/**
 * 从 football-data.org 获取数据
 */
async function fetchFromFootballData(date: string): Promise<StandardMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  
  if (!apiKey) {
    console.warn('FOOTBALL_DATA_KEY not configured');
    return [];
  }
  
  try {
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`,
      {
        headers: {
          'X-Auth-Token': apiKey,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`football-data.org error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.matches || []).map((match: any) => {
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      const status = match.status;
      
      let matchStatus: 'NOT_STARTED' | 'LIVE' | 'FINISHED' = 'NOT_STARTED';
      if (status === 'IN_PLAY' || status === 'PAUSED') {
        matchStatus = 'LIVE';
      } else if (status === 'FINISHED') {
        matchStatus = 'FINISHED';
      }
      
      const elapsed = match.minute || null;
      
      let probabilities;
      if (matchStatus === 'LIVE') {
        probabilities = adjustProbabilitiesForLiveMatch(
          homeScore || 0,
          awayScore || 0,
          elapsed || 0,
          TEAM_RATINGS[homeTeam] || 70,
          TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
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
        id: `football-data-${match.id}`,
        date: match.utcDate.split('T')[0],
        time: match.utcDate.split('T')[1].substring(0, 5),
        competition: match.competition.name,
        stage: match.stage || 'Regular Season',
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
    });
  } catch (error) {
    console.error('Error fetching from football-data.org:', error);
    return [];
  }
}

/**
 * 生成 mock 数据（用于 fallback）
 */
function generateMockData(date: string): StandardMatch[] {
  const mockMatches: StandardMatch[] = [
    {
      id: 'mock-1',
      date,
      time: '18:00',
      competition: 'FIFA World Cup',
      stage: 'Group Stage',
      homeTeam: { name: 'Brazil', flag: '' },
      awayTeam: { name: 'Argentina', flag: '' },
      homeScore: null,
      awayScore: null,
      status: 'NOT_STARTED',
      elapsed: null,
      lastUpdated: new Date().toISOString(),
      probabilities: calculateProbabilities('Brazil', 'Argentina'),
      riskLevel: '中风险',
    },
    {
      id: 'mock-2',
      date,
      time: '20:00',
      competition: 'FIFA World Cup',
      stage: 'Group Stage',
      homeTeam: { name: 'France', flag: '' },
      awayTeam: { name: 'Spain', flag: '' },
      homeScore: null,
      awayScore: null,
      status: 'NOT_STARTED',
      elapsed: null,
      lastUpdated: new Date().toISOString(),
      probabilities: calculateProbabilities('France', 'Spain'),
      riskLevel: '高风险',
    },
  ];
  
  return mockMatches;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 头
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
  
  // 验证日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  try {
    let matches: StandardMatch[] = [];
    let dataSource = 'none';
    let error = null;
    
    // 根据环境变量选择数据源
    const provider = process.env.LIVE_SCORE_PROVIDER || 'api-football';
    
    if (provider === 'api-football') {
      matches = await fetchFromApiFootball(date);
      if (matches.length > 0) {
        dataSource = 'api-football';
      } else {
        // 尝试备用数据源
        matches = await fetchFromFootballData(date);
        if (matches.length > 0) {
          dataSource = 'football-data';
        }
      }
    } else if (provider === 'football-data') {
      matches = await fetchFromFootballData(date);
      if (matches.length > 0) {
        dataSource = 'football-data';
      } else {
        // 尝试备用数据源
        matches = await fetchFromApiFootball(date);
        if (matches.length > 0) {
          dataSource = 'api-football';
        }
      }
    }
    
    // 如果所有数据源都失败，使用 mock 数据
    if (matches.length === 0) {
      matches = generateMockData(date);
      dataSource = 'mock';
      error = 'All data sources failed, using mock data';
    }
    
    // 设置缓存头
    const hasLiveMatches = matches.some(m => m.status === 'LIVE');
    
    if (hasLiveMatches) {
      // 有进行中比赛：不缓存
      res.setHeader('Cache-Control', 'no-store');
    } else {
      // 无进行中比赛：缓存 60 秒
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    }
    
    return res.status(200).json({
      matches,
      dataSource,
      lastUpdated: new Date().toISOString(),
      error,
    });
  } catch (error: any) {
    console.error('API error:', error);
    
    // 返回 mock 数据作为 fallback
    const matches = generateMockData(date);
    
    return res.status(200).json({
      matches,
      dataSource: 'mock',
      lastUpdated: new Date().toISOString(),
      error: error.message || 'Internal server error',
    });
  }
}
