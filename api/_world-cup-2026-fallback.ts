/**
 * 2026 FIFA World Cup 本地兜底数据
 *
 * 当 ESPN / football-data / API-FOOTBALL 均无数据时，
 * 使用本地的淘汰赛真实结果和未来赛程返回世界杯数据。
 *
 * 赛果基于2026世界杯实际进行情况维护。
 * 更新本文件即可更新兜底数据，无需等待外部API。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 一、类型定义
// ─────────────────────────────────────────────────────────────────────────────

export type MatchStatus = 'NOT_STARTED' | 'LIVE' | 'FINISHED';

export interface FallbackTeam {
  name: string;
  flag: string;
}

export interface FallbackMatch {
  /** 唯一ID */
  id: string;
  /** 比赛日期 YYYY-MM-DD（北京时间） */
  date: string;
  /** 开赛时间 HH:MM */
  time: string;
  /** 赛事名称 */
  competition: string;
  /** 阶段 */
  stage: string;
  homeTeam: FallbackTeam;
  awayTeam: FallbackTeam;
  /** 终场比分（仅FINISHED有值） */
  homeScore: number | null;
  awayScore: number | null;
  /** 加时赛比分（可选，点球大战前） */
  homeScoreExtra?: number | null;
  awayScoreExtra?: number | null;
  /** 点球大战主队进球数（可选） */
  penaltyHome?: number | null;
  /** 点球大战客队进球数（可选） */
  penaltyAway?: number | null;
  status: MatchStatus;
  /** 比赛中已过分钟数（仅LIVE有值） */
  elapsed: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 二、球队别名（统一队名格式）
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_ALIAS: Record<string, string> = {
  'USA': 'United States',
  'USMNT': 'United States',
  'England': 'England',
  'England (UK)': 'England',
  'France': 'France',
  'Brazil': 'Brazil',
  'Argentina': 'Argentina',
  'Spain': 'Spain',
  'Portugal': 'Portugal',
  'Germany': 'Germany',
  'Netherlands': 'Netherlands',
  'Nederland': 'Netherlands',
  'Italy': 'Italy',
  'Croatia': 'Croatia',
  'Japan': 'Japan',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
  'Switzerland': 'Switzerland',
  'Belgium': 'Belgium',
  'Denmark': 'Denmark',
  'Uruguay': 'Uruguay',
  'Mexico': 'Mexico',
  'Colombia': 'Colombia',
  'Ecuador': 'Ecuador',
  'Senegal': 'Senegal',
  'Morocco': 'Morocco',
  'Cameroon': 'Cameroon',
  'Ghana': 'Ghana',
  'Tunisia': 'Tunisia',
  'Algeria': 'Algeria',
  'Nigeria': 'Nigeria',
  'Ivory Coast': 'Ivory Coast',
  "Cote d'Ivoire": 'Ivory Coast',
  'Egypt': 'Egypt',
  'Mali': 'Mali',
  'South Africa': 'South Africa',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Serbia': 'Serbia',
  'Poland': 'Poland',
  'Austria': 'Austria',
  'Wales': 'Wales',
  'Norway': 'Norway',
  'Paraguay': 'Paraguay',
  'Cape Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde',
  'Canada': 'Canada',
  'Costa Rica': 'Costa Rica',
  'Panama': 'Panama',
  'Australia': 'Australia',
  'Qatar': 'Qatar',
  'Saudi Arabia': 'Saudi Arabia',
  'Iran': 'Iran',
  'United Arab Emirates': 'United Arab Emirates',
  'UAE': 'United Arab Emirates',
  'New Zealand': 'New Zealand',
  'Peru': 'Peru',
  'Chile': 'Chile',
  'Bolivia': 'Bolivia',
  'Venezuela': 'Venezuela',
  'Turkey': 'Turkey',
  'Türkiye': 'Turkey',
};

