import { SyncStatusBar } from './SyncStatusBar';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import TopNavbar from './TopNavbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-primary focus:text-white focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top Navigation Bar */}
      <TopNavbar />

      {/* Main Content */}
      <main
        id="main-content"
        className="pt-[90px] min-h-screen"
        role="main"
      >
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}
        </div>
        
        {/* Sync Status Indicator */}
        <SyncStatusBar />
        
        {/* Connection Status Indicator */}
        <ConnectionStatusIndicator />
      </main>
    </div>
  );
}
