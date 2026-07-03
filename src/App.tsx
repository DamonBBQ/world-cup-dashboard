import { useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import MatchBoard from './components/MatchBoard';
import PredictionInsight from './components/PredictionInsight';
import PlayerImpact from './components/PlayerImpact';
import TicketBuilder from './components/TicketBuilder';
import BankrollLedger from './components/BankrollLedger';
import BacktestPanel from './components/BacktestPanel';
import FeedbackLoop from './components/FeedbackLoop';
import SixStepFramework from './components/SixStepFramework';
import ResponsibleNotice from './components/ResponsibleNotice';
import PredictionEngine from './components/PredictionEngine';
import ExposurePanel from './components/ExposurePanel';
import LeakagePanel from './components/LeakagePanel';
import ScorePanel from './components/ScorePanel';
import StrategyEvolution from './components/StrategyEvolution';
import DataSyncStatus from './components/DataSyncStatus';

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
        <DataSyncStatus />
        <MatchBoard />
        <PredictionInsight />
        <PlayerImpact />
        <TicketBuilder />
        <PredictionEngine />
        <ExposurePanel />
        <LeakagePanel />
        <ScorePanel />
        <StrategyEvolution />
        <BankrollLedger />
        <BacktestPanel />
        <FeedbackLoop />
        <SixStepFramework />
        <ResponsibleNotice />
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
