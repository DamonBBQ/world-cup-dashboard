import { useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MatchBoard from './components/MatchBoard';
import PredictionInsight from './components/PredictionInsight';
import PlayerImpact from './components/PlayerImpact';
import TicketBuilder from './components/TicketBuilder';
import BankrollLedger from './components/BankrollLedger';
import ResponsibleNotice from './components/ResponsibleNotice';

// 技术细节组件已隐藏（根据用户要求）
// import PredictionEngine from './components/PredictionEngine';
// import ExposurePanel from './components/ExposurePanel';
// import LeakagePanel from './components/LeakagePanel';
// import ScorePanel from './components/ScorePanel';
// import StrategyEvolution from './components/StrategyEvolution';
// import DataSyncStatus from './components/DataSyncStatus';
// import BacktestPanel from './components/BacktestPanel';
// import FeedbackLoop from './components/FeedbackLoop';
// import SixStepFramework from './components/SixStepFramework';

export default function App() {
  const handleNavigate = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Header onNavigate={handleNavigate} />
      <main>
        <Hero onNavigate={handleNavigate} />
        
        {/* 核心数据展示 */}
        <MatchBoard />
        <PredictionInsight />
        <PlayerImpact />
        
        {/* 出票板块 */}
        <TicketBuilder />
        
        {/* 资金台账 */}
        <BankrollLedger />
        
        {/* 免责声明 */}
        <ResponsibleNotice />
        
        {/* 
        以下技术细节组件已隐藏（根据用户要求 2026-07-03）：
        - PredictionEngine（预测引擎与出票风控逻辑）
        - ExposurePanel（相关性控制）
        - LeakagePanel（漏洞检测）
        - ScorePanel（组合评分）
        - StrategyEvolution（策略自我进化与吸收规则）
        - DataSyncStatus（数据层状态）
        - BacktestPanel（回测面板）
        - FeedbackLoop（反馈循环）
        - SixStepFramework（六步框架）
        */}
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-text-secondary">
          <p className="mb-2">
            World Cup Match Intelligence · 世界杯赛事分析与合规出票辅助工具
          </p>
          <p>
            © 2026 · 仅供数据分析与娱乐参考 · 请遵守所在地法律法规
          </p>
        </div>
      </footer>
    </div>
  );
}
