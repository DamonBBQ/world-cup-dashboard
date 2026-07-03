import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 标准化比赛数据结构（与 API 一致）
 */
export interface StandardMatch {
  id: string;
  date: string;
  time: string;
  competition: string;
  stage: string;
  homeTeam: {
    name: string;
    flag: string;
  };
  awayTeam: {
    name: string;
    flag: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: 'NOT_STARTED' | 'LIVE' | 'FINISHED';
  elapsed: number | null;
  lastUpdated: string;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  riskLevel: '低风险' | '中风险' | '高风险';
}

interface UseLiveScoresOptions {
  date: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseLiveScoresResult {
  matches: StandardMatch[];
  loading: boolean;
  error: string | null;
  dataSource: string;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

/**
 * 自定义 Hook：获取实时比赛数据
 */
export function useLiveScores({ date, autoRefresh = true, refreshInterval }: UseLiveScoresOptions): UseLiveScoresResult {
  const [matches, setMatches] = useState<StandardMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('none');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * 获取数据
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/live-scores?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setMatches(data.matches || []);
      setDataSource(data.dataSource || 'none');
      setLastUpdated(data.lastUpdated || null);
      
      if (data.error) {
        console.warn('[useLiveScores] API returned error:', data.error);
      }
    } catch (err: any) {
      console.error('[useLiveScores] Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
      
      // 保留上一次成功的数据，不清空
    } finally {
      setLoading(false);
    }
  }, [date]);
  /**
   * 手动刷新
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
  /**
   * 启动自动刷新
   */
  const startAutoRefresh = useCallback(() => {
    if (!autoRefresh) return;
    
    // 清除现有定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // 计算刷新间隔
    const getInterval = () => {
      if (refreshInterval) return refreshInterval;
      
      // 检查是否有进行中的比赛
      const hasLiveMatches = matches.some(m => m.status === 'LIVE');
      
      if (hasLiveMatches) {
        return 15 * 1000; // 15 秒
      } else {
        return 60 * 1000; // 1 分钟
      }
    };
    
    const interval = getInterval();
    
    intervalRef.current = setInterval(() => {
      fetchData();
    }, interval);
  }, [autoRefresh, refreshInterval, matches, fetchData]);
  
  /**
   * 停止自动刷新
   */
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // 首次加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // 自动刷新逻辑
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    }
    
    return () => {
      stopAutoRefresh();
    };
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh]);
  
  // 监听页面可见性，隐藏时停止刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else if (autoRefresh) {
        fetchData(); // 立即刷新一次
        startAutoRefresh();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, fetchData, startAutoRefresh, stopAutoRefresh]);
  
  return {
    matches,
    loading,
    error,
    dataSource,
    lastUpdated,
    refetch,
  };
}

/**
 * 格式化最后更新时间
 */
export function formatLastUpdated(lastUpdated: string | null): string {
  if (!lastUpdated) return '从未更新';
  
  const date = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `${diffSec} 秒前`;
  } else if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)} 分钟前`;
  } else {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * 获取数据来源标签颜色
 */
export function getDataSourceColor(dataSource: string): string {
  switch (dataSource) {
    case 'api-football':
    case 'football-data':
      return 'text-green-600'; // 真实数据
    case 'mock':
      return 'text-yellow-600'; // Mock 数据
    case 'none':
    default:
      return 'text-gray-400'; // 无数据
  }
}

/**
 * 获取数据来源标签文本
 */
export function getDataSourceLabel(dataSource: string): string {
  switch (dataSource) {
    case 'api-football':
      return 'API-FOOTBALL';
    case 'football-data':
      return 'football-data.org';
    case 'mock':
      return '模拟数据';
    case 'none':
    default:
      return '无数据';
  }
}
