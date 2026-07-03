import { useMemo } from 'react';

export default function ScorePanel() {
  // mock 组合评分数据
  const scoreData = useMemo(() => ({
    totalScore: 72.5,
    hitProbability: 68.0,
    expectedReturn: 15.2,
    coverageCompleteness: 80.0,
    correlationPenalty: 12.0,
    downsideRisk: 18.0,
    coverage: [
      { item: '主胜小胜', covered: true },
      { item: '主胜大胜', covered: true },
      { item: '平局', covered: true },
      { item: '0球', covered: false },
      { item: '1球', covered: true },
      { item: '2球', covered: true },
      { item: '3球', covered: false },
      { item: '冷门', covered: true },
      { item: '精确比分', covered: true },
      { item: '漏洞保护', covered: true }
    ]
  }), []);

  const scoreBreakdown = [
    { label: '命中概率', value: scoreData.hitProbability, weight: 0.30, positive: true },
    { label: '预期收益', value: scoreData.expectedReturn, weight: 0.25, positive: true },
    { label: '覆盖完整度', value: scoreData.coverageCompleteness, weight: 0.20, positive: true },
    { label: '相关性惩罚', value: scoreData.correlationPenalty, weight: 0.15, positive: false },
    { label: '下行情景风险', value: scoreData.downsideRisk, weight: 0.10, positive: false }
  ];

  return (
    <section id="score" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">PORTFOLIO SCORE / 09</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">组合评分</h2>
        <p className="text-text-secondary">综合评分 = 命中概率×0.30 + 预期收益×0.25 + 覆盖完整度×0.20 - 相关性惩罚×0.15 - 下行情景风险×0.10</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 综合评分 */}
        <div className="bg-primary text-white rounded-lg p-6 flex flex-col items-center justify-center">
          <div className="text-xs opacity-80 mb-2">综合评分</div>
          <div className="text-5xl font-bold">{scoreData.totalScore.toFixed(1)}</div>
          <div className="text-xs opacity-80 mt-2">/ 100</div>
        </div>

        {/* 分项评分 */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <h4 className="font-bold text-primary mb-4">分项评分</h4>
          <div className="space-y-4">
            {scoreBreakdown.map(s => (
              <div key={s.label} className="flex items-center gap-4">
                <span className="text-sm w-28">{s.label}</span>
                <span className="text-xs text-text-secondary w-12">×{s.weight}</span>
                <div className="flex-1 bg-bg/50 rounded h-6 overflow-hidden relative">
                  <div
                    className={`h-full rounded ${s.positive ? 'bg-primary' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, s.value)}%` }}
                  />
                </div>
                <span className={`text-sm font-medium w-16 text-right ${s.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {s.positive ? '+' : '-'}{s.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 覆盖项 checklist */}
      <div className="bg-card border border-border rounded-lg p-6 mt-6">
        <h4 className="font-bold text-primary mb-4">覆盖项 Checklist</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {scoreData.coverage.map(c => (
            <div
              key={c.item}
              className={`p-3 rounded-lg border ${c.covered ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-center gap-2">
                <span className={c.covered ? 'text-green-600' : 'text-red-500'}>
                  {c.covered ? '✓' : '✗'}
                </span>
                <span className="text-sm font-medium">{c.item}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-primary text-white rounded text-xs">
        以上为模拟分析，不构成投注建议。历史表现不代表未来结果。
      </div>
    </section>
  );
}
