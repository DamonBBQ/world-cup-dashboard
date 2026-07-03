import { useState, useEffect } from 'react';
import { mockMatches } from '../data/mockMatches';
import { getTickets } from '../utils/localStorage';
import { fetchLocalMatches, convertMatchToFrontend, type StandardMatch } from '../services/localData';

interface HeroProps {
  onNavigate: (section: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  const [stats, setStats] = useState({
    todayMatches: 0,
    finishedMatches: 0,
    pendingAnalysis: 0,
    savedTickets: getTickets().length,
  });
  const [live, setLive] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const localMatches: StandardMatch[] = await fetchLocalMatches('WC');
        if (localMatches.length > 0) {
          const converted = localMatches.map(convertMatchToFrontend);
          const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
          const todayList = converted.filter(m => m.date === today);
          const hasLive = todayList.some(m => m.status === 'live');
          setStats({
            todayMatches: todayList.length,
            finishedMatches: todayList.filter(m => m.status === 'finished').length,
            pendingAnalysis: converted.filter(m => m.confidence < 70).length,
            savedTickets: getTickets().length,
          });
          setLive(hasLive);
          setDataSource('live');
        } else {
          // 没有同步数据，使用mock
          setStats({
            todayMatches: mockMatches.filter(m => m.status === 'upcoming' || m.status === 'live').length,
            finishedMatches: mockMatches.filter(m => m.status === 'finished').length,
            pendingAnalysis: mockMatches.filter(m => m.confidence < 70).length,
            savedTickets: getTickets().length,
          });
          setDataSource('mock');
        }
      } catch {
        setStats({
          todayMatches: mockMatches.filter(m => m.status === 'upcoming' || m.status === 'live').length,
          finishedMatches: mockMatches.filter(m => m.status === 'finished').length,
          pendingAnalysis: mockMatches.filter(m => m.confidence < 70).length,
          savedTickets: getTickets().length,
        });
        setDataSource('mock');
      }
    };
    loadStats();
  }, []);

  return (
    <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-primary to-primary-light rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -mr-48 -mt-48" />

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 leading-tight">
                World Cup Match Intelligence
              </h2>
              <p className="text-lg sm:text-xl text-white/80 mb-4">
                世界杯赛事分析与合规出票辅助工具
              </p>
              <p className="text-sm text-white/70 max-w-2xl leading-relaxed">
                整合赛程、概率、阵容、资金台账和赛后校准，帮助用户进行理性分析。
                本工具仅用于数据分析，不构成任何投注建议。
              </p>
              {live && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-400/30 rounded-full text-sm">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  有比赛进行中
                </div>
              )}
              {dataSource === 'mock' && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-400/30 rounded-full text-sm">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                  模拟数据 · 请运行同步脚本获取实时数据
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: '今日比赛', value: stats.todayMatches, icon: '📅', section: 'matches' },
                { label: '已结束', value: stats.finishedMatches, icon: '✅', section: 'matches' },
                { label: '待分析', value: stats.pendingAnalysis, icon: '🔍', section: 'prediction' },
                { label: '已保存票组', value: stats.savedTickets, icon: '📋', section: 'ticket' },
              ].map((stat, i) => (
                <div key={i} onClick={() => onNavigate(stat.section)} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center cursor-pointer hover:bg-white/20 transition-colors">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-accent/20 border border-accent/30 rounded-xl">
            <p className="text-sm text-accent font-medium">
              ⚠️ 合规提示：仅供数据分析与娱乐参考，不构成投注建议；请遵守所在地法律法规，理性购彩，未成年人禁止参与。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
