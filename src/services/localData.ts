/**
 * 本地数据服务
 * 从 public/data/ 目录读取同步后的 JSON 文件
 * 不直接调用外部 API，token 不暴露到前端
 */

export interface StandardMatch {
  competition: string;
  competitionName: string;
  season: string;
  utcDate: string;
  homeTeam: string;
  homeShortName: string;
  homeTla: string;
  homeCrest: string;
  awayTeam: string;
  awayShortName: string;
  awayTla: string;
  awayCrest: string;
  status: string;
  score: string;
  homeScore: number | null;
  awayScore: number | null;
  matchday: number | string;
  stage: string;
  group: string | null;
  source: string;
}

export interface SyncStatus {
  source: string;
  subscription: string;
  success: boolean;
  error: string | null;
  lastSync: string;
  lastSyncLocal: string;
  availableCompetitions: string[];
  competitionNames: Record<string, string>;
  syncResults: Array<{
    competition: string;
    name: string;
    matchCount: number;
    status: 'success' | 'failed';
    error: string | null;
  }>;
  totalCompetitions: number;
  successCount: number;
  failedCount: number;
  totalMatches: number;
}

/**
 * 读取同步后的比赛数据
 * @param competition 可选，只返回指定赛事（如 'WC'），默认 'WC'
 */
