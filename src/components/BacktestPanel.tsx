import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { splitByTime, explainModelErrors, CURRENT_MODEL_PERFORMANCE, testFinalModel } from '../utils/modelEvolution';

const backtestData = [
  { match: 'M1', accuracy: 75 },
  { match: 'M2', accuracy: 82 },
  { match: 'M3', accuracy: 68 },
  { match: 'M4', accuracy: 88 },
  { match: 'M5', accuracy: 72 },
  { match: 'M6', accuracy: 90 },
  { match: 'M7', accuracy: 78 },
  { match: 'M8', accuracy: 85 },
  { match: 'M9', accuracy: 70 },
  { match: 'M10', accuracy: 83 },
];

const strategyData = [
  { strategy: '稳健优先', winRate: 72, profit: 15 },
  { strategy: '均衡组合', winRate: 65, profit: 28 },
  { strategy: '防冷保护', winRate: 58, profit: 42 },
  { strategy: '小额搏冷', winRate: 45, profit: 65 },
];

export default function BacktestPanel() {
  const [showTimeSplit, setShowTimeSplit] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const timeSplit = splitByTime(15508);
  const errors = explainModelErrors();
  const modelResult = testFinalModel();

  return (
    <section id="backtest" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-text-secondary mb-2 tracking-widest">MODEL EVOLUTION / 10</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">历史回测与方法进化</h2>
        <p className="text-text-secondary">基于历史数据的策略回测与模型校准</p>
      </div>

      {/* 当前模型效果 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: '胜平负方向正确率', value: (CURRENT_MODEL_PERFORMANCE.directionAccuracy * 100).toFixed(1), unit: '%' },
          { label: 'Brier概率误差', value: CURRENT_MODEL_PERFORMANCE.brierScore.toFixed(3), unit: '' },
          { label: '总进球误差MAE', value: CURRENT_MODEL_PERFORMANCE.goalMae.toFixed(2), unit: '' },
          { label: '精确总进球命中', value: (CURRENT_MODEL_PERFORMANCE.exactGoalAccuracy * 100).toFixed(1), unit: '%' },
        ].map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stat.value}<span className="text-sm">{stat.unit}</span></div>
            <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 模型擅长与不擅长 */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-700 text-sm mb-3">✓ 当前模型更擅长</h4>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• 判断主方向</li>
            <li>• 识别高风险场次</li>
            <li>• 生成票组结构</li>
            <li>• 控制相关性</li>
            <li>• 寻找漏洞保护</li>
          </ul>
        </div>
        <div className="bg-card border border-red-200 rounded-lg p-4">
          <h4 className="font-bold text-red-700 text-sm mb-3">✗ 当前模型不擅长</h4>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• 稳定命中精确比分</li>
            <li>• 稳定命中精确总进球</li>
            <li>• 高倍串关命中</li>
          </ul>
        </div>
      </div>

      {/* 图表 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-primary mb-4">最近10场预测准确度变化</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={backtestData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
              <XAxis dataKey="match" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#1a3c34" strokeWidth={2} dot={{ fill: '#1a3c34' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="font-bold text-primary mb-4">不同策略表现对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={strategyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
              <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" orientation="left" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="winRate" name="命中率(%)" fill="#1a3c34" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="profit" name="收益率(%)" fill="#ccff33" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 时间切分 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary">时间切分</h3>
          <button onClick={() => setShowTimeSplit(!showTimeSplit)} className="text-sm border border-primary text-primary px-3 py-1 rounded">
            {showTimeSplit ? '收起详情' : '展开详情'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary text-white p-4 rounded-lg text-center">
            <div className="text-3xl font-bold">{(timeSplit.train.ratio * 100).toFixed(0)}%</div>
            <div className="text-xs opacity-80">训练段</div>
            <div className="text-xs opacity-60 mt-1">{timeSplit.train.count} 场</div>
          </div>
          <div className="bg-accent text-primary p-4 rounded-lg text-center">
            <div className="text-3xl font-bold">{(timeSplit.validation.ratio * 100).toFixed(0)}%</div>
            <div className="text-xs">验证段</div>
            <div className="text-xs opacity-70 mt-1">{timeSplit.validation.count} 场</div>
          </div>
          <div className="bg-bg/60 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-text-secondary">{(timeSplit.test.ratio * 100).toFixed(0)}%</div>
            <div className="text-xs text-text-secondary">测试段</div>
            <div className="text-xs text-text-secondary mt-1">{timeSplit.test.count} 场</div>
          </div>
        </div>
        {showTimeSplit && (
          <div className="mt-4 p-4 bg-bg/50 rounded text-xs text-text-secondary space-y-2">
            <div>• 训练段用来找候选权重</div>
            <div>• 验证段决定是否采用</div>
            <div>• 测试段只做最终报告</div>
            <div>• 不能用测试集反复调参</div>
            <div>• 每场比赛只能使用赛前已有数据</div>
            <div className="pt-2 text-primary font-medium">当前模型版本：{modelResult.runId > 0 ? `v${modelResult.runId}` : 'pending'}，状态：{modelResult.status === 'accepted' ? '已通过验证' : '待验证'}</div>
          </div>
        )}
      </div>

      {/* 错误归因 */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary">错误归因</h3>
          <button onClick={() => setShowErrors(!showErrors)} className="text-sm border border-primary text-primary px-3 py-1 rounded">
            {showErrors ? '收起详情' : '展开详情'}
          </button>
        </div>
        <div className="space-y-2">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm w-40">{err.type}</span>
              <div className="flex-1 bg-bg/50 rounded h-5 overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded"
                  style={{ width: `${err.ratio * 100 * 3}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary w-12 text-right">{(err.ratio * 100).toFixed(0)}%</span>
              {showErrors && (
                <span className="text-xs text-text-secondary w-64 truncate" title={err.description}>{err.description}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 方法论说明 */}
      <div className="bg-bg/50 rounded-xl p-4 sm:p-6">
        <h4 className="font-medium text-primary mb-2">方法论说明</h4>
        <p className="text-sm text-text-secondary leading-relaxed">
          历史表现不代表未来结果，回测只用于校准模型。候选模型只有通过未来样本验证，才允许升级。
          当前模型更擅长判断主方向、识别高风险场次、生成票组结构和控制相关性，不擅长稳定命中精确比分和总进球。
          所有回测结果均为模拟分析，不构成投注建议。
        </p>
      </div>
    </section>
  );
}
