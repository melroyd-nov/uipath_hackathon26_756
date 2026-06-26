import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="app-texture flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden p-6 flex flex-col">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <LoadingSpinner size={32} />
              </div>
            }
          >
            <div key={location.pathname} className="animate-[fade-in_0.18s_ease-out] flex-1 min-h-0 overflow-y-auto scroll-smooth">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
