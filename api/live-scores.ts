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
  'Ivory Coast': 72, 'South Africa': 69,
};

/**
 * 计算胜平负概率（基于球队评分）
 * 使用更合理的三项归一化算法
 */
function calculateProbabilities(homeTeam: string, awayTeam: string): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = TEAM_RATINGS[homeTeam] || 70;
  const awayRating = TEAM_RATINGS[awayTeam] || 70;
  
  // 计算实力差（0-100范围）
  const ratingDiff = homeRating - awayRating;
  
  // 使用逻辑斯蒂函数计算主胜概率（-50 到 +50 的 diff 映射到约 5%-95%）
  const expFactor = Math.exp(-ratingDiff * 0.06); // 约 3 点 rating 差使赔率翻倍
  const homeWinProb = 100 / (1 + expFactor);
  const awayWinProb = 100 - homeWinProb;
  
  // 平局概率：根据实力接近程度计算
  // 实力越接近，平局概率越高；实力差越大，平局概率越低
  const avgRating = (homeRating + awayRating) / 2;
  const closenessFactor = 1 - Math.min(Math.abs(ratingDiff) / 50, 1); // 0-1，越接近 1 平局概率越高
  const baseDrawProb = 20 + closenessFactor * 20; // 20% 到 40% 之间
  
  // 归一化：主胜 + 客胜 + 平局 = 100%
  let total = homeWinProb + awayWinProb + baseDrawProb;
  let homeWin = Math.round((homeWinProb / total) * 100);
  let awayWin = Math.round((awayWinProb / total) * 100);
  let draw = 100 - homeWin - awayWin;
  
  // 确保非负
  homeWin = Math.max(5, homeWin);
  awayWin = Math.max(5, awayWin);
  draw = Math.max(0, 100 - homeWin - awayWin);
  
  // 最终归一化
  total = homeWin + draw + awayWin;
  if (total !== 100) {
    // 微调最大项
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

/**
 * 根据实时比分和比赛时间调整概率
 */
function adjustProbabilitiesForLiveMatch(
  homeScore: number | null,
  awayScore: number | null,
  elapsed: number | null,
  homeRating: number,
  awayRating: number
): { homeWin: number; draw: number; awayWin: number } {
  // 基础概率（基于球队实力）
  const baseProb = calculateProbabilities(
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === homeRating) || '',
    Object.keys(TEAM_RATINGS).find(k => TEAM_RATINGS[k] === awayRating) || ''
  );
  
  // 如果比分是 null，使用基础概率
  if (homeScore === null || awayScore === null || elapsed === null) {
    return baseProb;
  }
  
  // 根据比分调整
  const scoreDiff = homeScore - awayScore;
  const mins = elapsed;
  
  if (mins < 45) {
    // 上半场：比分影响较小
    if (scoreDiff > 0) {
      return {
        homeWin: Math.min(90, baseProb.homeWin + 15),
        draw: Math.max(5, baseProb.draw - 5),
        awayWin: Math.max(5, baseProb.awayWin - 10),
      };
    } else if (scoreDiff < 0) {
      return {
        homeWin: Math.max(5, baseProb.homeWin - 10),
        draw: Math.max(5, baseProb.draw - 5),
        awayWin: Math.min(90, baseProb.awayWin + 15),
      };
    }
  } else if (mins < 90) {
    // 下半场：比分影响较大
    if (scoreDiff > 0) {
      return {
        homeWin: Math.min(95, baseProb.homeWin + 25),
        draw: Math.max(3, baseProb.draw - 8),
        awayWin: Math.max(2, baseProb.awayWin - 15),
      };
    } else if (scoreDiff < 0) {
      return {
        homeWin: Math.max(2, baseProb.homeWin - 15),
        draw: Math.max(3, baseProb.draw - 8),
        awayWin: Math.min(95, baseProb.awayWin + 25),
      };
    }
  } else {
    // 补时或结束后：比分即为结果
    if (scoreDiff > 0) {
      return { homeWin: 100, draw: 0, awayWin: 0 };
    } else if (scoreDiff < 0) {
      return { homeWin: 0, draw: 0, awayWin: 100 };
    } else {
      return { homeWin: 0, draw: 100, awayWin: 0 };
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
 * 标准化 API-FOOTBALL 状态
 */
function normalizeApiFootballStatus(status: string): 'NOT_STARTED' | 'LIVE' | 'FINISHED' {
  // LIVE 状态
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP', 'BREAK'];
  if (liveStatuses.includes(status)) {
    return 'LIVE';
  }
  
  // FINISHED 状态
  const finishedStatuses = ['FT', 'AET', 'PEN', 'AWARDED'];
  if (finishedStatuses.includes(status)) {
    return 'FINISHED';
  }
  
  // 其他全部视为未开始（包括 NS, TBD, PST, CANC, ABANDONED, WO 等）
  return 'NOT_STARTED';
}

/**
 * 从 API-FOOTBALL 获取数据
 */
async function fetchFromApiFootball(date: string): Promise<{ matches: StandardMatch[]; error?: string }> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  
  if (!apiKey) {
    return { matches: [], error: 'API_FOOTBALL_KEY 环境变量未配置' };
  }
  
  try {
    // 添加 timezone 参数
    const url = `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=Asia/Shanghai`;
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });
    
    if (!response.ok) {
      return { matches: [], error: `API-FOOTBALL 请求失败: HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    // 检查 API 错误
    if (data.errors && Object.keys(data.errors).length > 0) {
      const errorMsg = Object.values(data.errors).filter(Boolean).join('; ');
      return { matches: [], error: `API-FOOTBALL 错误: ${errorMsg}` };
    }
    
    const fixtures = data.response || [];
    
    const matches: StandardMatch[] = fixtures.map((fixture: any) => {
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
          homeScore,
          awayScore,
          elapsed,
          TEAM_RATINGS[homeTeam] || 70,
          TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
        if (homeScore !== null && awayScore !== null) {
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
    
    return { matches };
  } catch (error: any) {
    console.error('Error fetching from API-FOOTBALL:', error);
    return { matches: [], error: `API-FOOTBALL 请求异常: ${error.message}` };
  }
}

/**
 * 从 football-data.org 获取数据
 */
async function fetchFromFootballData(date: string): Promise<{ matches: StandardMatch[]; error?: string }> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  
  if (!apiKey) {
    return { matches: [], error: 'FOOTBALL_DATA_KEY 环境变量未配置' };
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
      return { matches: [], error: `football-data.org 请求失败: HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    const matches: StandardMatch[] = (data.matches || []).map((match: any) => {
      const homeTeam = match.homeTeam.name;
      const awayTeam = match.awayTeam.name;
      const homeScore = match.score?.fullTime?.home;
      const awayScore = match.score?.fullTime?.away;
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
          homeScore,
          awayScore,
          elapsed,
          TEAM_RATINGS[homeTeam] || 70,
          TEAM_RATINGS[awayTeam] || 70
        );
      } else if (matchStatus === 'FINISHED') {
        if (homeScore !== null && awayScore !== null) {
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
    
    return { matches };
  } catch (error: any) {
    console.error('Error fetching from football-data.org:', error);
    return { matches: [], error: `football-data.org 请求异常: ${error.message}` };
  }
}

/**
 * 设置禁用缓存的响应头
 */
function setNoCacheHeaders(res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
    let error: string | null = null;
    let apiFootballCount = 0;
    let footballDataCount = 0;
    
    // 根据环境变量选择数据源
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
      
      // 如果第一个数据源失败，尝试备用数据源
      if (matches.length === 0 && process.env.FOOTBALL_DATA_KEY) {
        const backupResult = await fetchFromFootballData(date);
        if (backupResult.matches.length > 0) {
          matches = backupResult.matches;
          dataSource = 'football-data';
          footballDataCount = backupResult.matches.length;
          error = null; // 备用数据源成功，清除错误
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
      
      // 如果第一个数据源失败，尝试备用数据源
      if (matches.length === 0 && process.env.API_FOOTBALL_KEY) {
        const backupResult = await fetchFromApiFootball(date);
        if (backupResult.matches.length > 0) {
          matches = backupResult.matches;
          dataSource = 'api-football';
          apiFootballCount = backupResult.matches.length;
          error = null; // 备用数据源成功，清除错误
        }
      }
    }
    
    // 如果所有数据源都失败，返回空数据和错误信息
    if (matches.length === 0) {
      if (!error) {
        error = '真实数据源未返回比赛数据，请检查 API Key、接口套餐权限、日期筛选或当天是否有比赛';
      }
    }
    
    // 强制禁用缓存（实时数据必须每次请求）
    setNoCacheHeaders(res);
    
    // 构建 debug 信息（开发环境更详细）
    const isDev = process.env.NODE_ENV === 'development';
    const debug = isDev ? {
      provider,
      requestedDate: date,
      timezone: 'Asia/Shanghai',
      apiFootballCount,
      footballDataCount,
      returnedCount: matches.length,
      hasApiFootballKey: Boolean(process.env.API_FOOTBALL_KEY),
      hasFootballDataKey: Boolean(process.env.FOOTBALL_DATA_KEY),
    } : {
      provider,
      requestedDate: date,
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
    
    // 强制禁用缓存
    setNoCacheHeaders(res);
    
    return res.status(200).json({
      matches: [],
      dataSource: 'none',
      lastUpdated: new Date().toISOString(),
      error: `实时数据接口异常: ${error.message}`,
    });
  }
}