export async function fetchLocalMatches(competition: string = 'WC'): Promise<StandardMatch[]> {
  const res = await fetch('/data/football_data_latest_matches.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const matches: StandardMatch[] = data.matches || [];
  if (competition === 'all') return matches;
  return matches.filter(m => m.competition === competition);
}

/**
 * 读取同步状态
 */
export async function fetchSyncStatus(): Promise<SyncStatus | null> {
  try {
    const res = await fetch('/data/football_data_sync_status.json');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 读取赛事列表
 */
export async function fetchLocalCompetitions() {
  try {
    const res = await fetch('/data/football_data_competitions.json');
    if (!res.ok) return [];
    const data = await res.json();
    return data.competitions || [];
  } catch {
    return [];
  }
}

/**
 * 基于球队名称的简单实力评级（0-100）
 * 用于在没有赔率数据时推导概率和信心分
 */
const TEAM_RATINGS: Record<string, number> = {
  'Brazil': 92, 'Argentina': 90, 'France': 89, 'Spain': 87, 'England': 86,
  'Portugal': 85, 'Germany': 84, 'Netherlands': 83, 'Belgium': 82, 'Italy': 82,
  'Croatia': 78, 'Uruguay': 77, 'Mexico': 76, 'United States': 75, 'Japan': 75,
  'South Korea': 72, 'Morocco': 74, 'Senegal': 73, 'Colombia': 76, 'Ecuador': 70,
  'Switzerland': 78, 'Austria': 76, 'Sweden': 75, 'Norway': 76, 'Czechia': 74,
  'Turkey': 75, 'Australia': 70, 'Qatar': 65, 'Paraguay': 71, 'Haiti': 58,
  'Scotland': 73, 'Tunisia': 68, 'Egypt': 71, 'Iran': 69, 'New Zealand': 60,
  'Ivory Coast': 72, 'Algeria': 73, 'Jordan': 62, 'Uzbekistan': 64,
  'Saudi Arabia': 66, 'Iraq': 65, 'Cape Verde Islands': 55, 'Congo DR': 60,
  'Bosnia-Herzegovina': 72, 'Curaçao': 52, 'Ghana': 70,
};

export function getTeamRating(name: string): number {
  if (!name || name === 'None') return 65; // 未知球队给中等评级
  return TEAM_RATINGS[name] ?? 65;
}

/**
 * 基于两队实力差推导胜平负概率（连续函数）
 * 使用逻辑斯蒂模型让概率平滑变化
 */
function deriveProbabilities(homeRating: number, awayRating: number) {
  const diff = homeRating - awayRating;
  // 主场优势 +3
  const homeAdv = 3;
  const adjustedDiff = diff + homeAdv;

  // 用逻辑斯蒂函数推导主胜概率
  // adjustedDiff = 0 时 winProb ≈ 37%（主场优势）
  // adjustedDiff = +20 时 winProb ≈ 65%
  // adjustedDiff = -20 时 winProb ≈ 15%
  const winProb = Math.round(100 / (1 + Math.exp(-adjustedDiff / 8)));

  // 平局概率：实力差越小越高，最高40%，最低16%
  const drawProb = Math.round(40 - Math.abs(adjustedDiff) * 0.8);
  const clampedDraw = Math.max(16, Math.min(40, drawProb));

  // 客胜概率 = 100 - 主胜 - 平局
  let loseProb = 100 - winProb - clampedDraw;
  if (loseProb < 5) loseProb = 5;

  // 归一化
  const total = winProb + clampedDraw + loseProb;
  return {
    winProb: Math.round((winProb / total) * 100),
    drawProb: Math.round((clampedDraw / total) * 100),
    loseProb: Math.round((loseProb / total) * 100),
  };
}

/**
 * 推导推荐方向
 */
function deriveRecommendation(winProb: number, drawProb: number, loseProb: number): { pick: string; confidence: number; risk: 'low' | 'medium' | 'high' } {
  const max = Math.max(winProb, drawProb, loseProb);
  const min = Math.min(winProb, drawProb, loseProb);
  const spread = max - min;

  // 信心分：最大概率越高、概率分布越集中，信心越高
  let confidence = Math.round(max * 0.6 + (100 - spread) * 0.4);
  // 限制范围 35-90
  confidence = Math.max(35, Math.min(90, confidence));

  // 风险等级
  let risk: 'low' | 'medium' | 'high';
  if (max >= 50 && spread >= 25) risk = 'low';
  else if (max >= 40 && spread >= 15) risk = 'medium';
  else risk = 'high';

  // 推荐方向
  let pick: string;
  if (winProb === max && winProb >= 45) {
    pick = '主胜倾向';
  } else if (loseProb === max && loseProb >= 45) {
    pick = '客胜倾向';
  } else if (drawProb >= 32) {
    pick = '平局防守';
  } else if (winProb === max) {
    pick = '主队不败';
  } else if (loseProb === max) {
    pick = '客队不败';
  } else {
    pick = '谨慎观望';
  }

  return { pick, confidence, risk };
}

/**
 * 推导可能比分
 */
function derivePossibleScores(winProb: number, drawProb: number, loseProb: number, homeRating: number, awayRating: number): string[] {
  const max = Math.max(winProb, drawProb, loseProb);
  const scores: string[] = [];

  if (max === winProb) {
    // 主胜方向
    if (homeRating - awayRating > 10) {
      scores.push('2:0', '3:0', '2:1');
    } else {
      scores.push('1:0', '2:1', '1:1');
    }
  } else if (max === loseProb) {
    // 客胜方向
    if (awayRating - homeRating > 10) {
      scores.push('0:2', '0:3', '1:2');
    } else {
      scores.push('0:1', '1:2', '1:1');
    }
  } else {
    // 平局方向
    scores.push('1:1', '0:0', '1:0');
  }

  return scores;
}

/**
 * 推导大小球倾向
 */
function deriveOverUnder(homeRating: number, awayRating: number): 'over' | 'under' | 'neutral' {
  const totalRating = homeRating + awayRating;
  const diff = Math.abs(homeRating - awayRating);
  if (totalRating > 155 && diff < 10) return 'over';
  if (totalRating < 130 || diff > 15) return 'under';
  return 'neutral';
}

/**
 * 推导关键因素标签
 */
function deriveKeyFactors(stage: string, group: string | null, status: string): string[] {
  const factors: string[] = [];
  if (stage === 'GROUP_STAGE' || stage === 'group') factors.push('小组赛');
  if (group) factors.push(`${group}组`);
  if (status === 'IN_PLAY' || status === 'PAUSED') factors.push('比赛进行中');
  if (status === 'FINISHED') factors.push('已结束');
  // 根据是否有淘汰赛阶段标签
  if (stage === 'LAST_16') factors.push('淘汰赛16强');
  if (stage === 'QUARTER_FINALS') factors.push('8强赛');
  if (stage === 'SEMI_FINALS') factors.push('半决赛');
  if (stage === 'FINAL') factors.push('决赛');
  return factors;
}

/**
 * 生成分析摘要
 */
function deriveAnalysis(homeTeam: string, awayTeam: string, winProb: number, drawProb: number, loseProb: number, confidence: number): string {
  const max = Math.max(winProb, drawProb, loseProb);
  const direction = winProb === max ? `${homeTeam}主场占优` :
                     loseProb === max ? `${awayTeam}客场有机会` :
                     '双方势均力敌';
  const confidenceDesc = confidence >= 75 ? '信心较高' : confidence >= 55 ? '信心中等' : '信心偏低';
  return `${homeTeam} vs ${awayTeam}，${direction}，概率分布${max >= 45 ? '较为集中' : '较为分散'}，${confidenceDesc}。`;
}

/**
 * 将标准比赛数据转换为前端展示格式
 */
export function convertMatchToFrontend(m: StandardMatch) {
  const statusMap: Record<string, 'upcoming' | 'live' | 'finished'> = {
    SCHEDULED: 'upcoming',
    TIMED: 'upcoming',
    IN_PLAY: 'live',
    PAUSED: 'live',
    FINISHED: 'finished',
    SUSPENDED: 'live',
    POSTPONED: 'upcoming',
    CANCELLED: 'finished',
  };

  const stageMap: Record<string, 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final'> = {
    GROUP_STAGE: 'group',
    LAST_16: 'round16',
    QUARTER_FINALS: 'quarterfinal',
    SEMI_FINALS: 'semifinal',
    FINAL: 'final',
  };

  let status = statusMap[m.status] || 'upcoming';
  const matchDate = new Date(m.utcDate);
  const now = new Date();

  // 对 TIMED/SCHEDULED 状态的比赛做时间推断
  // 如果已过开赛时间但状态仍是 TIMED，可能是数据未更新
  if (status === 'upcoming' && (m.status === 'TIMED' || m.status === 'SCHEDULED')) {
    const diffMs = now.getTime() - matchDate.getTime();
    if (diffMs > 0) {
      // 已经开赛但数据未更新，标为 live
      status = 'live';
    }
  }

  const date = matchDate;

  // 用本地时区(Asia/Shanghai)格式化日期，避免UTC跨天问题
  const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }); // sv-SE => YYYY-MM-DD
  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  });

  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const hasScore = (isLive || isFinished) && m.homeScore !== null && m.awayScore !== null;

  // 获取球队评级
  const homeRating = getTeamRating(m.homeShortName || m.homeTeam);
  const awayRating = getTeamRating(m.awayShortName || m.awayTeam);

  // 推导概率
  let { winProb, drawProb, loseProb } = deriveProbabilities(homeRating, awayRating);

  // 已结束的比赛用实际比分覆盖概率
  if (isFinished && hasScore) {
    if (m.homeScore! > m.awayScore!) { winProb = 100; drawProb = 0; loseProb = 0; }
    else if (m.homeScore! < m.awayScore!) { winProb = 0; drawProb = 0; loseProb = 100; }
    else { winProb = 0; drawProb = 100; loseProb = 0; }
  }

  // 推导推荐方向、信心分、风险等级
  const { pick: recommendedPick, confidence, risk: riskLevel } = deriveRecommendation(winProb, drawProb, loseProb);

  // 推导可能比分
  const possibleScores = derivePossibleScores(winProb, drawProb, loseProb, homeRating, awayRating);

  // 推导大小球
  const overUnder = deriveOverUnder(homeRating, awayRating);

  // 关键因素
  const keyFactors = deriveKeyFactors(m.stage, m.group, m.status);

  // 分析摘要
  const homeTeamName = m.homeShortName || m.homeTeam || '待定';
  const awayTeamName = m.awayShortName || m.awayTeam || '待定';
  const analysis = deriveAnalysis(homeTeamName, awayTeamName, winProb, drawProb, loseProb, confidence);

  return {
    id: `fd-${m.competition}-${m.utcDate}-${m.homeTeam}-${m.awayTeam}`,
    date: dateStr,
    time: timeStr,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    homeFlag: m.homeCrest || '⚽',
    awayFlag: m.awayCrest || '⚽',
    homeTla: m.homeTla || '',
    awayTla: m.awayTla || '',
    status,
    stage: stageMap[m.stage] || 'group',
    homeScore: hasScore ? m.homeScore! : undefined,
    awayScore: hasScore ? m.awayScore! : undefined,
    winProb,
    drawProb,
    loseProb,
    confidence,
    riskLevel,
    recommendedPick,
    possibleScores,
    overUnder,
    keyFactors,
    analysis,
    matchday: m.matchday,
    group: m.group,
    competition: m.competitionName || m.competition,
    competitionCode: m.competition,
  };
}

