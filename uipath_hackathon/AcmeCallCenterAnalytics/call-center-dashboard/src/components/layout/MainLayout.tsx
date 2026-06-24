import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import LoadingSpinner from '../shared/LoadingSpinner';
import AiCopilot from '../ai/AiCopilot';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="app-texture flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 scroll-smooth overflow-y-auto p-6">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner size={32} />
              </div>
            }
          >
            <div key={location.pathname} className="animate-[fade-in_0.18s_ease-out]">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <AiCopilot />
    </div>
  );
}
