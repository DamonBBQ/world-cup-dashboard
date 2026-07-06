import { useState, useEffect, useCallback } from 'react';
import { type StandardMatch } from '../hooks/useLiveScores';
import { formatLastUpdated, getDataSourceColor, getDataSourceLabel } from '../hooks/useLiveScores';
import SplitTicketBuilder from './SplitTicketBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

/** 返回北京时区日期字符串 YYYY-MM-DD，offsetDays 相对今天偏移天数 */
function getBeijingDateString(offsetDays = 0): string {
  const now = new Date();
  const target = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return target.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

/** 拉取 0~N 天内所有世界杯比赛，合并去重并按北京时间排序 */
async function fetchTicketSchedule(days = 14): Promise<StandardMatch[]> {
  const dates = Array.from({ length: days + 1 }, (_, i) => getBeijingDateString(i));

  const results = await Promise.all(
    dates.map(async date => {
      try {
        const res = await fetch(`/api/live-scores?date=${date}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.matches) ? data.matches : [];
      } catch {
        return [];
      }
    })
  );

  // 合并 + 去重
  const map = new Map<string, StandardMatch>();
  results.flat().forEach(match => {
    if (!map.has(match.id)) map.set(match.id, match);
  });

  // 按北京时间 date + time 排序
  return Array.from(map.values()).sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────────────────────────────────────

export default function TicketBuilder() {
  const [activeTab, setActiveTab] = useState<'smart' | 'split' | 'history'>('split');

  // ── 14 天赛程池 ──
  const [ticketScheduleMatches, setTicketScheduleMatches] = useState<StandardMatch[]>([]);
  const [ticketScheduleLoading, setTicketScheduleLoading] = useState(true);
  const [ticketScheduleError, setTicketScheduleError] = useState<string | null>(null);

  // ── 首页今日数据（仅用于展示数据来源标签） ──
  const [homeDataSource, setHomeDataSource] = useState('none');
  const [homeLastUpdated, setHomeLastUpdated] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  const todayStr = getBeijingDateString(0);

  // 拉取首页今日数据（仅用于显示来源标签）
  useEffect(() => {
    let cancelled = false;
    setHomeLoading(true);
    fetch(`/api/live-scores?date=${todayStr}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setHomeDataSource(data.dataSource || 'none');
          setHomeLastUpdated(data.lastUpdated || null);
          setHomeLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setHomeLoading(false); });
    return () => { cancelled = true; };
  }, [todayStr]);

  // 拉取 14 天赛程池
  const refreshTicketSchedule = useCallback(async () => {
    setTicketScheduleLoading(true);
    setTicketScheduleError(null);
    try {
      const matches = await fetchTicketSchedule(14);
      setTicketScheduleMatches(matches);
    } catch (err: any) {
      setTicketScheduleError(err?.message || '拉取赛程失败');
    } finally {
      setTicketScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTicketSchedule();
  }, [refreshTicketSchedule]);

  return (
    <section id="tickets" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
            <span className="text-xl">🎫</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">智能出票系统</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">数据来源：</span>
              <span className={`font-medium ${getDataSourceColor(homeDataSource)}`}>
                {homeLoading ? '加载中...' : getDataSourceLabel(homeDataSource)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>
            赛程池最后更新：
            {homeLastUpdated ? formatLastUpdated(homeLastUpdated) : '—'}
          </span>
          <button
            onClick={refreshTicketSchedule}
            disabled={ticketScheduleLoading}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-xs"
          >
            {ticketScheduleLoading ? '刷新中...' : '刷新赛程'}
          </button>
        </div>

        {ticketScheduleError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {ticketScheduleError}
          </div>
        )}

        {ticketScheduleMatches.length > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            赛程池：{ticketScheduleMatches.length} 场（今天起 14 天）
          </div>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'split', label: '小额多票拆单' },
          { id: 'smart', label: '智能生成' },
          { id: 'history', label: '历史票组' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'split' && (
        <SplitTicketBuilder
          liveMatches={ticketScheduleMatches}
          liveLoading={ticketScheduleLoading}
          liveError={ticketScheduleError}
          onRefreshMatches={refreshTicketSchedule}
        />
      )}

      {activeTab === 'smart' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">智能生成票组</h3>
          <p className="text-gray-600">功能开发中...</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">历史票组</h3>
          <p className="text-gray-600">功能开发中...</p>
        </div>
      )}
    </section>
  );
}
