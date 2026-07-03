import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { calculateWinDrawLose, mockMatchFeatures } from '../utils/probabilityEngine';
import { calculateExpectedGoals, calculateTotalGoalDistribution, calculateXG, getTopScorelines, mapScoreToConditions, mockXGData } from '../utils/goalEngine';
import { removeMargin, blendModelAndMarket, calculateDivergence, mockOdds } from '../utils/oddsEngine';
import { mockLineupData, applyConfirmedLineupAdjustment, applyActiveSquadAdjustment } from '../utils/lineupEngine';
import { FUND_ALLOCATIONS } from '../utils/ticketSplitEngine';

export default function PredictionEngine() {
  const [showFormula, setShowFormula] = useState(false);
  const [showMethodNote, setShowMethodNote] = useState(false);
  const [selectedScore, setSelectedScore] = useState<string | null>(null);

  // 计算西班牙 vs 奥地利的完整概率
  const features = mockMatchFeatures['spain_vs_austria'];
  const modelProbs = calculateWinDrawLose(features);
  const odds = mockOdds['spain_vs_austria'];
  const marketProbs = removeMargin(odds);
  const blendedProbs = blendModelAndMarket(modelProbs, marketProbs);
  const divergence = calculateDivergence(modelProbs, marketProbs);

  // xG 和比分矩阵
  const xgData = mockXGData['spain_vs_austria'];
  const { homeXg, awayXg } = calculateXG(xgData.homeRating, xgData.awayRating, xgData.goalMultiplier);
  const topScores = getTopScorelines(homeXg, awayXg, 5);
  const goalDist = calculateTotalGoalDistribution(calculateExpectedGoals(2.50, features.goal_environment, 0.50));

  // 阵容修正
  const spainLineup = mockLineupData.spain;
  const spainAdj = applyConfirmedLineupAdjustment(spainLineup.systemRating, spainLineup.starterAvg, spainLineup.originalAvg);
  const austriaLineup = mockLineupData.austria;
  const austriaAdj = applyActiveSquadAdjustment(austriaLineup.systemRating, austriaLineup.squadDepth, austriaLineup.originalAvg);

  return (
    <section id="engine" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">PREDICTION ENGINE / 06</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">预测引擎与出票风控逻辑</h2>
        <p className="text-text-secondary max-w-3xl">
          球队实力模型 + 球员评分模型 + 阵容修正 + 赔率去水融合 + 进球分布模拟 + 出票组合风控。
          系统不是单纯猜比分，而是先计算每场比赛的概率结构，再把概率结构转成小额多票组合。
        </p>
        <button
          onClick={() => setShowMethodNote(!showMethodNote)}
          className="mt-3 text-sm border border-primary text-primary px-4 py-1.5 rounded hover:bg-primary/5"
        >
          查看方法说明
        </button>
        {showMethodNote && (
          <div className="mt-3 p-4 bg-bg/50 border border-border rounded-lg text-sm text-text-secondary max-w-3xl">
            系统追求的不是单场必中，而是让票组结构更合理、相关性更低、漏洞保护更完整。所有概率输出均为模拟，不构成投注建议。
          </div>
        )}
      </div>

      {/* 两条预测线 */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-primary rounded-full" />
            <h3 className="font-bold text-primary">当前世界杯实战预测线</h3>
          </div>
          <p className="text-sm text-text-secondary mb-4">用于今天/剩余比赛预测、概率输出、比分池生成和模拟出票。</p>
          <div className="flex flex-wrap gap-2">
            {['当前球队系统评分', '当前球员评分', '首发/活跃阵容', '伤停停赛', '天气环境', '胜平负赔率', '大小球赔率', '赛程阶段'].map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-bg/60 text-text-secondary rounded">{t}</span>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-accent rounded-full" />
            <h3 className="font-bold text-primary">历史滚动回测线</h3>
          </div>
          <p className="text-sm text-text-secondary mb-4">用于拿过去比赛模拟预测、验证方法、修正权重。</p>
          <div className="flex flex-wrap gap-2">
            {['只能使用赛前已有数据', '严格防止未来数据泄露', '时间切分训练/验证/测试', '候选模型通过验证才升级'].map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-accent/20 text-primary rounded">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 数据层 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">数据层</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: '历史比赛', value: '15508', suffix: '场' },
            { label: '2026活跃球员池', value: '571', suffix: '人' },
            { label: 'PIT历史球员池', value: '2087', suffix: '人' },
            { label: '有评分球员', value: '1717', suffix: '人' },
            { label: 'PIT历史球员特征比赛', value: '199', suffix: '场' },
            { label: '历史CSV非零球员特征', value: '126', suffix: '场', highlight: true }
          ].map((stat, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg ${stat.highlight ? 'bg-accent' : 'bg-primary'} text-white`}
            >
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs opacity-80">{stat.label}{stat.suffix}</div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          ⚠️ 球员层已接入，但长期历史回测覆盖仍需持续完善。
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {['球队历史实力', '近期状态', '进攻/防守表现', '主场因素', '球员评分', '首发/活跃阵容', '伤停停赛', '主教练磨合', '天气/气温/风速/海拔', '胜平负赔率', '大小球赔率', '历史回测结果'].map(t => (
            <span key={t} className="text-xs px-3 py-1.5 border border-border text-text-secondary rounded">{t}</span>
          ))}
        </div>
      </div>

      {/* 球队基础评分 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary">球队基础评分模型</h3>
          <button onClick={() => setShowFormula(!showFormula)} className="text-sm border border-primary text-primary px-3 py-1 rounded">
            {showFormula ? '收起公式' : '展开公式'}
          </button>
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg/50">
                <th className="px-3 py-2 text-left text-xs text-text-secondary">特征</th>
                <th className="px-3 py-2 text-left text-xs text-text-secondary">含义</th>
                <th className="px-3 py-2 text-right text-xs text-text-secondary">默认权重</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['strength_diff', '主客队综合强弱差', '0.24'],
                ['form_diff', '近期状态差', '0.20'],
                ['home_advantage', '主场/准主场优势', '0.12'],
                ['injury_diff', '伤停差（历史多为0）', '0.10'],
                ['attack_diff', '进攻能力差', '0.14'],
                ['player_strength_diff', '首发球员实力差', '0.10'],
                ['lineup_depth_diff', '阵容深度差', '0.06'],
                ['availability_diff', '可用阵容/评分覆盖差', '0.04'],
                ['goal_environment', '联赛或赛事进球环境', '—']
              ].map(row => (
                <tr key={row[0]}>
                  <td className="px-3 py-2 font-mono text-xs">{row[0]}</td>
                  <td className="px-3 py-2 text-text-secondary">{row[1]}</td>
                  <td className="px-3 py-2 text-right font-medium">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-secondary">所有特征统一压缩到 -1 到 1 区间。正数表示主队占优，负数表示客队占优。</p>
        {showFormula && (
          <div className="mt-4 p-4 bg-bg/50 rounded font-mono text-xs space-y-2">
            <div>edge =</div>
            <div className="pl-4">strength_diff * 0.24 + form_diff * 0.20 + home_advantage * 0.12</div>
            <div className="pl-4">+ injury_diff * 0.10 + attack_diff * 0.14 + player_strength_diff * 0.10</div>
            <div className="pl-4">+ lineup_depth_diff * 0.06 + availability_diff * 0.04</div>
            <div className="pt-2">draw_logit = draw_bias - 0.45 * abs(edge)</div>
            <div className="pt-2 text-text-secondary">→ softmax(edge), softmax(draw_logit), softmax(-edge)</div>
          </div>
        )}
      </div>

      {/* 胜平负概率计算 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">胜平负概率计算 · 西班牙 vs 奥地利</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="bg-primary text-white p-4 rounded-lg">
            <div className="text-xs opacity-80">主胜概率</div>
            <div className="text-2xl font-bold">{(modelProbs.home * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-bg/60 p-4 rounded-lg">
            <div className="text-xs text-text-secondary">平局概率</div>
            <div className="text-2xl font-bold text-primary">{(modelProbs.draw * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-bg/60 p-4 rounded-lg">
            <div className="text-xs text-text-secondary">客胜概率</div>
            <div className="text-2xl font-bold text-text-secondary">{(modelProbs.away * 100).toFixed(1)}%</div>
          </div>
        </div>
        <p className="text-xs text-text-secondary">edge = {modelProbs.edge.toFixed(3)}，双方越接近平局概率越高，强弱差越大平局概率越低。</p>
      </div>

      {/* 进球分布模拟 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">进球分布模拟</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-text-secondary mb-2">公式：expected_goals = 2.50 + goal_environment * 0.50</div>
            <div className="text-lg font-bold text-primary mb-4">
              预期总进球：{calculateExpectedGoals(2.50, features.goal_environment, 0.50).toFixed(2)}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={goalDist}>
                <XAxis dataKey="goals" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Bar dataKey="probability" fill="#183D2B" radius={[2, 2, 0, 0]}>
                  {goalDist.map((_, i) => (
                    <Cell key={i} fill={i === 4 ? '#DFFF4A' : '#183D2B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center space-y-2">
            {goalDist.map(g => (
              <div key={g.goals} className="flex items-center gap-3">
                <span className="text-sm w-12">{g.goals}</span>
                <div className="flex-1 bg-bg/50 rounded h-6 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded"
                    style={{ width: `${g.probability * 100 * 3}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{(g.probability * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 阵容修正 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">阵容修正</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-bold text-primary mb-3">西班牙（确认首发）</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">系统评分</span><span className="font-medium">{spainLineup.systemRating}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">首发均分</span><span className="font-medium">{spainLineup.starterAvg}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">阵容修正</span><span className="font-medium text-green-600">+{spainAdj.adjustment.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">实战评分</span><span className="font-bold text-primary text-lg">{spainAdj.adjustedRating.toFixed(2)}</span></div>
            </div>
            <div className="mt-3 p-2 bg-bg/50 rounded text-xs text-text-secondary font-mono">
              评分 + (首发均分 - 原阵容均分) * 0.55
            </div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-bold text-primary mb-3">奥地利（活跃名单）</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">系统评分</span><span className="font-medium">{austriaLineup.systemRating}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">活跃阵容深度</span><span className="font-medium">{austriaLineup.squadDepth}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">阵容修正</span><span className="font-medium text-red-600">{austriaAdj.adjustment.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-bold">实战评分</span><span className="font-bold text-primary text-lg">{austriaAdj.adjustedRating.toFixed(2)}</span></div>
            </div>
            <div className="mt-3 p-2 bg-bg/50 rounded text-xs text-text-secondary font-mono">
              评分 + (活跃深度 - 原阵容均分) * 0.35
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-bg/50 rounded text-xs text-text-secondary">
          阵容深度评分 = 前11人评分 * 85% + 替补深度评分 * 15%
        </div>
      </div>

      {/* xG 与比分矩阵 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">xG 与比分矩阵 · 西班牙 vs 奥地利</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-primary text-white p-4 rounded-lg">
                <div className="text-xs opacity-80">主队 xG</div>
                <div className="text-2xl font-bold">{homeXg.toFixed(2)}</div>
              </div>
              <div className="bg-bg/60 p-4 rounded-lg">
                <div className="text-xs text-text-secondary">客队 xG</div>
                <div className="text-2xl font-bold text-text-secondary">{awayXg.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-xs text-text-secondary space-y-1 font-mono">
              <div>home_xg = 1.25 * exp(diff / 32) * multiplier</div>
              <div>away_xg = 1.05 * exp(-diff / 32) * multiplier</div>
            </div>
            <div className="mt-4 p-3 bg-bg/50 rounded text-xs">
              <div className="text-text-secondary mb-1">总进球中心</div>
              <div className="font-bold text-primary text-lg">{(homeXg + awayXg).toFixed(2)} 球</div>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-3">比分概率池</h4>
            <div className="space-y-2">
              {topScores.map(s => (
                <div key={s.score}>
                  <button
                    onClick={() => setSelectedScore(selectedScore === s.score ? null : s.score)}
                    className="w-full flex items-center gap-3 p-2 bg-bg/50 rounded hover:bg-bg transition-colors text-left"
                  >
                    <span className="font-mono font-bold text-primary w-12">{s.score}</span>
                    <div className="flex-1 bg-border rounded h-5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded"
                        style={{ width: `${s.probability * 100 * 5}%` }}
                      />
                    </div>
                    <span className="font-medium w-12 text-right text-sm">{(s.probability * 100).toFixed(1)}%</span>
                  </button>
                  {selectedScore === s.score && (
                    <div className="mt-1 ml-4 p-3 bg-accent/10 border border-accent/30 rounded text-xs space-y-1">
                      <div className="font-bold text-primary">条件映射：{s.score}</div>
                      {mapScoreToConditions(s.home, s.away).map(c => (
                        <div key={c} className="text-text-secondary">→ {c}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 赔率去水融合 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">赔率去水融合 · 西班牙 vs 奥地利</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg/50">
                <th className="px-4 py-2 text-left text-xs text-text-secondary">方向</th>
                <th className="px-4 py-2 text-right text-xs text-text-secondary">赔率</th>
                <th className="px-4 py-2 text-right text-xs text-text-secondary">模型概率</th>
                <th className="px-4 py-2 text-right text-xs text-text-secondary">去水赔率概率</th>
                <th className="px-4 py-2 text-right text-xs text-text-secondary">融合后概率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-medium">主胜</td>
                <td className="px-4 py-2 text-right font-mono">{odds.home}</td>
                <td className="px-4 py-2 text-right">{(modelProbs.home * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right">{(marketProbs.home * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right font-bold text-primary">{(blendedProbs.home * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">平局</td>
                <td className="px-4 py-2 text-right font-mono">{odds.draw}</td>
                <td className="px-4 py-2 text-right">{(modelProbs.draw * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right">{(marketProbs.draw * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right font-bold text-primary">{(blendedProbs.draw * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">客胜</td>
                <td className="px-4 py-2 text-right font-mono">{odds.away}</td>
                <td className="px-4 py-2 text-right">{(modelProbs.away * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right">{(marketProbs.away * 100).toFixed(1)}%</td>
                <td className="px-4 py-2 text-right font-bold text-primary">{(blendedProbs.away * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-text-secondary">融合公式：模型概率 * 80% + 去水赔率概率 * 20%</span>
          <span className={`text-xs px-3 py-1 rounded ${
            divergence.level === '低' ? 'bg-green-100 text-green-700' :
            divergence.level === '中' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            模型vs赔率分歧：{divergence.level}（{divergence.details}）
          </span>
        </div>
      </div>

      {/* 资金分层 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="font-bold text-primary mb-4">资金分层与票型结构</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {FUND_ALLOCATIONS.map(a => (
            <div key={a.type} className="border border-border rounded-lg p-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-bold text-primary">{a.type}票</span>
                <span className="text-lg font-bold">{(a.ratio * 100).toFixed(0)}%</span>
              </div>
              <div className="text-xs text-text-secondary">{a.label}</div>
              <div className="text-xs text-text-secondary mt-1">{a.description}</div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-bg/50 rounded text-xs text-text-secondary">
          最多票数：7张 · 最小金额：2元 · 单票最大占比：25% · 同一条件最大暴露：45% · 比分票最大占比：8% · 默认空仓：6%
        </div>
      </div>

      {/* 合规提示 */}
      <div className="p-4 bg-primary text-white rounded-lg text-sm">
        ⚠️ 以上所有概率、比分池和票组结构均为模拟分析，不构成投注建议。历史表现不代表未来结果，请遵守所在地法律法规，理性参与，未成年人禁止使用相关功能。
      </div>
    </section>
  );
}