// ══════════════════════════════════════════════════════════════
// 合成赔率生成器（football-data.org 免费版无赔率，从球队评分合成）
// key 格式: `${matchId}__${market}__${selection}`
// ══════════════════════════════════════════════════════════════

type OddsDict = Record<string, string>;

/** 全局合成赔率缓存（比赛加载后填充） */
let _syntheticOddsCache: OddsDict = {};

/** 清理进球数字符串 */
function stripGoal(s: string): string {
  return s.replace('球', '').replace('+', '+');
}

/** 薄概率 → 十进制赔率（保留2位） */
function probToOdds(p: number): string {
  if (p <= 0) return '--';
  return (1 / p).toFixed(2);
}

/** 基于主客队评分生成胜平负合成赔率 */
function synth1X2(home: string, away: string, homeR: number, awayR: number): OddsDict {
  const diff = homeR - awayR + 3; // 主场+3
  const winP = 1 / (1 + Math.exp(-diff / 8));
  const loseP = 1 - winP;
  const drawP = 0.22;
  const wp = winP * (1 - drawP);
  const lp = loseP * (1 - drawP);
  const id = `${home}__${away}`;
  return {
    [`${id}__胜平负__胜`]: probToOdds(wp),
    [`${id}__胜平负__平`]: probToOdds(drawP),
    [`${id}__胜平负__负`]: probToOdds(lp),
  };
}

