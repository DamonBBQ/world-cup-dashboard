export interface Match {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  status: 'upcoming' | 'live' | 'finished';
  stage: 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final';
  homeScore?: number;
  awayScore?: number;
  winProb: number;
  drawProb: number;
  loseProb: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedPick: string;
  possibleScores: string[];
  overUnder: 'over' | 'under' | 'neutral';
  keyFactors: string[];
  analysis: string;
}

export interface TicketRecord {
  id: string;
  date: string;
  amount: number;
  matchCount: number;
  style: string;
  status: 'pending' | 'won' | 'lost' | 'partial';
  netProfit: number;
  matches: TicketMatch[];
}

export interface TicketMatch {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  odds: number;
}

export const mockMatches: Match[] = [
  {
    id: 'm1',
    date: '2026-06-15',
    time: '18:00',
    homeTeam: 'Brazil',
    awayTeam: 'Argentina',
    homeFlag: '🇧🇷',
    awayFlag: '🇦🇷',
    status: 'upcoming',
    stage: 'group',
    winProb: 42,
    drawProb: 28,
    loseProb: 30,
    confidence: 78,
    riskLevel: 'medium',
    recommendedPick: '主胜倾向',
    possibleScores: ['2:1', '1:0', '1:1'],
    overUnder: 'over',
    keyFactors: ['阵容完整', '防守稳定', '历史交锋优势'],
    analysis: '巴西主场作战，阵容深度占优，但阿根廷近期状态出色，需警惕平局可能。'
  },
  {
    id: 'm2',
    date: '2026-06-15',
    time: '21:00',
    homeTeam: 'France',
    awayTeam: 'Germany',
    homeFlag: '🇫🇷',
    awayFlag: '🇩🇪',
    status: 'upcoming',
    stage: 'group',
    winProb: 38,
    drawProb: 30,
    loseProb: 32,
    confidence: 72,
    riskLevel: 'medium',
    recommendedPick: '谨慎观望',
    possibleScores: ['1:1', '2:1', '1:2'],
    overUnder: 'neutral',
    keyFactors: ['主力伤停', '赛程密集', '防守稳定'],
    analysis: '法国和德国实力接近，双方都有主力伤停情况，预计场面胶着，小球概率较高。'
  },
  {
    id: 'm3',
    date: '2026-06-16',
    time: '15:00',
    homeTeam: 'Spain',
    awayTeam: 'England',
    homeFlag: '🇪🇸',
    awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    status: 'upcoming',
    stage: 'group',
    winProb: 35,
    drawProb: 32,
    loseProb: 33,
    confidence: 65,
    riskLevel: 'high',
    recommendedPick: '平局防御',
    possibleScores: ['1:1', '0:0', '1:0'],
    overUnder: 'under',
    keyFactors: ['阵容完整', '防守稳定', '战意强烈'],
    analysis: '西班牙控球优势明显，但英格兰反击犀利，平局概率不容忽视，建议防御为先。'
  },
  {
    id: 'm4',
    date: '2026-06-16',
    time: '18:00',
    homeTeam: 'Portugal',
    awayTeam: 'Netherlands',
    homeFlag: '🇵🇹',
    awayFlag: '🇳🇱',
    status: 'upcoming',
    stage: 'group',
    winProb: 45,
    drawProb: 25,
    loseProb: 30,
    confidence: 82,
    riskLevel: 'low',
    recommendedPick: '主胜倾向',
    possibleScores: ['2:0', '2:1', '1:0'],
    overUnder: 'over',
    keyFactors: ['阵容完整', '主场优势', '进攻火力强'],
    analysis: '葡萄牙主场作战，进攻端状态火热，荷兰队后防线存在隐患，主胜是首选方向。'
  },
  {
    id: 'm5',
    date: '2026-06-17',
    time: '15:00',
    homeTeam: 'Italy',
    awayTeam: 'Croatia',
    homeFlag: '🇮🇹',
    awayFlag: '🇭🇷',
    status: 'live',
    stage: 'group',
    homeScore: 1,
    awayScore: 0,
    winProb: 48,
    drawProb: 27,
    loseProb: 25,
    confidence: 85,
    riskLevel: 'low',
    recommendedPick: '主胜倾向',
    possibleScores: ['2:0', '1:0', '2:1'],
    overUnder: 'under',
    keyFactors: ['防守稳定', '主场优势', '战意强烈'],
    analysis: '意大利防守组织严密，克罗地亚中场创造力下降，意大利有望守住胜果。'
  },
  {
    id: 'm6',
    date: '2026-06-17',
    time: '18:00',
    homeTeam: 'Japan',
    awayTeam: 'South Korea',
    homeFlag: '🇯🇵',
    awayFlag: '🇰🇷',
    status: 'upcoming',
    stage: 'group',
    winProb: 40,
    drawProb: 30,
    loseProb: 30,
    confidence: 70,
    riskLevel: 'medium',
    recommendedPick: '主队不败',
    possibleScores: ['1:0', '1:1', '2:1'],
    overUnder: 'neutral',
    keyFactors: ['阵容完整', '主场优势', '速度优势'],
    analysis: '日本队技术细腻，韩国队身体对抗强，预计日本队能保持不败，但需防范韩国反击。'
  },
  {
    id: 'm7',
    date: '2026-06-18',
    time: '21:00',
    homeTeam: 'Morocco',
    awayTeam: 'Senegal',
    homeFlag: '🇲🇦',
    awayFlag: '🇸🇳',
    status: 'upcoming',
    stage: 'group',
    winProb: 36,
    drawProb: 34,
    loseProb: 30,
    confidence: 68,
    riskLevel: 'medium',
    recommendedPick: '平局防御',
    possibleScores: ['1:1', '0:1', '1:0'],
    overUnder: 'under',
    keyFactors: ['防守稳定', '天气影响', '阵容完整'],
    analysis: '两队防守都很顽强，预计进球数不多，平局是合理预期，建议双选防护。'
  },
  {
    id: 'm8',
    date: '2026-06-14',
    time: '20:00',
    homeTeam: 'Qatar',
    awayTeam: 'Ecuador',
    homeFlag: '🇶🇦',
    awayFlag: '🇪🇨',
    status: 'finished',
    stage: 'group',
    homeScore: 0,
    awayScore: 2,
    winProb: 30,
    drawProb: 28,
    loseProb: 42,
    confidence: 60,
    riskLevel: 'high',
    recommendedPick: '客队不败',
    possibleScores: ['0:1', '1:2', '0:2'],
    overUnder: 'under',
    keyFactors: ['主场优势', '天气影响', '经验不足'],
    analysis: '卡塔尔作为东道主有主场优势，但厄瓜多尔南美预选赛表现强势，客队不败是合理选择。'
  }
];

export const stageLabels: Record<string, string> = {
  group: '小组赛',
  round16: '16强赛',
  quarterfinal: '8强赛',
  semifinal: '半决赛',
  final: '决赛'
};

export const statusLabels: Record<string, string> = {
  upcoming: '未开始',
  live: '进行中',
  finished: '已结束'
};

export const riskLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};
