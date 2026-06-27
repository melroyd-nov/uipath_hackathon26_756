import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import { DummyDataProvider } from './context/DummyDataContext';
import MainLayout from './components/layout/MainLayout';
import RequireAuth from './components/auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import CustomCursor from './components/shared/CustomCursor';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SentimentPage = lazy(() => import('./pages/SentimentPage'));
const IntentsPage = lazy(() => import('./pages/IntentsPage'));
const EscalationsPage = lazy(() => import('./pages/EscalationsPage'));
const CompliancePage = lazy(() => import('./pages/CompliancePage'));
const ResolutionPage = lazy(() => import('./pages/ResolutionPage'));
const TriggerWordsPage = lazy(() => import('./pages/TriggerWordsPage'));
const FrictionPage = lazy(() => import('./pages/FrictionPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AgentDetailPage = lazy(() => import('./pages/AgentDetailPage'));
const CallLogPage = lazy(() => import('./pages/CallLogPage'));
const CallDetailPage = lazy(() => import('./pages/CallDetailPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));
const FollowupsOverviewPage = lazy(() => import('./pages/FollowupsOverviewPage'));
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage'));
const AiUsagePage = lazy(() => import('./pages/AiUsagePage'));

export default function App() {
  return (
    <DummyDataProvider>
      <FilterProvider>
        <CustomCursor />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sentiment" element={<SentimentPage />} />
            <Route path="/intents" element={<IntentsPage />} />
            <Route path="/escalations" element={<EscalationsPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/resolution" element={<ResolutionPage />} />
            <Route path="/triggers" element={<TriggerWordsPage />} />
            <Route path="/friction" element={<FrictionPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/agents/:name" element={<AgentDetailPage />} />
            <Route path="/calls" element={<CallLogPage />} />
            <Route path="/calls/:id" element={<CallDetailPage />} />
            <Route path="/calls/:id/followups" element={<FollowupsPage />} />
            <Route path="/followups" element={<FollowupsOverviewPage />} />
            <Route path="/chat" element={<AIInsightsPage />} />
            <Route path="/ai" element={<AIInsightsPage />} />
            <Route path="/ai-usage" element={<AiUsagePage />} />
          </Route>
        </Routes>
      </FilterProvider>
    </DummyDataProvider>
  );
}