/** 基于期望进球生成总进球合成赔率 */
function synthTotalGoals(home: string, away: string, expected: number): OddsDict {
  const id = `${home}__${away}`;
  // Poisson-ish 概率
  const probs: Record<string, number> = {};
  let total = 0;
  for (let g = 0; g <= 7; g++) {
    const lambda = expected;
    probs[g] = (Math.pow(lambda, g) * Math.exp(-lambda)) / (g === 0 ? 1 : [1, 1, 2, 6, 24, 120, 720][Math.min(g, 6)]);
    total += probs[g];
  }
  // 归一化
  const norm = Object.values(probs).reduce((s, p) => s + p, 0);
  const result: OddsDict = {};
  for (let g = 0; g <= 6; g++) {
    const p = probs[g] / norm;
    result[`${id}__总进球__${g}球`] = p > 0.01 ? probToOdds(p) : '--';
  }
  // 7+
  const p7plus = Object.entries(probs).filter(([k]) => parseInt(k) >= 7).reduce((s, [, p]) => s + p, 0) / norm;
  result[`${id}__总进球__7+球`] = p7plus > 0.01 ? probToOdds(p7plus) : '--';
  return result;
}

/** 半全场合成 */
function synthHalfFull(home: string, away: string, homeR: number, awayR: number): OddsDict {
  const diff = homeR - awayR + 3;
  const winH = 1 / (1 + Math.exp(-(diff * 0.5) / 8));
  const drawH = 0.30;
  const loseH = 1 - winH - drawH;
  const winF = 1 / (1 + Math.exp(-diff / 8));
  const drawF = 0.22;
  const loseF = 1 - winF - drawF;
  const id = `${home}__${away}`;
  const pairs: [string, number, number][] = [
    ['胜胜', winH * winF, 0.10],
    ['胜平', winH * drawF, 0.10],
    ['胜负', winH * loseF, 0.10],
    ['平胜', drawH * winF, 0.10],
    ['平平', drawH * drawF, 0.10],
    ['平负', drawH * loseF, 0.10],
    ['负胜', loseH * winF, 0.10],
    ['负平', loseH * drawF, 0.10],
    ['负负', loseH * loseF, 0.10],
  ];
  const result: OddsDict = {};
  for (const [sel, p, spread] of pairs) {
    result[`${id}__半全场__${sel}`] = probToOdds(Math.max(0.05, p * (1 + (Math.random() - 0.5) * 0.2)));
  }
  return result;
}

