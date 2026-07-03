import { useState, useMemo } from 'react';
import { detectDownsideScenarios, suggestDefensiveTickets } from '../utils/leakageDetector';
import { generateExampleTickets } from '../utils/ticketSplitEngine';

export default function LeakagePanel() {
  const [budget] = useState(100);

  const tickets = useMemo(() => generateExampleTickets(), []);
  const results = useMemo(() => detectDownsideScenarios(tickets), [tickets]);
  const suggestions = useMemo(() => suggestDefensiveTickets(results), [results]);

  return (
    <section id="leakage" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">LEAKAGE DETECTION / 08</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">漏洞检测</h2>
        <p className="text-text-secondary">模拟常见比分情景，检测票组漏洞并建议防守票</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        {/* 场景结果表格 */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-bg/50">
                <th className="px-3 py-2 text-left text-xs text-text-secondary">情景</th>
                <th className="px-3 py-2 text-left text-xs text-text-secondary">说明</th>
                <th className="px-3 py-2 text-center text-xs text-text-secondary">命中票数</th>
                <th className="px-3 py-2 text-center text-xs text-text-secondary">死票数</th>
                <th className="px-3 py-2 text-right text-xs text-text-secondary">资金回撤</th>
                <th className="px-3 py-2 text-center text-xs text-text-secondary">需防守</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((r, i) => (
                <tr key={i} className={r.needsDefensive ? 'bg-red-50' : ''}>
                  <td className="px-3 py-2 font-medium">{r.scenario.name}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{r.scenario.description}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-green-600">{r.hitTickets.length}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={r.deadTickets.length > 0 ? 'text-red-600 font-bold' : ''}>{r.deadTickets.length}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">¥{r.totalDrawdown}</td>
                  <td className="px-3 py-2 text-center">
                    {r.needsDefensive ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">是</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">否</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 防守建议 */}
        <div className="mb-6">
          <h4 className="font-bold text-primary text-sm mb-3">防守票建议</h4>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="p-3 bg-bg/50 rounded text-xs text-text-secondary flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 常见偏差场景说明 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: '强队1:0小胜', risk: '低进球偏差', action: '补0/3球' },
            { name: '0:0互交白卷', risk: '极低进球', action: '补0球+平局' },
            { name: '2:2对攻', risk: '高进球偏差', action: '补4+球' },
            { name: '3球偏离', risk: '高进球极端', action: '补3球+大比分' }
          ].map(s => (
            <div key={s.name} className="border border-border rounded-lg p-3">
              <div className="font-bold text-primary text-sm mb-1">{s.name}</div>
              <div className="text-xs text-text-secondary mb-2">{s.risk}</div>
              <div className="text-xs px-2 py-1 bg-accent/20 text-primary rounded inline-block">建议：{s.action}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-primary text-white rounded text-xs">
          以上为模拟分析，不构成投注建议。
        </div>
      </div>
    </section>
  );
}
