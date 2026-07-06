import { useState, useEffect, useCallback } from 'react';
import { mockTeamRatings, mockPlayers, statusLabels } from '../data/mockPlayers';

/**
 * 球队名称别名映射表
 * ESPN 数据源的队名 -> mockPlayers/mockTeamRatings 的标准队名
 */
const TEAM_ALIAS_MAP: Record<string, string> = {
  // 英文别名
  USA: 'United States',
  'United States': 'United States',
  USMNT: 'United States',
  'United States of America': 'United States',
  England: 'England',
  'England (UK)': 'England',
  France: 'France',
  Brazil: 'Brazil',
  Argentina: 'Argentina',
  Spain: 'Spain',
  Portugal: 'Portugal',
  Germany: 'Germany',
  Netherlands: 'Netherlands',
  Italy: 'Italy',
  Croatia: 'Croatia',
  Japan: 'Japan',
  'South Korea': 'South Korea',
  'Korea Republic': 'South Korea',
  Switzerland: 'Switzerland',
  Belgium: 'Belgium',
  Denmark: 'Denmark',
  Uruguay: 'Uruguay',
  Mexico: 'Mexico',
  Colombia: 'Colombia',
  Ecuador: 'Ecuador',
  Senegal: 'Senegal',
  Morocco: 'Morocco',
  Cameroon: 'Cameroon',
  Ghana: 'Ghana',
  Tunisia: 'Tunisia',
  Algeria: 'Algeria',
  Nigeria: 'Nigeria',
  'Ivory Coast': 'Ivory Coast',
  'Cote d\'Ivoire': 'Ivory Coast',
  Egypt: 'Egypt',
  Mali: 'Mali',
  'South Africa': 'South Africa',
  DR: 'DR Congo',
  'DR Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  Serbia: 'Serbia',
  Poland: 'Poland',
  Austria: 'Austria',
  Wales: 'Wales',
  Scotland: 'Scotland',
  Ukraine: 'Ukraine',
  Norway: 'Norway',
  'Cape Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde',
  Canada: 'Canada',
  Costa: 'Costa Rica',
  'Costa Rica': 'Costa Rica',
  Panama: 'Panama',
  Australia: 'Australia',
  Qatar: 'Qatar',
  'Saudi Arabia': 'Saudi Arabia',
  'Saudi Arabia SA': 'Saudi Arabia',
  Iran: 'Iran',
  Iraq: 'Iraq',
  UAE: 'United Arab Emirates',
  'United Arab Emirates': 'United Arab Emirates',
  'New Zealand': 'New Zealand',
  'New Zealand NZ': 'New Zealand',
  'New ZealandFootball': 'New Zealand',
  Peru: 'Peru',
  Paraguay: 'Paraguay',
  Chile: 'Chile',
  Bolivia: 'Bolivia',
  Venezuela: 'Venezuela',
  Jamaica: 'Jamaica',
  Honduras: 'Honduras',
  'Trinidad and Tobago': 'Trinidad and Tobago',
  Bulgaria: 'Bulgaria',
  Hungary: 'Hungary',
  Romania: 'Romania',
  'Czech Republic': 'Czech Republic',
  'Czechia': 'Czech Republic',
  Slovakia: 'Slovakia',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  Slovenia: 'Slovenia',
  Albania: 'Albania',
  'North Macedonia': 'North Macedonia',
  Montenegro: 'Montenegro',
  Iceland: 'Iceland',
  Finland: 'Finland',
  Sweden: 'Sweden',
  'Republic of Ireland': 'Ireland',
  Ireland: 'Ireland',
  'Northern Ireland': 'Northern Ireland',
  Luxembourg: 'Luxembourg',
  Kazakhstan: 'Kazakhstan',
  Azerbaijan: 'Azerbaijan',
  Georgia: 'Georgia',
  Armenia: 'Armenia',
  Cyprus: 'Cyprus',
  Malta: 'Malta',
  Estonia: 'Estonia',
  Latvia: 'Latvia',
  Lithuania: 'Lithuania',
  Belarus: 'Belarus',
  Moldova: 'Moldova',
  'Turkey': 'Turkey',
  'Türkiye': 'Turkey',
};

/**
 * 将任意队名标准化匹配到 mockPlayers/mockTeamRatings 的队名
 */
function normalizeTeamName(name: string): string {
  const trimmed = name.trim();

  // 直接匹配别名表
  const upper = trimmed.toUpperCase();
  if (TEAM_ALIAS_MAP[upper]) return TEAM_ALIAS_MAP[upper];
  if (TEAM_ALIAS_MAP[trimmed]) return TEAM_ALIAS_MAP[trimmed];

  // 模糊匹配
  const candidates = [
    'United States', 'England', 'France', 'Brazil', 'Argentina',
    'Spain', 'Portugal', 'Germany', 'Netherlands', 'Italy',
    'Croatia', 'Japan', 'South Korea', 'Switzerland', 'Belgium',
    'Denmark', 'Uruguay', 'Mexico', 'Colombia', 'Ecuador',
    'Senegal', 'Morocco', 'Cameroon', 'Ghana', 'Tunisia',
    'Algeria', 'Nigeria', 'Ivory Coast', 'Egypt', 'Mali',
    'South Africa', 'DR Congo', 'Serbia', 'Poland', 'Austria',
    'Wales', 'Norway', 'Paraguay', 'Cape Verde', 'Canada',
    'Costa Rica', 'Australia', 'Qatar', 'Saudi Arabia', 'Iran',
    'Turkey',
  ];

  for (const candidate of candidates) {
    const norm = candidate.toUpperCase().replace(/[^A-Z]/g, '');
    const input = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
    if (norm === input || norm.includes(input) || input.includes(norm)) {
      return candidate;
    }
  }

  // 完全匹配
  return trimmed;
}

