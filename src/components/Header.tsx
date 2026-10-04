import React, { useState } from 'react';
import {
  Dumbbell,
  Clock,
  Apple,
  Sun,
  Moon,
  Globe,
  FileText,
  UserCheck,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Flame,
  PlusCircle,
} from 'lucide-react';
import { translations, Language } from '../data/translations';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: 'workout' | 'history' | 'nutrition' | 'admin' | any;
  setActiveTab: (tab: any) => void;
  rates?: Record<string, number>;
  lastUpdated?: string | null;
  isLoadingRates?: boolean;
  onRefreshRates?: () => void;
  historyCount?: number;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations['en'];
  onExportPdf?: () => void;
  userProfile?: UserProfile | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  historyCount = 0,
  isDarkMode,
  setIsDarkMode,
  lang,
  setLang,
  t,
  onExportPdf,
  userProfile,
  onOpenLoginModal,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAr = lang === 'ar';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Gym Motivational & Live Tracking Ticker Bar */}
      <div className="bg-slate-950/95 border-b border-slate-800/80 text-xs py-1.5 px-3 sm:px-4 overflow-x-auto no-scrollbar flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0 text-slate-400 font-medium">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'منصة تدريب الجيم والمتابعة' : 'Gym Workout Engine'}</span>
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">{isAr ? 'الزيادة التدريجية:' : 'Overload Principle:'}</span>
            <span className="font-semibold text-emerald-400">+2.5kg / week</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">{isAr ? 'الهدف الأسبوعي:' : 'Split Schedule:'}</span>
            <span className="font-semibold text-amber-400">{isAr ? 'برنامج مخصص' : 'Custom Split'}</span>
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-400">{isAr ? 'فترة الراحة:' : 'Rest Interval:'}</span>
            <span className="font-semibold text-cyan-400">60s - 120s</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[10px] sm:text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            {isAr ? 'مزامنة نشطة' : 'Live Sync'}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
          onClick={() => {
            setActiveTab('workout');
            setIsMobileMenuOpen(false);
          }}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="font-black text-base sm:text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Gym workout
            </div>
            <div className="text-[10px] text-amber-400/90 font-bold">
              {isAr ? 'شيتات التمارين والتطور' : 'Workout Sheet & Progression'}
            </div>
          </div>
        </div>

        {/* Desktop Controls (Hidden on Mobile < 640px) */}
        <div className="hidden sm:flex items-center gap-2">
          {/* User ID / Profile Button */}
          {userProfile ? (
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-emerald-500/40 rounded-xl p-1 pr-2.5 ltr:pl-1 rtl:pr-1 ltr:pr-2.5 rtl:pl-2.5">
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                title={isAr ? 'تعديل بيانات الحساب والملف الشخصي' : 'Edit User Info & Security Settings'}
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{userProfile.username || userProfile.userId}</span>
                {userProfile.twoFactorEnabled ? (
                  <span className="text-[10px] bg-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5" title="2FA Protected">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    2FA
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200">
                    {isAr ? 'الملف' : 'Profile'}
                  </span>
                )}
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title={t.logoutBtn}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t.loginBtn}</span>
            </button>
          )}

          {/* Header PDF Export Button */}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isAr ? 'تصدير تقرير التمارين PDF' : 'Export Workout PDF Report'}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.headerPdfBtn}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title={lang === 'en' ? 'التحويل إلى اللغة العربية' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.languageToggle}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            title={isDarkMode ? t.switchToLight : t.switchToDark}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Gym Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('workout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'workout' || activeTab === 'calculator'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>{t.workoutTab || 'Workout Sheet'}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                activeTab === 'history' || activeTab === 'rates'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t.historyTab || 'History of Sheets'}</span>
              {historyCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'history'
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {historyCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('nutrition')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'nutrition' || activeTab === 'dashboard'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>{t.nutritionTab || 'Food and Nutrition'}</span>
            </button>

            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-700/50 font-bold'
                }`}
                title={isAr ? 'لوحة تحكم الإدارة' : 'Admin Control Panel'}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.adminTab || (isAr ? 'الإدارة' : 'Admin')}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Mobile Navbar Controls (Icon Row & Menu Toggle for screens < 640px) */}
        <div className="flex sm:hidden items-center gap-1.5">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={isDarkMode ? t.switchToLight : t.switchToDark}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Mobile Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            {t.languageToggle}
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => {
                setActiveTab('workout');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold cursor-pointer ${
                activeTab === 'workout' || activeTab === 'calculator'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>{t.workoutTab || 'Workout Sheet'}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold cursor-pointer ${
                activeTab === 'history' || activeTab === 'rates'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t.historyTab || 'History of Sheets'}</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-amber-400">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('nutrition');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold cursor-pointer ${
                activeTab === 'nutrition' || activeTab === 'dashboard'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>{t.nutritionTab || 'Food and Nutrition'}</span>
            </button>

            {userProfile?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/90 text-amber-400 hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.adminTab || (isAr ? 'لوحة التحكم' : 'Admin')}</span>
              </button>
            )}
          </div>

          {/* User Profile & Actions Bar in Drawer */}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            {userProfile ? (
              <div className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-slate-100">
                    {userProfile.username || userProfile.userId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLoginModal?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                  >
                    {isAr ? 'تعديل الملف' : 'Edit Profile'}
                  </button>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenLoginModal?.();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t.loginBtn}</span>
              </button>
            )}

            {onExportPdf && (
              <button
                type="button"
                onClick={() => {
                  onExportPdf();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>{t.headerPdfBtn}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
