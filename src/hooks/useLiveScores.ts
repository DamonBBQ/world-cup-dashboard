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
 * 确保每次请求都是最新数据，不使用缓存
 */
export function useLiveScores({ date, autoRefresh = true, refreshInterval }: UseLiveScoresOptions): UseLiveScoresResult {
  const [matches, setMatches] = useState<StandardMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('none');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  /**
   * 获取数据 - 强制禁用缓存
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 添加时间戳参数强制禁用缓存
      const timestamp = Date.now();
      const url = `/api/live-scores?date=${encodeURIComponent(date)}&_t=${timestamp}`;
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!isMountedRef.current) return;
      
      setMatches(data.matches || []);
      setDataSource(data.dataSource || 'none');
      setLastUpdated(data.lastUpdated || null);
      
      if (data.error) {
        setError(data.error);
        console.warn('[useLiveScores] API returned error:', data.error);
      } else {
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      
      console.error('[useLiveScores] Fetch error:', err);
      setError(err.message || '数据获取失败');
      // 保留上一次成功的数据，不清空
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [date]);
  
  /**
   * 手动刷新 - 立即获取最新数据
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
        return 15 * 1000; // 15 秒 - 进行中比赛频繁刷新
      } else if (dataSource === 'none' || error) {
        return 30 * 1000; // 30 秒 - 数据源异常时重试
      } else {
        return 60 * 1000; // 60 秒 - 非进行中比赛
      }
    };
    
    const interval = getInterval();
    
    intervalRef.current = setInterval(() => {
      fetchData();
    }, interval);
  }, [autoRefresh, refreshInterval, matches, dataSource, error, fetchData]);
  
  /**
   * 停止自动刷新
   */
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // 组件挂载标志
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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
  
  // 监听页面可见性：隐藏时停止刷新，切回前台时立即刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else if (autoRefresh) {
        fetchData(); // 立即刷新一次获取最新数据
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
  
  if (diffSec < 5) {
    return '刚刚';
  } else if (diffSec < 60) {
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
    case 'espn-worldcup':
    case 'api-football':
    case 'football-data':
      return 'text-green-600'; // 真实数据
    case 'none':
    default:
      return 'text-red-600'; // 无数据或异常
  }
}

/**
 * 获取数据来源标签文本
 */
export function getDataSourceLabel(dataSource: string): string {
  switch (dataSource) {
    case 'espn-worldcup':
      return 'ESPN World Cup 实时数据';
    case 'api-football':
      return 'API-FOOTBALL 实时数据';
    case 'football-data':
      return 'football-data.org 实时数据';
    case 'none':
    default:
      return '世界杯实时数据暂不可用';
  }
}

/**
 * 检查是否有真实数据
 */
export function hasRealData(dataSource: string, matches: any[]): boolean {
  return (
    (dataSource === 'espn-worldcup' ||
      dataSource === 'api-football' ||
      dataSource === 'football-data') &&
    matches.length > 0
  );
}
