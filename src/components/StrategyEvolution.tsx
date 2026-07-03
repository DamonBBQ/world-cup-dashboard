import { useState, useEffect } from 'react';

interface Strategy {
  strategy_name: string;
  league_scope: string;
  ticket_type: string;
  initial_bankroll: number;
  final_bankroll: number;
  net_profit: number;
  roi: number;
  max_drawdown: number;
  ticket_count: number;
  hit_rate: number;
  absorption_status: 'candidate' | 'observed' | 'accepted' | 'rejected';
  absorbed_at?: string;
  holdout_passed?: boolean;
  reason: string;
  risk_notes?: string[];
  next_action?: string;
}

interface BacktestSummary {
  generated_at: string;
  window: string;
  initial_bankroll: number;
  strategies: Strategy[];
  rankings: {
    by_max_bankroll: { strategy_name: string; final_bankroll: number; status: string }[];
    by_valid_sample: { strategy_name: string; ticket_count: number; status: string }[];
    by_risk_qualified: { strategy_name: string; max_drawdown: number; roi: number; status: string }[];
    by_accepted: { strategy_name: string; final_bankroll: number; roi: number; status: string }[];
  };
  model_feedback: {
    learned: string[];
    rejected_reasons: string[];
    observed_reasons: string[];
    accepted_reasons: string[];
    next_validation: string[];
  };
  policy: {
    min_observation_tickets: number;
    min_absorption_tickets: number;
    min_roi: number;
    max_drawdown_limit: number;
    allow_absorb_small_sample_profit: boolean;
    require_positive_final_bankroll: boolean;
    require_drawdown_recovery: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  accepted: 'bg-green-100 text-green-700 border-green-200',
  observed: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  candidate: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  accepted: '正式吸收',
  observed: '观察中',
  rejected: '已淘汰',
  candidate: '候选',
};

export default function StrategyEvolution() {
  const [data, setData] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRanking, setActiveRanking] = useState<'max_bankroll' | 'valid_sample' | 'risk_qualified' | 'accepted'>('accepted');

