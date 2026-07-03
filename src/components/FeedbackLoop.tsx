import { useState, useEffect } from 'react';

interface FeedbackRecord {
  id: string;
  match: string;
  directionHit: boolean;
  scoreHit: boolean;
  errorType: string;
  notes: string;
  date: string;
}

const errorTypes = [
  '高估强队',
  '低估防守',
  '忽略伤停',
  '赛程体能误判',
  '天气因素误判',
  '市场热度干扰',
];

const STORAGE_KEY = 'worldcup_feedback';

function loadRecords(): FeedbackRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: FeedbackRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export default function FeedbackLoop() {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    match: '',
    directionHit: false,
    scoreHit: false,
    errorType: '',
    notes: '',
  });

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const handleSubmit = () => {
    if (!formData.match || !formData.errorType) {
      alert('请填写比赛名称和错误类型');
      return;
    }
    const newRecord: FeedbackRecord = {
      id: `fb_${Date.now()}`,
      match: formData.match,
      directionHit: formData.directionHit,
      scoreHit: formData.scoreHit,
      errorType: formData.errorType,
      notes: formData.notes,
      date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }),
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveRecords(updated);
    setFormData({ match: '', directionHit: false, scoreHit: false, errorType: '', notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
  };

  const directionHitRate = records.length > 0
    ? (records.filter(r => r.directionHit).length / records.length * 100).toFixed(1)
    : '-';

  const scoreHitRate = records.length > 0
    ? (records.filter(r => r.scoreHit).length / records.length * 100).toFixed(1)
    : '-';

  // 统计主要错误类型
  const errorTypeCounts: Record<string, number> = {};
  records.forEach(r => {
    errorTypeCounts[r.errorType] = (errorTypeCounts[r.errorType] || 0) + 1;
  });
  const topError = Object.entries(errorTypeCounts).sort((a, b) => b[1] - a[1])[0];
  const topErrorName = topError ? topError[0] : '-';

  return (
    <section id="feedback" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">错误分析与校准</h2>
        <p className="text-text-secondary">复盘预测结果，持续优化模型</p>
      </div>

      {records.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-text-secondary mb-4">暂无复盘记录</p>
          <p className="text-xs text-text-secondary/60 mb-6">添加复盘记录后，可查看错误分析统计</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
          >
            添加复盘记录
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: '已复盘场次', value: records.length, unit: '场' },
              { label: '方向命中率', value: directionHitRate, unit: '%' },
              { label: '进球命中率', value: scoreHitRate, unit: '%' },
              { label: '主要错误类型', value: topErrorName, unit: '' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {stat.value}
                  {stat.unit && <span className="text-sm ml-0.5">{stat.unit}</span>}
                </div>
                <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* 错误类型分布 */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 mb-6">
            <h3 className="font-bold text-primary mb-4">错误类型分布</h3>
            <div className="space-y-2">
              {errorTypes.map(type => {
                const count = errorTypeCounts[type] || 0;
                const pct = records.length > 0 ? (count / records.length * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-text-secondary flex-shrink-0">{type}</span>
                    <div className="flex-1 h-5 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm text-text-secondary text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-primary">复盘记录</h3>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
              >
                添加记录
              </button>
            </div>

            <div className="divide-y divide-border">
              {records.map(record => (
                <div key={record.id} className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{record.match}</span>
                      <span className="text-xs text-text-secondary">{record.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-bg rounded-full text-text-secondary">
                        {record.errorType}
                      </span>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className={record.directionHit ? 'text-green-600' : 'text-red-600'}>
                      方向：{record.directionHit ? '✓ 命中' : '✗ 未中'}
                    </span>
                    <span className={record.scoreHit ? 'text-green-600' : 'text-red-600'}>
                      比分：{record.scoreHit ? '✓ 命中' : '✗ 未中'}
                    </span>
                  </div>
                  {record.notes && (
                    <p className="text-sm text-text-secondary mt-2">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-primary mb-4">添加复盘记录</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">比赛</label>
                <input
                  type="text"
                  value={formData.match}
                  onChange={e => setFormData(prev => ({ ...prev, match: e.target.value }))}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="如：Brazil vs Argentina"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.directionHit}
                    onChange={e => setFormData(prev => ({ ...prev, directionHit: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">方向命中</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.scoreHit}
                    onChange={e => setFormData(prev => ({ ...prev, scoreHit: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">比分命中</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">错误类型</label>
                <select
                  value={formData.errorType}
                  onChange={e => setFormData(prev => ({ ...prev, errorType: e.target.value }))}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">请选择</option>
                  {errorTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="记录分析失误的原因..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-bg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
