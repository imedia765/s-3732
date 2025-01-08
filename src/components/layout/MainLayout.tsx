import { ReactNode } from 'react';
import MainHeader from './MainHeader';
import SidePanel from '@/components/SidePanel';
import { UserRole } from '@/hooks/useRoleAccess';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  userRole: UserRole;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  onTabChange: (tab: string) => void;
}

const MainLayout = ({
  children,
  activeTab,
  userRole,
  isSidebarOpen,
  onSidebarToggle,
  onTabChange,
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-dashboard-dark">
      <MainHeader onToggleSidebar={onSidebarToggle} />
      
      <div className="flex pt-24">
        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onSidebarToggle}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            fixed lg:fixed top-24 h-[calc(100vh-6rem)] w-64
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            transition-transform duration-300 ease-in-out z-50
          `}
        >
          <SidePanel 
            onTabChange={(tab) => {
              onTabChange(tab);
              onSidebarToggle();
            }}
            userRole={userRole}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-3 lg:p-6 lg:ml-64 min-h-[calc(100vh-6rem)] overflow-auto">
          <div className="max-w-[2000px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;