/** 半场胜平负合成 */
function synthHalfTime(home: string, away: string, homeR: number, awayR: number): OddsDict {
  const diff = (homeR - awayR + 3) * 0.5;
  const winP = 1 / (1 + Math.exp(-diff / 8));
  const drawP = 0.30;
  const loseP = Math.max(0.05, 1 - winP - drawP);
  const id = `${home}__${away}`;
  return {
    [`${id}__半场__胜`]: probToOdds(winP),
    [`${id}__半场__平`]: probToOdds(drawP),
    [`${id}__半场__负`]: probToOdds(loseP),
  };
}

/** 比分合成 */
function synthCorrectScore(home: string, away: string, expected: number, homeR: number, awayR: number): OddsDict {
  const id = `${home}__${away}`;
  const result: OddsDict = {};
  // 主场偏向
  const homeBias = homeR / (homeR + awayR);
  const scores: [string, number][] = [
    ['0:0', 0.08], ['0:1', 0.05], ['0:2', 0.04], ['0:3', 0.03],
    ['1:0', 0.09], ['1:1', 0.10], ['1:2', 0.06], ['1:3', 0.03],
    ['2:0', 0.07], ['2:1', 0.08], ['2:2', 0.05], ['2:3', 0.03],
    ['3:0', 0.04], ['3:1', 0.04], ['3:2', 0.03], ['3:3', 0.02],
    ['4:0', 0.02], ['4:1', 0.02], ['4:2', 0.01],
  ];
  let total = 0;
  const raw: [string, number][] = scores.map(([s, base]) => {
    const [hs, as] = s.split(':').map(Number);
    const homePeak = Math.exp(-Math.pow(hs - expected * homeBias, 2) / 2);
    const awayPeak = Math.exp(-Math.pow(as - expected * (1 - homeBias), 2) / 2);
    const p = base * homePeak * awayPeak;
    total += p;
    return [s, p] as [string, number];
  });
  for (const [s, p] of raw) {
    result[`${id}__比分__${s}`] = total > 0 ? probToOdds(p / total) : '--';
  }
  return result;
}

/**
 * 根据比赛数据生成合成赔率表
 * 当 API 无赔率时由前端调用此函数生成
 */
export function buildSyntheticOddsForMatches(matches: StandardMatch[]): OddsDict {
  const all: OddsDict = {};
  for (const m of matches) {
    if (m.status === 'FINISHED' || m.status === 'CANCELLED' || m.status === 'POSTPONED') continue;
    const homeR = getTeamRating(m.homeTeam);
    const awayR = getTeamRating(m.awayTeam);
    const diff = homeR - awayR + 3;
    const winP = 1 / (1 + Math.exp(-diff / 8));
    const expected = 1.8 + (homeR + awayR) / 2 / 55 * 1.4;

    Object.assign(all, synth1X2(m.homeTeam, m.awayTeam, homeR, awayR));
    Object.assign(all, synthTotalGoals(m.homeTeam, m.awayTeam, expected));
    Object.assign(all, synthHalfFull(m.homeTeam, m.awayTeam, homeR, awayR));
    Object.assign(all, synthHalfTime(m.homeTeam, m.awayTeam, homeR, awayR));
    Object.assign(all, synthCorrectScore(m.homeTeam, m.awayTeam, expected, homeR, awayR));
  }
  _syntheticOddsCache = all;
  return all;
}

/**
 * 根据 leg 信息查赔率
 * key 格式: `${matchId}__${market}__${selection}`
 * matchId 来自 SelectableMatch.id = makeMatchId(home, away) = "homeTeam__awayTeam"
 */
export function getOddsForLeg(matchId: string, market: string, selection: string): string {
  const key = `${matchId}__${market}__${selection}`;
  return _syntheticOddsCache[key] ?? '--';
}

/** 获取当前缓存的合成赔率表 */
export function getSyntheticOddsCache(): OddsDict {
  return _syntheticOddsCache;
}

/**
 * 获取所有缓存的赔率（用于传递给 formatTicketTextForBetSlip）
 * 返回 Record<key, oddsString>
 */
export function getFullOddsMap(): OddsDict {
  return { ..._syntheticOddsCache };
}
