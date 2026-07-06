import { useState, useMemo } from 'react';
import { useLiveScores, type StandardMatch } from '../hooks/useLiveScores';
import { formatLastUpdated, getDataSourceColor, getDataSourceLabel, hasRealData } from '../hooks/useLiveScores';
import { isWorldCupCompetitionName } from '../utils/worldCupFilter';
import SplitTicketBuilder from './SplitTicketBuilder';

export default function TicketBuilder() {
  const [activeTab, setActiveTab] = useState<'smart' | 'split' | 'history'>('split');
  
  // 获取今天的日期
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  
  // 使用实时数据 Hook
  const { matches, loading, error, dataSource, lastUpdated, refetch } = useLiveScores({
    date: today,
    autoRefresh: true,
  });
  
  // 前端防御过滤：只保留世界杯比赛
  const worldCupMatches = useMemo(
    () => matches.filter(match => isWorldCupCompetitionName(match.competition)),
    [matches]
  );
  
  // 检查是否有真实数据
  const hasReal = hasRealData(dataSource, worldCupMatches);
  
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
              <span className={`font-medium ${getDataSourceColor(dataSource)}`}>
                {getDataSourceLabel(dataSource)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>最后更新：{formatLastUpdated(lastUpdated)}</span>
          <button
            onClick={refetch}
            disabled={loading}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-xs"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
        
        {!hasReal && !loading && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            实时数据暂不可用。请检查 API Key 配置、数据套餐权限，或当天是否有比赛。
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
      
      {/* 加载状态 */}
      {loading && matches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>加载实时数据中...</p>
        </div>
      ) : (
        <>
          {/* 小额多票拆单 */}
          {activeTab === 'split' && (
            <SplitTicketBuilder
              liveMatches={worldCupMatches}
              liveLoading={loading}
              liveError={error}
              onRefreshMatches={refetch}
            />
          )}
          
          {/* 智能生成 */}
          {activeTab === 'smart' && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">智能生成票组</h3>
              <p className="text-gray-600">功能开发中...</p>
            </div>
          )}
          
          {/* 历史票组 */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">历史票组</h3>
              <p className="text-gray-600">功能开发中...</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
