import { useState, useEffect } from 'react';

interface HeaderProps {
  onNavigate: (section: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'matches', label: '今日赛事' },
    { id: 'prediction', label: '预测洞察' },
    { id: 'players', label: '球员阵容' },
    { id: 'ticket', label: '推荐出票' },
    { id: 'engine', label: '预测引擎' },
    { id: 'exposure', label: '相关性' },
    { id: 'leakage', label: '漏洞检测' },
    { id: 'score', label: '组合评分' },
    { id: 'evolution', label: '策略进化' },
    { id: 'bankroll', label: '资金台账' },
    { id: 'backtest', label: '历史回测' },
    { id: 'feedback', label: '错误校准' },
    { id: 'framework', label: '分析框架' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 shadow-sm backdrop-blur-md' : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">WC</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary leading-tight">
                World Cup Match Intelligence
              </h1>
              <p className="text-xs text-text-secondary leading-tight">世界杯赛事分析</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-bg/50 rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
