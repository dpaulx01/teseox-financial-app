import React, { useEffect } from 'react';
import WelcomeBanner from '../components/home/WelcomeBanner';
import ExecutiveSummary from '../components/home/ExecutiveSummary';
import QuickAccessGrid from '../components/home/QuickAccessGrid';
import RecentActivity, { addRecentActivity } from '../components/home/RecentActivity';

interface HomePageProps {
  onNavigate: (tabId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  // Track that user visited home page
  useEffect(() => {
    addRecentActivity('view', 'Accedió a la página de inicio');
  }, []);

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto animate-fade-in p-6">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Executive Summary KPIs */}
      <ExecutiveSummary />

      {/* Quick Access Grid */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-display text-primary neon-text">
            Acceso Rápido a Módulos
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Accede directamente a cualquier módulo del sistema
          </p>
        </div>
        <QuickAccessGrid onNavigate={onNavigate} />
      </section>

      {/* Recent Activity */}
      <section>
        <RecentActivity />
      </section>
    </div>
  );
};

export default HomePage;