/**
 * 纳队名是否在幸存球队列表中
 */
function isSurvivingTeam(teamName: string, survivingTeams: string[]): boolean {
  const normalized = normalizeTeamName(teamName);
  return survivingTeams.some(
    s => normalizeTeamName(s) === normalized
  );
}

interface SurvivorTeam {
  name: string;
  flag: string;
  abbreviation?: string;
}

interface SurvivorState {
  teams: SurvivorTeam[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export default function PlayerImpact() {
  const [survivorState, setSurvivorState] = useState<SurvivorState>({
    teams: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchSurvivors = useCallback(async () => {
    try {
      const url = `/api/world-cup-survivors?_t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setSurvivorState({
        teams: data.teams || [],
        loading: false,
        error: data.error || null,
        lastUpdated: data.lastUpdated || null,
      });
    } catch (err: any) {
      setSurvivorState({
        teams: [],
        loading: false,
        error: '剩余球队数据暂不可用',
        lastUpdated: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchSurvivors();
  }, [fetchSurvivors]);

  // 幸存球队名单
  const survivingNames = survivorState.teams.map(t => t.name);

  // 过滤后的球队评分和球员
  const filteredTeamRatings = mockTeamRatings
    .filter(team => isSurvivingTeam(team.team, survivingNames))
    .map((team, idx) => ({ ...team, rank: idx + 1 }));

  const filteredPlayers = mockPlayers
    .filter(player => isSurvivingTeam(player.team, survivingNames))
    .sort((a, b) => b.influence - a.influence);

  // 数据不可用时：完全不渲染旧数据
  if (survivorState.error) {
    return (
      <section id="players" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">球员池与阵容实力</h2>
          <p className="text-text-secondary">球队阵容评分与核心球员影响力分析</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h3 className="text-lg font-medium text-primary mb-2">剩余球队数据暂不可用</h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
            {survivorState.error}
          </p>
          <button
            onClick={fetchSurvivors}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:opacity-80 transition-opacity"
          >
            重新加载
          </button>
        </div>
      </section>
    );
  }

  // 加载中
  if (survivorState.loading) {
    return (
      <section id="players" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">球员池与阵容实力</h2>
          <p className="text-text-secondary">球队阵容评分与核心球员影响力分析</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">⚽</div>
            <p className="text-text-secondary">加载幸存球队数据...</p>
          </div>
        </div>
      </section>
    );
  }

  // 无幸存球队
  if (survivingNames.length === 0) {
    return (
      <section id="players" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">球员池与阵容实力</h2>
          <p className="text-text-secondary">球队阵容评分与核心球员影响力分析</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h3 className="text-lg font-medium text-primary mb-2">剩余球队数据暂不可用</h3>
          <p className="text-sm text-text-secondary">
            世界杯赛程数据源暂无返回可计算结果。
          </p>
        </div>
      </section>
    );
  }

  const activeTeamCount = filteredTeamRatings.length;
  const activePlayerCount = filteredPlayers.length;

  return (
    <section id="players" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">球员池与阵容实力</h2>
        <p className="text-text-secondary">
          基于 ESPN World Cup 真实赛果自动推导 · 只展示仍未淘汰球队
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: '存活球队', value: activeTeamCount, icon: '🏟️' },
          { label: '活跃球员', value: activePlayerCount * 10, icon: '⚽', suffix: '+' },
          { label: '阵容评分', value: 5, icon: '📊' },
          { label: '最后更新', value: survivorState.lastUpdated
            ? new Date(survivorState.lastUpdated).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            : '--:--', icon: '🔄', isTime: true },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-primary">
              {stat.value}
              {stat.suffix}
            </div>
            <div className="text-xs text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 球队阵容评分排行 */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="font-bold text-primary">球队阵容评分排行</h3>
            <p className="text-xs text-text-secondary mt-1">仅展示仍未淘汰球队</p>
          </div>

          {filteredTeamRatings.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-sm">
              暂无存活球队的阵容数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">排名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">球队</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">进攻</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">创造</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">控球</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">防守</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">门将</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary">综合</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTeamRatings.map(team => (
                    <tr key={team.team} className="hover:bg-bg/30">
                      <td className="px-4 py-3 font-medium">{team.rank}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span>{team.flag}</span>
                          <span className="font-medium">{team.team}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{team.attack}</td>
                      <td className="px-4 py-3 text-center">{team.creation}</td>
                      <td className="px-4 py-3 text-center">{team.possession}</td>
                      <td className="px-4 py-3 text-center">{team.defense}</td>
                      <td className="px-4 py-3 text-center">{team.goalkeeper}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-primary">{team.overall}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 核心球员影响力排行 */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="font-bold text-primary">核心球员影响力排行</h3>
            <p className="text-xs text-text-secondary mt-1">仅展示仍未淘汰球队的核心球员</p>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-sm">
              暂无存活球队的球员数据
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPlayers.map((player, idx) => (
                <div key={player.id} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-bg/30">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{player.flag}</span>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-text-secondary">({player.team})</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {player.position} · {statusLabels[player.status]}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{player.influence}</div>
                    <div className="text-xs text-text-secondary">影响力分</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
