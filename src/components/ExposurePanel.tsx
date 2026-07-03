import { useState, useMemo } from 'react';
import { calculateConditionExposure, generateExposureWarnings } from '../utils/exposureEngine';
import { generateExampleTickets } from '../utils/ticketSplitEngine';
import type { SplitTicket } from '../utils/ticketSplitEngine';

export default function ExposurePanel() {
  const [budget, setBudget] = useState(100);

  const tickets: SplitTicket[] = useMemo(() => generateExampleTickets(), []);
  const exposures = useMemo(() => calculateConditionExposure(tickets, budget), [tickets, budget]);
  const warnings = useMemo(() => generateExposureWarnings(exposures, budget), [exposures, budget]);

  const riskColors: Record<string, string> = {
    '低': 'bg-green-500',
    '中': 'bg-yellow-500',
    '高': 'bg-red-500'
  };

  return (
    <section id="exposure" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">EXPOSURE CONTROL / 07</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">相关性控制</h2>
        <p className="text-text-secondary">统计每个条件绑定了多少钱，防止集中暴露</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm text-text-secondary">总预算</label>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(Math.max(1, Math.min(100000, Number(e.target.value))))}
            className="px-3 py-1.5 border border-border rounded text-sm w-32"
          />
          <span className="text-sm text-text-secondary">元</span>
        </div>

        {/* 暴露条形图 */}
        <div className="space-y-3 mb-6">
          {exposures.slice(0, 10).map((exp, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-64 truncate" title={exp.condition}>
                {exp.condition}
              </span>
              <div className="flex-1 bg-bg/50 rounded h-6 overflow-hidden relative">
                <div
                  className={`h-full rounded transition-all ${riskColors[exp.riskLevel]}`}
                  style={{ width: `${Math.min(100, exp.ratio * 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium">
                  ¥{exp.amount} ({(exp.ratio * 100).toFixed(0)}%)
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                exp.riskLevel === '低' ? 'bg-green-100 text-green-700' :
                exp.riskLevel === '中' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {exp.riskLevel}
              </span>
            </div>
          ))}
        </div>

        {/* 规则说明 */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          <div className="p-3 border border-green-200 bg-green-50 rounded">
            <div className="text-xs font-bold text-green-700 mb-1">≤ 40%</div>
            <div className="text-xs text-green-600">正常范围</div>
          </div>
          <div className="p-3 border border-yellow-200 bg-yellow-50 rounded">
            <div className="text-xs font-bold text-yellow-700 mb-1">40% - 60%</div>
            <div className="text-xs text-yellow-600">风险偏高，注意控制</div>
          </div>
          <div className="p-3 border border-red-200 bg-red-50 rounded">
            <div className="text-xs font-bold text-red-700 mb-1">&gt; 60%</div>
            <div className="text-xs text-red-600">建议削减暴露</div>
          </div>
        </div>

        {/* 告警 */}
        <div className="space-y-2">
          <h4 className="font-bold text-primary text-sm">告警信息</h4>
          {warnings.map((w, i) => (
            <div key={i} className="p-3 bg-bg/50 rounded text-xs text-text-secondary flex items-start gap-2">
              <span className="text-primary">▸</span>
              <span>{w}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-primary text-white rounded text-xs">
          不为了花完预算硬出票，可以保留空仓。以上为模拟分析，不构成投注建议。
        </div>
      </div>
    </section>
  );
}
