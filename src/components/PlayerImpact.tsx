import { mockTeamRatings, mockPlayers, statusLabels } from '../data/mockPlayers';

export default function PlayerImpact() {
  return (
    <section id="players" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">球员池与阵容实力</h2>
        <p className="text-text-secondary">球队阵容评分与核心球员影响力分析</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: '纳入球队', value: 32, icon: '🏟️' },
          { label: '活跃球员池', value: 736, icon: '⚽' },
          { label: '数据指标', value: 48, icon: '📊' },
          { label: '已更新阵容', value: 28, icon: '🔄' },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-primary">{stat.value}</div>
            <div className="text-xs text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="font-bold text-primary">球队阵容评分排行</h3>
          </div>
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
                {mockTeamRatings.map(team => (
                  <tr key={team.rank} className="hover:bg-bg/30">
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
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h3 className="font-bold text-primary">核心球员影响力排行</h3>
          </div>
          <div className="divide-y divide-border">
            {mockPlayers.map((player, idx) => (
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
        </div>
      </div>
    </section>
  );
}
