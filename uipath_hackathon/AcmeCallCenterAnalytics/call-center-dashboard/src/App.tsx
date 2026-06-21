import { Routes, Route } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CallLogPage from './pages/CallLogPage';
import CallDetailPage from './pages/CallDetailPage';
import AgentsPage from './pages/AgentsPage';
import AgentDetailPage from './pages/AgentDetailPage';
import SentimentPage from './pages/SentimentPage';
import EscalationsPage from './pages/EscalationsPage';
import CompliancePage from './pages/CompliancePage';
import ResolutionPage from './pages/ResolutionPage';
import IntentsPage from './pages/IntentsPage';
import TriggerWordsPage from './pages/TriggerWordsPage';
import FrictionPage from './pages/FrictionPage';
import FollowupsPage from './pages/FollowupsPage';
import FollowupsOverviewPage from './pages/FollowupsOverviewPage';
import AIInsightsPage from './pages/AIInsightsPage';
import LiveCallPage from './pages/LiveCallPage';
import MarketingPage from './pages/MarketingPage';

export default function App() {
  return (
    <FilterProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calls" element={<CallLogPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:name" element={<AgentDetailPage />} />
          <Route path="/sentiment" element={<SentimentPage />} />
          <Route path="/escalations" element={<EscalationsPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/resolution" element={<ResolutionPage />} />
          <Route path="/intents" element={<IntentsPage />} />
          <Route path="/trigger-words" element={<TriggerWordsPage />} />
          <Route path="/friction" element={<FrictionPage />} />
          <Route path="/followups" element={<FollowupsPage />} />
          <Route path="/followups/overview" element={<FollowupsOverviewPage />} />
          <Route path="/ai-insights" element={<AIInsightsPage />} />
          <Route path="/live" element={<LiveCallPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
        </Route>
      </Routes>
    </FilterProvider>
  );
}
