import React, { useState } from 'react';
import {
  Clock,
  Dumbbell,
  Calendar,
  Flame,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Award,
  Filter,
  Search,
  Printer,
  Layers,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { WorkoutSheet, WorkoutLog, UserProfile } from '../types';

interface WorkoutHistoryViewProps {
  userProfile: UserProfile;
  lang: 'en' | 'ar';
  sheets: WorkoutSheet[];
  workoutLogs: WorkoutLog[];
  activeSheetId: string | null;
  onSelectActiveSheet: (sheetId: string) => void;
  onNavigateToWorkout: () => void;
}

export const WorkoutHistoryView: React.FC<WorkoutHistoryViewProps> = ({
  userProfile,
  lang,
  sheets,
  workoutLogs,
  activeSheetId,
  onSelectActiveSheet,
  onNavigateToWorkout,
}) => {
  const isAr = lang === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [expandedSheetIds, setExpandedSheetIds] = useState<Set<string>>(new Set([activeSheetId || '']));

  // Toggle log accordion
  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  // Toggle sheet accordion
  const toggleSheetExpand = (sheetId: string) => {
    setExpandedSheetIds((prev) => {
      const next = new Set(prev);
      if (next.has(sheetId)) next.delete(sheetId);
      else next.add(sheetId);
      return next;
    });
  };

  // Calculate high-level stats
  const totalLogsCount = workoutLogs.length;
  const totalVolumeLiftedKg = workoutLogs.reduce((acc, log) => acc + (log.totalVolumeKg || 0), 0);
  const totalVolumeTons = (totalVolumeLiftedKg / 1000).toFixed(1);

  let maxWeightLifted = 0;
  workoutLogs.forEach((log) => {
    if (log.maxWeightKg && log.maxWeightKg > maxWeightLifted) {
      maxWeightLifted = log.maxWeightKg;
    }
  });

  // Filtered workout logs
  const filteredLogs = workoutLogs.filter((log) => {
    const matchesSheet =
      selectedSheetFilter === 'all' || log.sheetId === selectedSheetFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      (log.sheetName && log.sheetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.dayName && log.dayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.exercises.some((e) => e.exerciseName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSheet && matchesQuery;
  });

  // Print summary report
  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & High-Level Metric Cards */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isAr ? 'سجل الشيتات والتمارين السابقة' : 'Workout Sheets & Training History'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {isAr
                  ? 'متابعة كافة شيتات التمارين، وسجل الأوزان الأسبوعية، والتطور العضلي التدريجي'
                  : 'Track past workout sheets, progression across weeks, and cumulative volume'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintSummary}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Print or save as PDF"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>{isAr ? 'طباعة تقرير الإنجاز' : 'Print / Export PDF'}</span>
            </button>

            <button
              onClick={onNavigateToWorkout}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Dumbbell className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'بدء تمرين اليوم' : 'Active Workout'}</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{isAr ? 'الشيتات المسجلة' : 'Total Sheets'}</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {sheets.length}
            </div>
            <div className="text-[10px] text-indigo-300 font-mono">
              {isAr ? 'برامج تدريبية' : 'training programs'}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{isAr ? 'الجلسات المنفذة' : 'Logged Workouts'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {totalLogsCount}
            </div>
            <div className="text-[10px] text-emerald-300 font-mono">
              {isAr ? 'جلسات مكتملة' : 'completed sessions'}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{isAr ? 'الحجم التراكمي' : 'Total Volume'}</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {totalVolumeTons} <span className="text-sm font-normal text-slate-400">Tons</span>
            </div>
            <div className="text-[10px] text-amber-300 font-mono">
              {totalVolumeLiftedKg.toLocaleString()} kg
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{isAr ? 'أعلى وزن مسجل' : 'Max Weight'}</span>
              <Award className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {maxWeightLifted} <span className="text-sm font-normal text-slate-400">kg</span>
            </div>
            <div className="text-[10px] text-rose-300 font-mono">
              {isAr ? 'أثقل رفعة' : 'heaviest recorded lift'}
            </div>
          </div>
        </div>
      </div>

      {/* Sheets Directory Accordion ("history of the sheets") */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              {isAr ? 'دليل شيتات التمارين والبرامج' : 'Workout Sheets Program Directory'}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
              {sheets.length}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            {isAr ? 'انقر على أي شيت لتعيينه كبرنامج نشط' : 'Click to select or review sheet'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sheets.map((sheet) => {
            const isActive = activeSheetId === sheet.id;
            const sheetLogs = workoutLogs.filter((l) => l.sheetId === sheet.id);
            const sheetVolume = sheetLogs.reduce((acc, l) => acc + (l.totalVolumeKg || 0), 0);
            const progressPercent = Math.min(
              Math.round(((sheet.currentWeek || 1) / (sheet.totalWeeks || 8)) * 100),
              100
            );

            return (
              <div
                key={sheet.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isActive
                    ? 'bg-slate-900 border-amber-400/80 shadow-lg shadow-amber-950/30'
                    : 'bg-slate-900/60 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm sm:text-base text-white">{sheet.name}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                          {isAr ? 'نشط حالياً' : 'Active'}
                        </span>
                      )}
                    </div>
                    {sheet.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {sheet.description}
                      </p>
                    )}
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onSelectActiveSheet(sheet.id)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      {isAr ? 'تفعيل' : 'Activate'}
                    </button>
                  )}
                </div>

                {/* Progress bar across repetition weeks */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {isAr
                        ? `الأسبوع ${sheet.currentWeek || 1} من ${sheet.totalWeeks || 8}`
                        : `Week ${sheet.currentWeek || 1} of ${sheet.totalWeeks || 8}`}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      {isAr ? 'التمارين' : 'Exercises'}
                    </span>
                    <span className="font-bold text-slate-200 font-mono">
                      {sheet.exercises?.length || 0}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      {isAr ? 'الجلسات' : 'Sessions'}
                    </span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {sheetLogs.length}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">
                      {isAr ? 'الحجم' : 'Volume'}
                    </span>
                    <span className="font-bold text-amber-400 font-mono">
                      {sheetVolume > 0 ? `${Math.round(sheetVolume / 1000)}k kg` : '0 kg'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week-by-Week Session Logs History */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              {isAr ? 'سجل الجلسات والأوزان المسجلة تفصيلياً' : 'Detailed Workout Logs & Weight Records'}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
              {filteredLogs.length}
            </span>
          </div>

          {/* Filter by sheet */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSheetFilter}
              onChange={(e) => setSelectedSheetFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="all">{isAr ? 'كافة الشيتات' : 'All Sheets'}</option>
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في التمارين...' : 'Search exercises...'}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-700 space-y-3">
            <Dumbbell className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">
              {isAr ? 'لا توجد جلسات مسجلة حتى الآن' : 'No workout sessions logged yet'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isAr
                ? 'انتقل إلى تبويب التمارين وقم بتسجيل مجموعات وأوزان تمرين اليوم ليتم حفظها وعرضها هنا.'
                : 'Navigate to the Workout tab and log your sets and weights to track your historical progression here.'}
            </p>
            <button
              onClick={onNavigateToWorkout}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
            >
              {isAr ? 'الذهاب لتسجيل تمرين' : 'Go to Workout Log'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogIds.has(log.id);

              return (
                <div
                  key={log.id}
                  className="bg-slate-900/80 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div
                    onClick={() => toggleLogExpand(log.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-white">{log.dayName}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                            {isAr ? `الأسبوع ${log.weekNumber}` : `Week ${log.weekNumber}`}
                          </span>
                          {log.sheetName && (
                            <span className="text-xs text-slate-400">• {log.sheetName}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {log.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">
                          {isAr ? 'الحجم' : 'Volume'}
                        </span>
                        <span className="font-bold text-amber-400">{log.totalVolumeKg} kg</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">
                          {isAr ? 'أعلى وزن' : 'Max Wt'}
                        </span>
                        <span className="font-bold text-emerald-400">{log.maxWeightKg} kg</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">
                          {isAr ? 'التمارين' : 'Exercises'}
                        </span>
                        <span className="font-bold text-slate-200">
                          {log.exercises?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Exercise Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {log.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white">
                                {ex.exerciseName}
                              </span>
                              {ex.category && (
                                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {ex.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {ex.sets.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`px-2 py-1 rounded text-[11px] font-mono border ${
                                    s.completed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  #{s.setNumber}: <strong>{s.weightKg}kg</strong> × {s.reps}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
