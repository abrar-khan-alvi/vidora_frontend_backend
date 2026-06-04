import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  ImagePlus,
  PlaySquare,
  Mic,
  RefreshCw,
  History,
  X,
  Menu,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Zap
} from 'lucide-react';
import { Logo } from './ui';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'prompton', icon: Sparkles, label: 'Prompton' },
  { id: 'image-generation', icon: ImagePlus, label: 'Image Generation' },
  { id: 'video-generation', icon: PlaySquare, label: 'Video Generation' },
  { id: 'voicesync', icon: Mic, label: 'VoiceSync AI' },
  { id: 'subscriptions', icon: RefreshCw, label: 'Subscriptions' },
  { id: 'history', icon: History, label: 'History logs' },
];

interface DashboardLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  setActiveTab,
  children
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.display_name?.trim() || user?.email?.split('@')[0] || 'Creator';

  return (
    <div className="flex bg-[#08080A] min-h-screen text-white w-full overflow-hidden absolute inset-0 z-50">
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 w-[280px] shrink-0 border-r border-[#1e1e24] flex flex-col bg-[#0A0A0C] z-[70] transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="p-8 pb-4 flex items-center justify-center lg:justify-start">
          <Logo className="mb-0" />
          <button 
            className="lg:hidden ml-auto text-[#7A7A80] hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 overflow-y-auto overflow-x-hidden pb-4">
          <div className="bg-[#161619] border border-[#24242B] rounded-[16px] py-4 px-2">
            <div className="text-[#7A7A80] text-[11.5px] font-semibold tracking-wider mb-3 ml-4">MAIN MENU</div>
            
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[14px] ${
                      active 
                        ? 'bg-gradient-to-r from-[#6A39C4] to-[#8C4DE8] text-white font-medium shadow-[0_4px_12px_rgba(106,57,196,0.3)]' 
                        : 'text-[#7A7A80] hover:text-[#C4C4C8] hover:bg-white/[0.02]'
                    }`}
                  >
                    <item.icon size={18} className={active ? 'text-white' : 'opacity-80'} strokeWidth={active ? 2 : 1.5} />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Subscription Mood / Plan Status */}
        <div className="px-4 pb-6 mt-auto">
          <div className="bg-gradient-to-br from-[#1A1A20] to-[#121216] border border-white/[0.05] rounded-[20px] p-5 relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#9758FF] opacity-10 blur-[30px] rounded-full group-hover:opacity-20 transition-opacity"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#9758FF]/10 flex items-center justify-center">
                  <Zap size={16} className="text-[#9758FF]" fill="currentColor" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white">Premium Plan</div>
                  <div className="text-[11px] text-[#7A7A80]">Professional User</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#A1A1A5]">Monthly Usage</span>
                  <span className="text-white font-medium">85%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6A39C4] to-[#9758FF] rounded-full" 
                    style={{ width: '85%' }}
                  ></div>
                </div>
                <button className="w-full mt-2 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-[11px] font-medium text-[#C4C4C8] transition-colors">
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 w-full relative bg-[#08080A]">
        {/* Top Header */}
        <header className="flex justify-between lg:justify-end items-center px-6 lg:px-10 py-6 shrink-0 z-10 bg-[#08080A]">
          <button 
            className="lg:hidden text-[#EAEAEA] hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          

          <div className="flex items-center gap-4 lg:gap-6">
            <button className="relative text-[#EAEAEA] hover:text-white transition-colors bg-[#1A1A20] p-2 rounded-full border border-white/[0.04]">
              <Bell size={18} />
              <span className="absolute top-0 right-0 w-[9px] h-[9px] bg-[#22c55e] rounded-full border-2 border-[#1A1A20]"></span>
            </button>
            
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="text-right hidden sm:block">
                  <div className="text-[14px] font-medium text-[#EAEAEA] leading-tight">{displayName}</div>
                  <div className="text-[12px] text-[#7A7A80] max-w-[160px] truncate">{user?.email ?? 'User'}</div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover ml-1"
                />
                <ChevronDown size={14} className={`text-[#7A7A80] ml-1 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-56 bg-[#161619] border border-[#24242B] rounded-[14px] shadow-xl z-50 overflow-hidden py-1.5 flex flex-col">
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1B1B21] transition-colors text-[#EAEAEA] text-[14px]"
                    >
                      <Settings size={16} className="text-[#a1a1a5]" />
                      Account Settings
                    </button>
                    <div className="h-[1px] bg-[#24242B] my-1 mx-3" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#EF4444]/10 transition-colors text-[#EF4444] text-[14px]"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Wrapper */}
        <main className="px-5 sm:px-10 pb-10 flex-1 w-full flex justify-center overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-[1100px] flex justify-start min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
