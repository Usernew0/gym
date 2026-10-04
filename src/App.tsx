import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { WorkoutSheetView } from './components/WorkoutSheetView';
import { WorkoutHistoryView } from './components/WorkoutHistoryView';
import { FoodNutritionView } from './components/FoodNutritionView';
import { AdminPanel } from './components/AdminPanel';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { WorkoutSheet, WorkoutLog, NutritionLog, UserProfile } from './types';
import { PRESET_WORKOUT_PLANS } from './utils/sheetExtractor';
import { translations, Language } from './data/translations';
import {
  getStoredUserProfile,
  setStoredUserProfile,
  clearFullSession,
  saveFullSession,
  STORAGE_KEYS,
} from './lib/session';
import {
  seedDefaultDataToFirestore,
  getSiteFaviconFromFirestore,
  subscribeToSiteFavicon,
  getSessionTimeoutFromFirestore,
  subscribeToSessionTimeout,
  saveWorkoutSheetToFirestore,
  getWorkoutSheetsFromFirestore,
  subscribeToWorkoutSheets,
  saveWorkoutLogToFirestore,
  getWorkoutLogsFromFirestore,
  saveNutritionLogToFirestore,
  getNutritionLogsFromFirestore,
  checkFirestoreHealth,
} from './lib/firebase';
import {
  getSiteFaviconApi,
  getSessionTimeoutApi,
} from './lib/api';
import {
  updateWebsiteFavicon,
  getSavedFavicon,
  setSavedFaviconLocally,
} from './utils/favicon';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workout' | 'history' | 'nutrition' | 'admin'>('workout');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return getStoredUserProfile();
  });

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('gym_workout_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('gym_workout_lang', lang);
    } catch {}
  }, [lang]);

  const t = translations[lang];

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gym_workout_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true; // Default dark athletic theme for gym
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gym_workout_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gym_workout_theme', 'light');
    }
  }, [isDarkMode]);

  // Modals & Inactivity
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gym_inactivity_timeout_minutes');
      return saved ? parseInt(saved, 10) || 30 : 30;
    } catch {
      return 30;
    }
  });
  const lastActivityRef = useRef<number>(Date.now());

  // User-isolated Workout Sheets & Logs
  const [sheets, setSheets] = useState<WorkoutSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

  // Auto-seed Firestore & Favicon on Mount
  useEffect(() => {
    seedDefaultDataToFirestore();

    const initialFavicon = getSavedFavicon();
    updateWebsiteFavicon(initialFavicon);

    getSiteFaviconFromFirestore().then((remoteFavicon) => {
      if (remoteFavicon) setSavedFaviconLocally(remoteFavicon);
    });

    const unsubscribeFavicon = subscribeToSiteFavicon((newFavicon) => {
      if (newFavicon) setSavedFaviconLocally(newFavicon);
    });

    return () => {
      unsubscribeFavicon();
    };
  }, []);

  // Sync Inactivity Timeout
  useEffect(() => {
    getSessionTimeoutFromFirestore().then((timeout) => {
      if (timeout && timeout > 0) setInactivityTimeoutMinutes(timeout);
    });
    const unsubTimeout = subscribeToSessionTimeout((timeout) => {
      if (timeout && timeout > 0) setInactivityTimeoutMinutes(timeout);
    });
    return () => {
      unsubTimeout();
    };
  }, []);

  // Load User Data (Sheets & Logs) whenever userProfile changes
  useEffect(() => {
    if (!userProfile) {
      setSheets([]);
      setActiveSheetId(null);
      setWorkoutLogs([]);
      setNutritionLogs([]);
      return;
    }

    const userId = (userProfile.userId || userProfile.username || 'user').toLowerCase().trim();
    const sheetsStorageKey = `gym_sheets_${userId}`;
    const logsStorageKey = `gym_logs_${userId}`;
    const nutritionStorageKey = `gym_nutrition_${userId}`;

    // 1. Instant Local Storage Load (0ms responsiveness)
    try {
      const savedSheetsStr = localStorage.getItem(sheetsStorageKey);
      if (savedSheetsStr) {
        const parsed = JSON.parse(savedSheetsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSheets(parsed);
          setActiveSheetId(parsed[0].id);
        } else {
          setSheets(PRESET_WORKOUT_PLANS);
          setActiveSheetId(PRESET_WORKOUT_PLANS[0].id);
        }
      } else {
        setSheets(PRESET_WORKOUT_PLANS);
        setActiveSheetId(PRESET_WORKOUT_PLANS[0].id);
      }

      const savedLogsStr = localStorage.getItem(logsStorageKey);
      if (savedLogsStr) {
        const parsedLogs = JSON.parse(savedLogsStr);
        if (Array.isArray(parsedLogs)) {
          setWorkoutLogs(parsedLogs);
        }
      }

      const savedNutritionStr = localStorage.getItem(nutritionStorageKey);
      if (savedNutritionStr) {
        const parsedNutr = JSON.parse(savedNutritionStr);
        if (Array.isArray(parsedNutr)) {
          setNutritionLogs(parsedNutr);
        }
      }
    } catch (err) {
      console.warn('Error loading gym user data from storage:', err);
    }

    // 2. Fetch and Merge Remote Data from Cloud Firestore & Supabase
    let isCancelled = false;
    const fetchRemoteData = async () => {
      try {
        const [remoteSheets, remoteLogs, remoteNutr] = await Promise.all([
          getWorkoutSheetsFromFirestore(userId),
          getWorkoutLogsFromFirestore(userId),
          getNutritionLogsFromFirestore(userId),
        ]);

        if (isCancelled) return;

        // Merge Workout Sheets
        if (Array.isArray(remoteSheets) && remoteSheets.length > 0) {
          setSheets((prev) => {
            const map = new Map<string, WorkoutSheet>();
            remoteSheets.forEach((s) => map.set(s.id, s));
            prev.forEach((s) => {
              if (!map.has(s.id)) map.set(s.id, s);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(sheetsStorageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        // Merge Workout Logs
        if (Array.isArray(remoteLogs) && remoteLogs.length > 0) {
          setWorkoutLogs((prev) => {
            const map = new Map<string, WorkoutLog>();
            remoteLogs.forEach((l) => map.set(l.id, l));
            prev.forEach((l) => {
              if (!map.has(l.id)) map.set(l.id, l);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.loggedAt || b.createdAt || b.date || 0).getTime() - new Date(a.loggedAt || a.createdAt || a.date || 0).getTime()
            );
            try {
              localStorage.setItem(logsStorageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        // Merge Nutrition Logs
        if (Array.isArray(remoteNutr) && remoteNutr.length > 0) {
          setNutritionLogs((prev) => {
            const map = new Map<string, NutritionLog>();
            remoteNutr.forEach((n) => map.set(n.id || n.date, n));
            prev.forEach((n) => {
              const k = n.id || n.date;
              if (!map.has(k)) map.set(k, n);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
            try {
              localStorage.setItem(nutritionStorageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (cloudErr) {
        console.info('Cloud data fetch notice (operating offline):', cloudErr);
      }
    };

    fetchRemoteData();

    // 3. Real-time subscription for Workout Sheets
    const unsubscribeSheets = subscribeToWorkoutSheets((liveSheets) => {
      if (liveSheets && liveSheets.length > 0) {
        setSheets((prev) => {
          const map = new Map<string, WorkoutSheet>();
          liveSheets.forEach((s) => map.set(s.id, s));
          prev.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(sheetsStorageKey, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    }, userId);

    return () => {
      isCancelled = true;
      unsubscribeSheets();
    };
  }, [userProfile]);

  // Persist sheets when updated
  const handleSaveSheet = (sheet: WorkoutSheet) => {
    if (!userProfile) return;
    const userId = (userProfile.userId || userProfile.username || 'user').toLowerCase().trim();
    const sheetsStorageKey = `gym_sheets_${userId}`;

    setSheets((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === sheet.id);
      let updated: WorkoutSheet[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = sheet;
      } else {
        updated = [sheet, ...prev];
      }
      try {
        localStorage.setItem(sheetsStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveSheetId(sheet.id);

    // Asynchronously push to Cloud Firestore & Supabase
    saveWorkoutSheetToFirestore({
      ...sheet,
      userId,
    }).catch((err) => {
      console.info('Background cloud save notice:', err);
    });
  };

  // Persist workout log when logged
  const handleLogWorkout = (log: WorkoutLog) => {
    if (!userProfile) return;
    const userId = (userProfile.userId || userProfile.username || 'user').toLowerCase().trim();
    const logsStorageKey = `gym_logs_${userId}`;

    setWorkoutLogs((prev) => {
      const updated = [log, ...prev];
      try {
        localStorage.setItem(logsStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Asynchronously push to Cloud Firestore & Supabase
    saveWorkoutLogToFirestore({
      ...log,
      userId,
    }).catch((err) => {
      console.info('Background cloud workout log save notice:', err);
    });
  };

  // Persist nutrition log
  const handleSaveNutritionLog = (log: NutritionLog) => {
    if (!userProfile) return;
    const userId = (userProfile.userId || userProfile.username || 'user').toLowerCase().trim();
    const nutritionStorageKey = `gym_nutrition_${userId}`;

    setNutritionLogs((prev) => {
      const existingIdx = prev.findIndex((l) => l.date === log.date);
      let updated: NutritionLog[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = log;
      } else {
        updated = [log, ...prev];
      }
      try {
        localStorage.setItem(nutritionStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Asynchronously push to Cloud Firestore & Supabase
    saveNutritionLogToFirestore({
      ...log,
      userId,
    }).catch((err) => {
      console.info('Background cloud nutrition save notice:', err);
    });
  };

  // Inactivity Auto-Logout
  const handleLogout = useCallback(() => {
    clearFullSession();
    setUserProfile(null);
    setSheets([]);
    setActiveSheetId(null);
    setWorkoutLogs([]);
    setNutritionLogs([]);
    setActiveTab('workout');
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    lastActivityRef.current = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const limitMs = inactivityTimeoutMinutes * 60 * 1000;

      if (idleMs >= limitMs) {
        handleLogout();
        setInactivityNotice(
          lang === 'ar'
            ? `تم تسجيل الخروج لعدم وجود نشاط لمدة ${inactivityTimeoutMinutes} دقيقة.`
            : `Logged out due to inactivity (${inactivityTimeoutMinutes} mins).`
        );
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
    };
  }, [userProfile, inactivityTimeoutMinutes, handleLogout, lang]);

  // Active workout sheet reference
  const currentActiveSheet =
    sheets.find((s) => s.id === activeSheetId) || sheets[0] || PRESET_WORKOUT_PLANS[0];

  // If no user is logged in, show LoginScreen
  if (!userProfile) {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        {inactivityNotice && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
            <span>{inactivityNotice}</span>
            <button
              onClick={() => setInactivityNotice(null)}
              className="ltr:ml-2 rtl:mr-2 px-2 py-0.5 rounded bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 font-black text-[11px] cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق' : 'Dismiss'}
            </button>
          </div>
        )}
        <LoginScreen
          lang={lang}
          setLang={setLang}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onLoginSuccess={(profile) => {
            setInactivityNotice(null);
            setUserProfile(profile);
            if (profile.role === 'admin' || profile.username?.toLowerCase() === 'admin') {
              setActiveTab('admin');
            } else {
              setActiveTab('workout');
            }
          }}
        />
      </div>
    );
  }

  // Admin Panel Dedicated View
  if (activeTab === 'admin' && (userProfile?.role === 'admin' || userProfile?.username?.toLowerCase() === 'admin')) {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-900 text-slate-100 font-sans">
        <AdminPanel
          lang={lang}
          setLang={setLang}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          currentUser={userProfile}
          onLogout={handleLogout}
          onSwitchToTraderView={() => setActiveTab('workout')}
        />
      </div>
    );
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans transition-colors duration-200 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950"
    >
      <div>
        {/* Navigation Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          historyCount={workoutLogs.length}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          lang={lang}
          setLang={setLang}
          t={t}
          onExportPdf={() => window.print()}
          userProfile={userProfile}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Content Body */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Tab 1: Workout Sheet & Daily Exercise Value Inputs */}
          {activeTab === 'workout' && (
            <WorkoutSheetView
              userProfile={userProfile}
              lang={lang}
              activeSheet={currentActiveSheet}
              onSaveSheet={handleSaveSheet}
              onLogWorkout={handleLogWorkout}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {/* Tab 2: History of the Sheets & Past Workouts */}
          {activeTab === 'history' && (
            <WorkoutHistoryView
              userProfile={userProfile}
              lang={lang}
              sheets={sheets}
              workoutLogs={workoutLogs}
              activeSheetId={activeSheetId}
              onSelectActiveSheet={(id) => {
                setActiveSheetId(id);
                setActiveTab('workout');
              }}
              onNavigateToWorkout={() => setActiveTab('workout')}
            />
          )}

          {/* Tab 3: Food and Nutrition (Discussed later, added cleanly) */}
          {activeTab === 'nutrition' && (
            <FoodNutritionView
              userProfile={userProfile}
              lang={lang}
              nutritionLogs={nutritionLogs}
              onSaveNutritionLog={handleSaveNutritionLog}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs py-6 mt-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400">Gym workout</span>
            <span>—</span>
            <span>
              {lang === 'ar'
                ? 'نظام استخراج شيتات التمارين والتطور التدريجي'
                : 'Smart Workout Sheet Tracker & Overload Engine'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>Active Sheet: {currentActiveSheet.name}</span>
            <span>•</span>
            <span>Weeks: {currentActiveSheet.totalWeeks} Wks</span>
            <span>•</span>
            <span>Logs: {workoutLogs.length}</span>
          </div>
        </div>
      </footer>

      {/* User Login/Profile Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        lang={lang}
        currentUser={userProfile}
        onLoginSuccess={(profile) => {
          setUserProfile(profile);
          setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
}