  useEffect(() => {
    fetch('/data/latest_backtest_summary.json')
      .then(res => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="evolution" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center text-text-secondary">加载策略数据...</div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section id="evolution" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700">暂未加载到策略数据，请先运行 <code className="px-1 py-0.5 bg-yellow-100 rounded">python scripts/evolution/run_strategy_evolution.py --window 3y --bankroll 500</code></p>
        </div>
      </section>
    );
  }

  const acceptedStrategies = data.strategies.filter(s => s.absorption_status === 'accepted');
  const observedStrategies = data.strategies.filter(s => s.absorption_status === 'observed');
  const rejectedStrategies = data.strategies.filter(s => s.absorption_status === 'rejected');

  const rankingData: Record<string, { title: string; data: any[]; key: string; label: string; format: (v: number) => string }> = {
    max_bankroll: { title: '全部最高资金榜', data: data.rankings.by_max_bankroll, key: 'final_bankroll', label: '最终资金', format: (v: number) => `¥${v.toFixed(2)}` },
    valid_sample: { title: '有效样本榜', data: data.rankings.by_valid_sample, key: 'ticket_count', label: '出票数', format: (v: number) => `${v}张` },
    risk_qualified: { title: '风险合格候选榜', data: data.rankings.by_risk_qualified, key: 'roi', label: 'ROI', format: (v: number) => `${(v * 100).toFixed(1)}%` },
    accepted: { title: '正式吸收策略榜', data: data.rankings.by_accepted, key: 'roi', label: 'ROI', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  };

  const current = rankingData[activeRanking];

  return (
    <section id="evolution" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">MODEL EVOLUTION / 09</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">策略自我进化与吸收规则</h2>
        <p className="text-text-secondary">
          系统自动读取历史数据 → 运行滚动回测 → 生成报告 → 判断候选策略是否可以正式吸收。
          策略只有通过样本数、盈利、最大回撤、留出测试四类门槛，才能进入正式策略库。
        </p>
      </div>

      {/* 风险门槛卡片 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">风险门槛</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{data.policy.min_observation_tickets}</div>
            <div className="text-xs text-text-secondary mt-1">最低有效样本（张）</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{data.policy.min_absorption_tickets}</div>
            <div className="text-xs text-text-secondary mt-1">正式吸收最低样本（张）</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-red-500">{(data.policy.max_drawdown_limit * 100).toFixed(0)}%</div>
            <div className="text-xs text-text-secondary mt-1">最大回撤底线</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">否</div>
            <div className="text-xs text-text-secondary mt-1">小样本高收益仅观察</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-500">降仓</div>
            <div className="text-xs text-text-secondary mt-1">回撤超阈值自动降仓</div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-bg/50 rounded text-xs text-text-secondary">
          正式吸收必须同时满足：样本数 ≥ 30张 + ROI {'>'} 0 + 最大回撤 ≤ -30% + 留出测试通过。
          小样本高收益只能观察，不能进入正式策略库。不允许为了提高历史收益反复调参。
        </div>
      </div>

      {/* 最新吸收策略 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">最新正式吸收策略</h3>
        {acceptedStrategies.length === 0 ? (
          <div className="bg-bg/50 border border-border rounded-lg p-6 text-center text-text-secondary">
            暂无正式吸收策略
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedStrategies.map(s => (
              <div key={s.strategy_name} className="bg-card border border-green-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-primary text-lg">{s.strategy_name}</h4>
                    <div className="text-sm text-text-secondary mt-1">
                      {s.league_scope} · {s.ticket_type}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-sm font-medium">
                    ✓ {STATUS_LABELS[s.absorption_status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                  {[
                    { label: '初始资金', value: `¥${s.initial_bankroll}`, highlight: false },
                    { label: '最终资金', value: `¥${s.final_bankroll}`, highlight: true },
                    { label: '净盈利', value: `¥${s.net_profit}`, highlight: true },
                    { label: 'ROI', value: `${(s.roi * 100).toFixed(2)}%`, highlight: true },
                    { label: '最大回撤', value: `${(s.max_drawdown * 100).toFixed(2)}%`, highlight: false },
                    { label: '出票数', value: `${s.ticket_count}张`, highlight: false },
                    { label: '命中率', value: `${(s.hit_rate * 100).toFixed(2)}%`, highlight: false },
                  ].map((stat, i) => (
                    <div key={i} className={`p-3 rounded ${stat.highlight ? 'bg-primary text-white' : 'bg-bg/50'}`}>
                      <div className={`text-xs ${stat.highlight ? 'opacity-80' : 'text-text-secondary'}`}>{stat.label}</div>
                      <div className="font-bold text-sm mt-1">{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded text-sm text-green-700 mb-2">
                  <strong>吸收原因：</strong>{s.reason}
                </div>
                {s.risk_notes && s.risk_notes.length > 0 && (
                  <div className="space-y-1">
                    {s.risk_notes.map((note, i) => (
                      <div key={i} className="text-xs text-text-secondary flex items-start gap-2">
                        <span className="text-yellow-600">⚠</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 策略排行榜 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">策略排行榜（拆分展示）</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'accepted', label: '正式吸收策略榜' },
            { key: 'risk_qualified', label: '风险合格候选榜' },
            { key: 'valid_sample', label: '有效样本榜' },
            { key: 'max_bankroll', label: '全部最高资金榜' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveRanking(tab.key as typeof activeRanking)}
              className={`px-4 py-2 text-sm rounded border transition-colors ${
                activeRanking === tab.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-secondary border-border hover:border-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-3">{current.title}</div>
          {current.data.length === 0 ? (
            <div className="text-center text-text-secondary py-4">暂无数据</div>
          ) : (
            <div className="space-y-2">
              {current.data.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-bg/50 rounded">
                  <span className="text-xs font-bold text-text-secondary w-6">#{i + 1}</span>
                  <span className="text-sm flex-1 truncate" title={item.strategy_name}>{item.strategy_name}</span>
                  <span className="text-sm font-medium w-24 text-right">
                    {current.format(
                      activeRanking === 'max_bankroll' ? item.final_bankroll :
                      activeRanking === 'valid_sample' ? item.ticket_count :
                      activeRanking === 'risk_qualified' ? item.roi :
                      item.roi
                    )}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[item.status] || ''}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-text-secondary">
          ⚠️ 排行榜拆分展示，避免1张票中奖的小样本把视线带偏。正式吸收策略榜只展示通过全部门槛的策略。
        </div>
      </div>

      {/* 策略状态表格 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">策略状态总览</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-bg/50">
                <th className="px-3 py-2 text-left text-xs text-text-secondary">策略名</th>
                <th className="px-3 py-2 text-left text-xs text-text-secondary">联赛</th>
                <th className="px-3 py-2 text-left text-xs text-text-secondary">票型</th>
                <th className="px-3 py-2 text-center text-xs text-text-secondary">出票数</th>
                <th className="px-3 py-2 text-right text-xs text-text-secondary">ROI</th>
                <th className="px-3 py-2 text-right text-xs text-text-secondary">最大回撤</th>
                <th className="px-3 py-2 text-center text-xs text-text-secondary">状态</th>
                <th className="px-3 py-2 text-left text-xs text-text-secondary">原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.strategies.map((s, i) => (
                <tr key={i} className="hover:bg-bg/30">
                  <td className="px-3 py-2 font-medium text-xs">{s.strategy_name}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{s.league_scope}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{s.ticket_type}</td>
                  <td className="px-3 py-2 text-center text-xs">{s.ticket_count}</td>
                  <td className={`px-3 py-2 text-right text-xs font-medium ${s.roi > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(s.roi * 100).toFixed(1)}%
                  </td>
                  <td className={`px-3 py-2 text-right text-xs ${s.max_drawdown < -0.30 ? 'text-red-500 font-medium' : 'text-text-secondary'}`}>
                    {(s.max_drawdown * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[s.absorption_status] || ''}`}>
                      {STATUS_LABELS[s.absorption_status] || s.absorption_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary max-w-xs truncate" title={s.reason}>{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 模型反馈摘要 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">模型反馈摘要</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-700 text-sm mb-3">✓ 正式吸收（{acceptedStrategies.length}）</h4>
            <div className="space-y-1">
              {data.model_feedback.accepted_reasons.map((r, i) => (
                <div key={i} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-green-600">▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-yellow-700 text-sm mb-3">○ 观察中（{observedStrategies.length}）</h4>
            <div className="space-y-1">
              {data.model_feedback.observed_reasons.map((r, i) => (
                <div key={i} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-yellow-600">▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-red-200 rounded-lg p-4">
            <h4 className="font-bold text-red-700 text-sm mb-3">✗ 已淘汰（{rejectedStrategies.length}）</h4>
            <div className="space-y-1">
              {data.model_feedback.rejected_reasons.map((r, i) => (
                <div key={i} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-red-500">▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-bold text-primary text-sm mb-3">→ 下一轮验证</h4>
            <div className="space-y-1">
              {data.model_feedback.next_validation.map((r, i) => (
                <div key={i} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-primary">▸</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 学到了什么 */}
        <div className="mt-4 bg-primary text-white rounded-lg p-6">
          <h4 className="font-bold mb-3">这轮学到了什么</h4>
          <div className="space-y-2">
            {data.model_feedback.learned.map((l, i) => (
              <div key={i} className="text-sm flex items-start gap-2">
                <span className="opacity-60">{i + 1}.</span>
                <span className="opacity-90">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 策略状态说明 */}
      <div className="mb-8">
        <h3 className="font-bold text-primary mb-4">策略状态说明</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="font-bold text-blue-700 text-sm mb-1">candidate 候选</div>
            <div className="text-xs text-text-secondary">新策略进入系统，尚未达到评估门槛</div>
          </div>
          <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
            <div className="font-bold text-yellow-700 text-sm mb-1">observed 观察</div>
            <div className="text-xs text-text-secondary">样本数≥10但未达正式吸收门槛，或回撤超标</div>
          </div>
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="font-bold text-green-700 text-sm mb-1">accepted 正式吸收</div>
            <div className="text-xs text-text-secondary">样本≥30 + ROI&gt;0 + 回撤≤-30% + 留出测试通过</div>
          </div>
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="font-bold text-red-700 text-sm mb-1">rejected 淘汰</div>
            <div className="text-xs text-text-secondary">ROI为负或严重亏损，不再使用</div>
          </div>
        </div>
      </div>

      {/* 合规提示 */}
      <div className="p-4 bg-primary text-white rounded-lg text-sm">
        ⚠️ 以上所有策略评估和回测结果均为模拟分析，不构成投注建议。历史表现不代表未来结果。
        系统不接入真实购彩、支付、充值或开户链接。请遵守所在地法律法规，理性参与，未成年人禁止使用相关功能。
      </div>
    </section>
  );
}
