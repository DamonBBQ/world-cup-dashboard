import { useState, useEffect } from 'react';

interface SyncResult {
  competition: string;
  name: string;
  matchCount: number;
  status: 'success' | 'failed';
  error: string | null;
}

interface SyncStatus {
  source: string;
  subscription: string;
  success: boolean;
  error: string | null;
  lastSync: string;
  lastSyncLocal: string;
  availableCompetitions: string[];
  competitionNames: Record<string, string>;
  syncResults: SyncResult[];
  totalCompetitions: number;
  successCount: number;
  failedCount: number;
  totalMatches: number;
}

export default function DataSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/data/football_data_sync_status.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-border rounded w-48 mb-4" />
          <div className="h-4 bg-border rounded w-32" />
        </div>
      </section>
    );
  }

  if (error || !status) {
    return (
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-primary mb-2">数据同步状态</h3>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            ⚠️ {error || '无法加载同步状态'}
          </div>
          <button
            onClick={loadStatus}
            className="mt-3 px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg/50"
          >
            重试
          </button>
        </div>
      </section>
    );
  }

  // 只显示 WC 的同步结果
  const wcResult = status.syncResults.find(r => r.competition === 'WC');
  const wcMatches = wcResult?.matchCount ?? 0;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* 头部 */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-primary">数据同步状态</h3>
              <p className="text-sm text-text-secondary mt-1">
                数据源: <span className="font-medium">{status.source}</span>
                {' · '}
                赛事: <span className="font-medium">FIFA World Cup</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {wcResult && wcResult.status === 'success' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  同步成功
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  同步失败
                </span>
              )}
              <button
                onClick={loadStatus}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-bg/50 transition-colors"
              >
                刷新状态
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 - 只显示WC相关 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
          <div className="bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">WC</div>
            <div className="text-xs text-text-secondary mt-1">FIFA World Cup</div>
          </div>
          <div className="bg-card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{wcMatches}</div>
            <div className="text-xs text-text-secondary mt-1">比赛总数</div>
          </div>
          <div className="bg-card p-4 text-center">
            <div className="text-2xl font-bold text-accent-bg">{wcResult?.status === 'success' ? '✅' : '❌'}</div>
            <div className="text-xs text-text-secondary mt-1">同步状态</div>
          </div>
        </div>

        {/* 最近同步时间 */}
        <div className="px-6 py-3 bg-bg/30 border-b border-border text-sm text-text-secondary">
          最近同步: {status.lastSyncLocal}
          <span className="text-xs text-text-secondary/60 ml-2">({status.lastSync})</span>
        </div>

        {/* 操作提示 */}
        <div className="px-6 py-4 bg-bg/30 border-t border-border">
          <div className="text-xs text-text-secondary leading-relaxed">
            💡 同步数据请在终端运行: <code className="px-1.5 py-0.5 bg-card border border-border rounded text-primary">python3 scripts/ingest/fetch_football_data.py</code>
            <br />
            所有数据仅供分析参考，不构成投注建议。
          </div>
        </div>
      </div>
    </section>
  );
}