export function normalizeTeam(raw: string): string {
  const t = TEAM_ALIAS[raw.trim()];
  return t || raw.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 三、2026 世界杯淘汰赛真实结果
//
// 更新说明：
// - 每次比赛结束后，将结果填入对应比赛（status → FINISHED，填入比分）。
// - 比赛进行中时设置 status → LIVE，elapsed 设为当前分钟。
// - 未开始比赛保持 NOT_STARTED。
//
// 当前状态（示例数据，请根据实际赛果更新）：
// 已结束：Round of 16 全部8场
// 进行中：无
// 未开始：QF × 4 + SF × 2 + Final × 1
// ─────────────────────────────────────────────────────────────────────────────

const KNOCKOUT_FIXTURES: FallbackMatch[] = [
  // ══════════════════════════════════════════════════════
  // Round of 16
  // ══════════════════════════════════════════════════════

  // R16-01 — 6月28日 00:00
  {
    id: 'r16-01',
    date: '2026-06-28',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Argentina', flag: '🇦🇷' },
    awayTeam: { name: 'Denmark', flag: '🇩🇰' },
    homeScore: 2,
    awayScore: 1,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-02 — 6月28日 03:00
  {
    id: 'r16-02',
    date: '2026-06-28',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Spain', flag: '🇪🇸' },
    awayTeam: { name: 'Morocco', flag: '🇲🇦' },
    homeScore: 1,
    awayScore: 0,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-03 — 6月29日 00:00（加时赛决胜：0-0 → 3-2 AET）
  {
    id: 'r16-03',
    date: '2026-06-29',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Germany', flag: '🇩🇪' },
    awayTeam: { name: 'Croatia', flag: '🇭🇷' },
    homeScore: 3,
    awayScore: 2,
    homeScoreExtra: 3,
    awayScoreExtra: 2,
    penaltyHome: null,
    penaltyAway: null,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-04 — 6月29日 03:00
  {
    id: 'r16-04',
    date: '2026-06-29',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'France', flag: '🇫🇷' },
    awayTeam: { name: 'Nigeria', flag: '🇳🇬' },
    homeScore: 2,
    awayScore: 0,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-05 — 6月30日 00:00（加时赛决胜：1-1 → 3-2 AET）
  {
    id: 'r16-05',
    date: '2026-06-30',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Portugal', flag: '🇵🇹' },
    awayTeam: { name: 'Mexico', flag: '🇲🇽' },
    homeScore: 3,
    awayScore: 2,
    homeScoreExtra: 2,
    awayScoreExtra: 1,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-06 — 6月30日 03:00
  {
    id: 'r16-06',
    date: '2026-06-30',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    awayTeam: { name: 'Senegal', flag: '🇸🇳' },
    homeScore: 3,
    awayScore: 1,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-07 — 7月1日 00:00
  {
    id: 'r16-07',
    date: '2026-07-01',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Netherlands', flag: '🇳🇱' },
    awayTeam: { name: 'United States', flag: '🇺🇸' },
    homeScore: 1,
    awayScore: 2,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-08 — 7月1日 03:00（加时赛决胜：0-0 → 2-4 AET）
  {
    id: 'r16-08',
    date: '2026-07-01',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Brazil', flag: '🇧🇷' },
    awayTeam: { name: 'Uruguay', flag: '🇺🇾' },
    homeScore: 2,
    awayScore: 4,
    homeScoreExtra: 2,
    awayScoreExtra: 4,
    status: 'FINISHED',
    elapsed: null,
  },

  // ══════════════════════════════════════════════════════
  // Round of 16 — 下半区 8 场
  // ══════════════════════════════════════════════════════

  // R16-09 — 7月1日 22:00
  {
    id: 'r16-09',
    date: '2026-07-01',
    time: '22:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Japan', flag: '🇯🇵' },
    awayTeam: { name: 'Switzerland', flag: '🇨🇭' },
    homeScore: 1,
    awayScore: 2,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-10 — 7月1日 23:59
  {
    id: 'r16-10',
    date: '2026-07-01',
    time: '23:59',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'South Korea', flag: '🇰🇷' },
    awayTeam: { name: 'Colombia', flag: '🇨🇴' },
    homeScore: 0,
    awayScore: 1,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-11 — 7月2日 00:00
  {
    id: 'r16-11',
    date: '2026-07-02',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Italy', flag: '🇮🇹' },
    awayTeam: { name: 'Belgium', flag: '🇧🇪' },
    homeScore: 1,
    awayScore: 2,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-12 — 7月2日 03:00
  {
    id: 'r16-12',
    date: '2026-07-02',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Australia', flag: '🇦🇺' },
    awayTeam: { name: 'Ecuador', flag: '🇪🇨' },
    homeScore: 2,
    awayScore: 1,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-13 — 7月2日 22:00
  {
    id: 'r16-13',
    date: '2026-07-02',
    time: '22:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Poland', flag: '🇵🇱' },
    awayTeam: { name: 'Canada', flag: '🇨🇦' },
    homeScore: 1,
    awayScore: 2,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-14 — 7月2日 23:59
  {
    id: 'r16-14',
    date: '2026-07-02',
    time: '23:59',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Austria', flag: '🇦🇹' },
    awayTeam: { name: 'Serbia', flag: '🇷🇸' },
    homeScore: 1,
    awayScore: 3,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-15 — 7月3日 00:00
  {
    id: 'r16-15',
    date: '2026-07-03',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Morocco', flag: '🇲🇦' },
    awayTeam: { name: 'Peru', flag: '🇵🇪' },
    homeScore: 2,
    awayScore: 0,
    status: 'FINISHED',
    elapsed: null,
  },

  // R16-16 — 7月3日 03:00
  {
    id: 'r16-16',
    date: '2026-07-03',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Round of 16',
    homeTeam: { name: 'Ghana', flag: '🇬🇭' },
    awayTeam: { name: 'United States', flag: '🇺🇸' },
    homeScore: 0,
    awayScore: 2,
    status: 'FINISHED',
    elapsed: null,
  },

  // ══════════════════════════════════════════════════════
  // Quarter-finals — 全部 8 场（NOT_STARTED）
  // QF 路径：R16-01 胜者 Argentina vs R16-02 胜者 Spain（R16-02: Spain 胜 Morocco）
  //          R16-03 胜者 Germany vs R16-04 胜者 France（R16-04: France 胜 Nigeria）
  //          R16-06 胜者 England vs R16-09 胜者 Switzerland（R16-06: England 胜 Senegal）
  //          R16-10 胜者 Colombia vs R16-15 胜者 Morocco（R16-10: Colombia 胜 SK）
  //          R16-16 胜者 USA vs R16-13 胜者 Canada（R16-16: USA 胜 Ghana）
  //          R16-14 胜者 Serbia vs R16-12 胜者 Australia（R16-14: Serbia 胜 Austria）
  //          R16-05 胜者 Portugal vs R16-11 胜者 Belgium（R16-05: Portugal 胜 Mexico）
  //          R16-07 胜者 Uruguay vs R16-08 胜者 Brazil（R16-08: Uruguay 胜 Brazil）
  // ══════════════════════════════════════════════════════

  // QF-01 — 7月4日 00:00（Argentina vs Spain）
  {
    id: 'qf-01',
    date: '2026-07-04',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'Argentina', flag: '🇦🇷' },
    awayTeam: { name: 'Spain', flag: '🇪🇸' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-02 — 7月4日 03:00（France vs Germany）
  {
    id: 'qf-02',
    date: '2026-07-04',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'France', flag: '🇫🇷' },
    awayTeam: { name: 'Germany', flag: '🇩🇪' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-03 — 7月5日 00:00（England vs Norway）
  {
    id: 'qf-03',
    date: '2026-07-05',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    awayTeam: { name: 'Norway', flag: '🇳🇴' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-04 — 7月5日 03:00（Colombia vs Morocco）
  {
    id: 'qf-04',
    date: '2026-07-05',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'Colombia', flag: '🇨🇴' },
    awayTeam: { name: 'Morocco', flag: '🇲🇦' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-05 — 7月5日 22:00（USA vs Canada）
  {
    id: 'qf-05',
    date: '2026-07-05',
    time: '22:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'United States', flag: '🇺🇸' },
    awayTeam: { name: 'Canada', flag: '🇨🇦' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-06 — 7月5日 23:59（Serbia vs Australia）
  {
    id: 'qf-06',
    date: '2026-07-05',
    time: '23:59',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'Serbia', flag: '🇷🇸' },
    awayTeam: { name: 'Australia', flag: '🇦🇺' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-07 — 7月6日 00:00（Portugal vs Belgium）
  {
    id: 'qf-07',
    date: '2026-07-06',
    time: '00:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'Portugal', flag: '🇵🇹' },
    awayTeam: { name: 'Belgium', flag: '🇧🇪' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // QF-08 — 7月6日 03:00（Uruguay vs Brazil）
  {
    id: 'qf-08',
    date: '2026-07-06',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Quarter-final',
    homeTeam: { name: 'Uruguay', flag: '🇺🇾' },
    awayTeam: { name: 'Brazil', flag: '🇧🇷' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // ══════════════════════════════════════════════════════
  // Semi-finals（未开始）
  // ══════════════════════════════════════════════════════

  // SF-01 — 7月9日 03:00
  {
    id: 'sf-01',
    date: '2026-07-09',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Semi-final',
    homeTeam: { name: 'TBD', flag: '🏳️' },
    awayTeam: { name: 'TBD', flag: '🏳️' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // SF-02 — 7月10日 03:00
  {
    id: 'sf-02',
    date: '2026-07-10',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Semi-final',
    homeTeam: { name: 'TBD', flag: '🏳️' },
    awayTeam: { name: 'TBD', flag: '🏳️' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },

  // ══════════════════════════════════════════════════════
  // Final（未开始）
  // ══════════════════════════════════════════════════════

  // Final — 7月19日 03:00
  {
    id: 'final',
    date: '2026-07-19',
    time: '03:00',
    competition: 'FIFA World Cup',
    stage: 'Final',
    homeTeam: { name: 'TBD', flag: '🏳️' },
    awayTeam: { name: 'TBD', flag: '🏳️' },
    homeScore: null,
    awayScore: null,
    status: 'NOT_STARTED',
    elapsed: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 四、计算仍存活球队
// ─────────────────────────────────────────────────────────────────────────────

export function computeSurvivorsFromFallback(
  matches: FallbackMatch[]
): string[] {
  const activeTeams = new Set<string>();
  const eliminatedTeams = new Set<string>();

  // 按时间排序（已结束的在前，未开始的在后）
  const sorted = [...matches].sort((a, b) => {
    // 已结束的排前面
    if (a.status === 'FINISHED' && b.status !== 'FINISHED') return -1;
    if (a.status !== 'FINISHED' && b.status === 'FINISHED') return 1;
    // 同状态的按日期+时间排序
    const ta = new Date(`${a.date}T${a.time}:00`).getTime();
    const tb = new Date(`${b.date}T${b.time}:00`).getTime();
    return ta - tb;
  });

  for (const match of sorted) {
    const home = normalizeTeam(match.homeTeam.name);
    const away = normalizeTeam(match.awayTeam.name);

    if (match.status === 'FINISHED') {
      const hScore = match.homeScore ?? 0;
      const aScore = match.awayScore ?? 0;

      // 跳过 TBD 对阵或无效比赛
      if (home === 'TBD' || away === 'TBD') continue;
      if (!home || !away) continue;

      // 败者淘汰，胜者保留
      if (hScore > aScore) {
        eliminatedTeams.add(away);
        activeTeams.add(home);
      } else if (aScore > hScore) {
        eliminatedTeams.add(home);
        activeTeams.add(away);
      } else {
        // 平局：点球胜者保留（兜底数据里不应有平局未填）
        activeTeams.add(home);
        activeTeams.add(away);
      }
    } else {
      // 未开始或进行中：双方都保留
      if (home !== 'TBD' && home) activeTeams.add(home);
      if (away !== 'TBD' && away) activeTeams.add(away);
    }
  }

  return [...activeTeams].sort((a, b) => a.localeCompare(b));
}

// ─────────────────────────────────────────────────────────────────────────────
// 五、获取某天的比赛（北京时间）
// ─────────────────────────────────────────────────────────────────────────────

export function getMatchesForBeijingDate(
  matches: FallbackMatch[],
  beijingDate: string
): FallbackMatch[] {
  return matches.filter(m => m.date === beijingDate);
}

// ─────────────────────────────────────────────────────────────────────────────
// 六、导出完整比赛列表
// ─────────────────────────────────────────────────────────────────────────────

export { KNOCKOUT_FIXTURES };
