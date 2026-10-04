import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  FileSpreadsheet,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Flame,
  TrendingUp,
  RefreshCw,
  Copy,
  Clock,
  ChevronRight,
  Info,
  Sliders,
  Award,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  WorkoutSheet,
  WorkoutExercise,
  WorkoutLog,
  ExerciseLogEntry,
  SetLogEntry,
  UserProfile,
} from '../types';
import {
  extractExercisesFromText,
  PRESET_WORKOUT_PLANS,
  classifyMuscleGroup,
} from '../utils/sheetExtractor';

interface WorkoutSheetViewProps {
  userProfile: UserProfile;
  lang: 'en' | 'ar';
  activeSheet: WorkoutSheet | null;
  onUpdateSheet: (sheet: WorkoutSheet) => void;
  onSaveWorkoutLog: (log: WorkoutLog) => void;
  onOpenHistoryTab: () => void;
}

export const WorkoutSheetView: React.FC<WorkoutSheetViewProps> = ({
  userProfile,
  lang,
  activeSheet,
  onUpdateSheet,
  onSaveWorkoutLog,
  onOpenHistoryTab,
}) => {
  const isAr = lang === 'ar';

  // Sheet configuration & extraction state
  const [showExtractorModal, setShowExtractorModal] = useState(false);
  const [sheetInputText, setSheetInputText] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('');
  const [repeatWeeksInput, setRepeatWeeksInput] = useState(8);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionNotice, setExtractionNotice] = useState<string | null>(null);

  // Active workout execution state
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);

  // Map of exerciseId -> SetLogEntry[] for the current session input
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLogEntry[]>>({});
  const [isLoggingSuccess, setIsLoggingSuccess] = useState(false);

  // Load active sheet or preset if empty
  const currentSheet = activeSheet || PRESET_WORKOUT_PLANS[0];

  useEffect(() => {
    if (currentSheet) {
      setSelectedWeek(currentSheet.currentWeek || 1);
    }
  }, [currentSheet?.id]);

  // Group exercises by day
  const dayGroups = React.useMemo(() => {
    if (!currentSheet || !currentSheet.exercises) return [];
    const groups: { dayIndex: number; dayName: string; exercises: WorkoutExercise[] }[] = [];
    const map = new Map<number, { dayName: string; exercises: WorkoutExercise[] }>();

    currentSheet.exercises.forEach((ex) => {
      const idx = ex.dayIndex || 1;
      if (!map.has(idx)) {
        map.set(idx, { dayName: ex.dayName || `Day ${idx}`, exercises: [] });
      }
      map.get(idx)!.exercises.push(ex);
    });

    map.forEach((value, key) => {
      groups.push({ dayIndex: key, dayName: value.dayName, exercises: value.exercises });
    });

    return groups.sort((a, b) => a.dayIndex - b.dayIndex);
  }, [currentSheet]);

  // Current day's exercises
  const activeDayGroup =
    dayGroups.find((g) => g.dayIndex === selectedDayIndex) || dayGroups[0] || null;

  // Initialize exercise logs structure when day or week changes
  useEffect(() => {
    if (!activeDayGroup) return;

    setExerciseLogs((prev) => {
      const updated = { ...prev };
      activeDayGroup.exercises.forEach((ex) => {
        if (!updated[ex.id]) {
          // Parse target reps to a reasonable default number e.g. "8-12" -> 10
          let defaultReps = 10;
          const match = ex.targetReps.match(/\d+/);
          if (match) defaultReps = parseInt(match[0], 10);

          const defaultWeight = ex.targetWeight || 40;
          const numSets = ex.sets || 3;

          const sets: SetLogEntry[] = [];
          for (let s = 1; s <= numSets; s++) {
            sets.push({
              setNumber: s,
              weightKg: defaultWeight,
              reps: defaultReps,
              completed: false,
            });
          }
          updated[ex.id] = sets;
        }
      });
      return updated;
    });
  }, [activeDayGroup, selectedWeek]);

  // Handler: Modify set value
  const handleUpdateSet = (
    exerciseId: string,
    setIndex: number,
    field: 'weightKg' | 'reps' | 'completed',
    value: any
  ) => {
    setExerciseLogs((prev) => {
      const currentSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      if (!currentSets[setIndex]) return prev;

      currentSets[setIndex] = {
        ...currentSets[setIndex],
        [field]: value,
      };

      return {
        ...prev,
        [exerciseId]: currentSets,
      };
    });
  };

  // Handler: Add set to exercise
  const handleAddSet = (exerciseId: string) => {
    setExerciseLogs((prev) => {
      const currentSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const lastSet = currentSets[currentSets.length - 1];
      const newSetNumber = currentSets.length + 1;

      currentSets.push({
        setNumber: newSetNumber,
        weightKg: lastSet ? lastSet.weightKg : 50,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      });

      return {
        ...prev,
        [exerciseId]: currentSets,
      };
    });
  };

  // Handler: Remove set from exercise
  const handleRemoveSet = (exerciseId: string, setIndex: number) => {
    setExerciseLogs((prev) => {
      const currentSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      if (currentSets.length <= 1) return prev;
      currentSets.splice(setIndex, 1);
      // re-index set numbers
      const reindexed = currentSets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return {
        ...prev,
        [exerciseId]: reindexed,
      };
    });
  };

  // Handler: Auto-fill all sets with same weight
  const handleFillAllSetsWeight = (exerciseId: string, weight: number) => {
    setExerciseLogs((prev) => {
      const currentSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const updated = currentSets.map((s) => ({ ...s, weightKg: weight }));
      return {
        ...prev,
        [exerciseId]: updated,
      };
    });
  };

  // Handler: Mark all sets for this exercise as completed
  const handleMarkAllSetsCompleted = (exerciseId: string, completed: boolean) => {
    setExerciseLogs((prev) => {
      const currentSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const updated = currentSets.map((s) => ({ ...s, completed }));
      return {
        ...prev,
        [exerciseId]: updated,
      };
    });
  };

  // Calculate live volume lifted in current workout day
  const totalVolumeKg = React.useMemo(() => {
    let vol = 0;
    (Object.values(exerciseLogs) as SetLogEntry[][]).forEach((sets) => {
      sets.forEach((s) => {
        if (s.completed && s.weightKg > 0 && s.reps > 0) {
          vol += s.weightKg * s.reps;
        }
      });
    });
    return Math.round(vol);
  }, [exerciseLogs]);

  // Total completed sets
  const totalCompletedSets = React.useMemo(() => {
    let count = 0;
    (Object.values(exerciseLogs) as SetLogEntry[][]).forEach((sets) => {
      sets.forEach((s) => {
        if (s.completed) count++;
      });
    });
    return count;
  }, [exerciseLogs]);

  // Handler: Save and log current workout
  const handleSaveWorkout = () => {
    if (!activeDayGroup || !currentSheet) return;

    const entries: ExerciseLogEntry[] = activeDayGroup.exercises.map((ex) => {
      const sets = exerciseLogs[ex.id] || [];
      const allCompleted = sets.length > 0 && sets.every((s) => s.completed);
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        dayName: activeDayGroup.dayName,
        category: ex.category,
        targetSets: ex.sets,
        targetReps: ex.targetReps,
        sets,
        completed: allCompleted,
      };
    });

    let maxWeight = 0;
    entries.forEach((e) => {
      e.sets.forEach((s) => {
        if (s.weightKg > maxWeight) maxWeight = s.weightKg;
      });
    });

    const newLog: WorkoutLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sheetId: currentSheet.id,
      sheetName: currentSheet.name,
      userId: userProfile.userId || userProfile.username,
      userName: userProfile.name || userProfile.username,
      weekNumber: selectedWeek,
      dayName: activeDayGroup.dayName,
      date: new Date().toISOString().split('T')[0],
      exercises: entries,
      totalVolumeKg,
      maxWeightKg: maxWeight,
      completed: true,
      loggedAt: new Date().toISOString(),
    };

    onSaveWorkoutLog(newLog);

    // Update sheet current week if progressing
    if (selectedWeek > (currentSheet.currentWeek || 1)) {
      onUpdateSheet({
        ...currentSheet,
        currentWeek: selectedWeek,
      });
    }

    setIsLoggingSuccess(true);
    setTimeout(() => {
      setIsLoggingSuccess(false);
    }, 4000);
  };

  // Handler: Run Extractor from pasted text / spreadsheet
  const handleExtractSheet = () => {
    if (!sheetInputText.trim()) {
      setExtractionNotice(
        isAr ? 'يرجى لصق نص أو جدول التمارين أولاً' : 'Please paste your workout sheet text first'
      );
      return;
    }

    setIsExtracting(true);
    setExtractionNotice(null);

    try {
      const extracted = extractExercisesFromText(sheetInputText);

      if (extracted.exercises.length === 0) {
        setExtractionNotice(
          isAr
            ? 'لم يتم التعرف على تمارين في النص المدخل. تأكد من إدراج أسماء التمارين والمجموعات والتكرارات (مثل: Bench Press 4x10).'
            : 'No exercises detected. Ensure you include exercise names, sets, and reps (e.g., Bench Press 4x10).'
        );
        setIsExtracting(false);
        return;
      }

      const newSheet: WorkoutSheet = {
        id: `SHEET-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: userProfile.userId || userProfile.username,
        userName: userProfile.name || userProfile.username,
        name: sheetNameInput.trim() || extracted.sheetName || 'Custom Gym Workout Program',
        totalWeeks: repeatWeeksInput || extracted.totalWeeks || 8,
        currentWeek: 1,
        daysPerWeek: extracted.daysPerWeek || 3,
        sheetSource: 'text',
        rawSheetContent: sheetInputText,
        exercises: extracted.exercises,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      onUpdateSheet(newSheet);
      setSelectedWeek(1);
      setSelectedDayIndex(1);
      setShowExtractorModal(false);
      setSheetInputText('');
      setSheetNameInput('');
      setExtractionNotice(null);
    } catch (err: any) {
      setExtractionNotice(err?.message || 'Failed to extract workout sheet');
    } finally {
      setIsExtracting(false);
    }
  };

  // Preset quick selection
  const handleSelectPreset = (preset: WorkoutSheet) => {
    onUpdateSheet({
      ...preset,
      id: `SHEET-${Date.now()}-${preset.id}`,
      userId: userProfile.userId || userProfile.username,
      userName: userProfile.name || userProfile.username,
      createdAt: new Date().toISOString(),
    });
    setSelectedWeek(1);
    setSelectedDayIndex(1);
    setShowExtractorModal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner: Active Sheet Info & Week Selector */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Dumbbell className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {currentSheet.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                {isAr ? 'برنامج نشط' : 'Active Plan'}
              </span>
            </div>
            {currentSheet.description && (
              <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
                {currentSheet.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowExtractorModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>{isAr ? 'تحديث أو رفع شيت جديد' : 'Update / Upload Sheet'}</span>
            </button>

            <button
              onClick={onOpenHistoryTab}
              className="px-3.5 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{isAr ? 'سجل الشيتات' : 'Sheets History'}</span>
            </button>
          </div>
        </div>

        {/* Multi-Week Repetition Controller ("the user will set this sheet will repeat for how many weeks") */}
        <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">
                {isAr
                  ? `مدة تكرار الشيت: ${currentSheet.totalWeeks} أسابيع`
                  : `Program Repetition Cycle: ${currentSheet.totalWeeks} Weeks`}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                {isAr
                  ? `الأسبوع الحالي: ${selectedWeek} من ${currentSheet.totalWeeks}`
                  : `Active: Week ${selectedWeek} of ${currentSheet.totalWeeks}`}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isAr
                  ? 'اختر الأسبوع لتسجيل الأوزان ومتابعة الزيادة التدريجية (Overload)'
                  : 'Select active training week to record sets & progressive overload'}
              </span>
            </div>
          </div>

          {/* Week Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {Array.from({ length: currentSheet.totalWeeks || 8 }, (_, i) => i + 1).map((wk) => {
              const isSelected = selectedWeek === wk;
              const isCurrent = (currentSheet.currentWeek || 1) === wk;

              return (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setSelectedWeek(wk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40 scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <span>{isAr ? `الأسبوع ${wk}` : `Week ${wk}`}</span>
                  {isCurrent && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-slate-950' : 'bg-amber-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Days of Week Tabs (Push / Pull / Legs / Day 1 / Day 2 ...) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-700/60 no-scrollbar">
          {dayGroups.map((group) => {
            const isSelected = selectedDayIndex === group.dayIndex;
            return (
              <button
                key={group.dayIndex}
                type="button"
                onClick={() => setSelectedDayIndex(group.dayIndex)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/40 font-black'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{group.dayName}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isSelected ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {group.exercises.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      {isLoggingSuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-2xl p-4 text-emerald-200 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {isAr ? 'تم تسجيل وتوثيق تمرينك بنجاح!' : 'Workout Session Logged Successfully!'}
              </p>
              <p className="text-xs text-emerald-300 mt-0.5">
                {isAr
                  ? `الحجم الكلي المحقق: ${totalVolumeKg} كجم • تم الحفظ في قاعدة البيانات والمزامنة السحابية.`
                  : `Total Volume Lifted: ${totalVolumeKg} kg • Synced to Cloud database & local cache.`}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenHistoryTab}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            {isAr ? 'عرض في السجل' : 'View in History'}
          </button>
        </div>
      )}

      {/* Active Day Exercises & Value Input Cards */}
      {activeDayGroup && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">{activeDayGroup.dayName}</h3>
              <span className="text-xs text-slate-400">
                ({activeDayGroup.exercises.length} {isAr ? 'تمارين مستخرجة' : 'extracted exercises'})
              </span>
            </div>

            {/* Quick Session Stats */}
            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5 font-mono">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isAr ? 'الحجم:' : 'Volume:'}{' '}
                  <strong className="text-amber-400">{totalVolumeKg} kg</strong>
                </span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5 font-mono">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isAr ? 'المجموعات المكتملة:' : 'Sets Done:'}{' '}
                  <strong className="text-emerald-400">{totalCompletedSets}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Exercise Cards */}
          <div className="space-y-4">
            {activeDayGroup.exercises.map((exercise, exIndex) => {
              const sets = exerciseLogs[exercise.id] || [];
              const allDone = sets.length > 0 && sets.every((s) => s.completed);

              return (
                <div
                  key={exercise.id}
                  className={`bg-slate-800/80 border rounded-2xl p-4 sm:p-5 shadow-lg transition-all ${
                    allDone
                      ? 'border-emerald-500/50 bg-slate-800/90'
                      : 'border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Exercise Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700/70">
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">
                        {exIndex + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm sm:text-base text-white">
                            {exercise.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {exercise.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAr ? 'الهدف المخطط في الشيت:' : 'Target from sheet:'}{' '}
                          <span className="text-slate-200 font-bold">
                            {exercise.sets} {isAr ? 'مجموعات' : 'Sets'} × {exercise.targetReps}{' '}
                            {isAr ? 'تكرار' : 'Reps'}
                          </span>
                          {exercise.restSeconds && (
                            <span className="ltr:ml-2 rtl:mr-2 text-slate-500">
                              ⏱ {exercise.restSeconds}s {isAr ? 'راحة' : 'rest'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleMarkAllSetsCompleted(exercise.id, !allDone)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          allDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{allDone ? (isAr ? 'مكتمل بالكامل' : 'All Done') : (isAr ? 'تحديد الكل كمكتمل' : 'Mark All Done')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddSet(exercise.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title={isAr ? 'إضافة مجموعة جديدة' : 'Add extra set'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'مجموعة' : 'Set'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes if present */}
                  {exercise.notes && (
                    <div className="text-xs text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 mt-2.5 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{exercise.notes}</span>
                    </div>
                  )}

                  {/* Sets Input Rows Table ("to make input to enter the value of this excercises") */}
                  <div className="mt-4 overflow-x-auto no-scrollbar">
                    <table className="w-full text-start text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700/60 pb-2">
                          <th className="py-2 text-start font-bold w-12">{isAr ? 'المجموعة' : 'Set'}</th>
                          <th className="py-2 text-start font-bold">{isAr ? 'الوزن (كجم / kg)' : 'Weight (kg)'}</th>
                          <th className="py-2 text-start font-bold">{isAr ? 'التكرارات (Reps)' : 'Reps Done'}</th>
                          <th className="py-2 text-start font-bold">{isAr ? 'الحجم' : 'Volume'}</th>
                          <th className="py-2 text-center font-bold w-24">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-2 text-center font-bold w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {sets.map((setEntry, setIdx) => {
                          const setVolume = (setEntry.weightKg || 0) * (setEntry.reps || 0);

                          return (
                            <tr
                              key={setIdx}
                              className={`transition-colors ${
                                setEntry.completed
                                  ? 'bg-emerald-500/5 text-slate-100'
                                  : 'hover:bg-slate-900/40'
                              }`}
                            >
                              {/* Set Number */}
                              <td className="py-2.5 font-black text-slate-400 font-mono">
                                #{setEntry.setNumber}
                              </td>

                              {/* Weight Input */}
                              <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-1.5 max-w-[130px]">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={setEntry.weightKg}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        exercise.id,
                                        setIdx,
                                        'weightKg',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                                  />
                                  <span className="text-slate-500 text-[11px]">kg</span>
                                </div>
                              </td>

                              {/* Reps Input */}
                              <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-1.5 max-w-[110px]">
                                  <input
                                    type="number"
                                    min="0"
                                    value={setEntry.reps}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        exercise.id,
                                        setIdx,
                                        'reps',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                                  />
                                  <span className="text-slate-500 text-[11px]">reps</span>
                                </div>
                              </td>

                              {/* Volume calculation */}
                              <td className="py-2.5 font-mono text-slate-400 text-xs">
                                {setVolume > 0 ? (
                                  <span className="text-slate-200 font-bold">{setVolume} kg</span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* Check Completed Button */}
                              <td className="py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(
                                      exercise.id,
                                      setIdx,
                                      'completed',
                                      !setEntry.completed
                                    )
                                  }
                                  className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center transition-all cursor-pointer ${
                                    setEntry.completed
                                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-950/40 scale-105'
                                      : 'bg-slate-900 border border-slate-700 text-slate-500 hover:border-slate-500'
                                  }`}
                                  title={setEntry.completed ? 'Completed' : 'Mark as done'}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </td>

                              {/* Delete set */}
                              <td className="py-2.5 text-center">
                                {sets.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSet(exercise.id, setIdx)}
                                    className="text-slate-600 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                                    title="Remove this set"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick autofill helper */}
                  {sets.length > 1 && (
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleFillAllSetsWeight(exercise.id, sets[0]?.weightKg || 40)}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>
                          {isAr
                            ? `نسخ وزن أول مجموعة (${sets[0]?.weightKg} كجم) لبقية المجموعات`
                            : `Copy 1st set weight (${sets[0]?.weightKg} kg) to all sets`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Session Logging Action Card */}
          <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {isAr ? 'إجمالي الحجم المنفذ اليوم:' : 'Total Workout Volume:'}
                  </span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {totalVolumeKg} kg
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? `الأسبوع ${selectedWeek} • تم إكمال ${totalCompletedSets} مجموعة بنجاح.`
                    : `Week ${selectedWeek} • ${totalCompletedSets} sets completed so far.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveWorkout}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>
                  {isAr
                    ? `حفظ وتوثيق تمارين ${activeDayGroup.dayName}`
                    : `Save & Log ${activeDayGroup.dayName}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Update / Upload Sheet & Extractor */}
      {showExtractorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-7 w-full max-w-2xl space-y-5 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    {isAr ? 'تحديث أو استخراج شيت التمارين' : 'Update & Extract Workout Sheet'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'الصق جدول تمارينك أو اختر خطة جاهزة لاستخراج التمارين والمجموعات والتكرارات'
                      : 'Paste workout sheet text or select a ready template to extract exercises, sets & reps'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowExtractorModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'أو اختر من الخطط والبرامج الجاهزة المعتمدة:' : 'Or Select a Built-in Verified Program:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_WORKOUT_PLANS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/80 text-start transition-all cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {preset.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">
                        {preset.totalWeeks} Wks
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {preset.description}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {preset.exercises.length} {isAr ? 'تمارين مصنفة' : 'exercises'} • {preset.daysPerWeek} {isAr ? 'أيام بالأسبوع' : 'days/wk'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-500 font-bold">
                {isAr ? 'أو الصق شيت التمارين المخصص الخاص بك' : 'OR PASTE YOUR CUSTOM SHEET'}
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Custom Input Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? 'اسم برنامج التمارين:' : 'Program / Sheet Name:'}
                  </label>
                  <input
                    type="text"
                    value={sheetNameInput}
                    onChange={(e) => setSheetNameInput(e.target.value)}
                    placeholder={isAr ? 'مثال: خطة التضخيم 8 أسابيع' : 'e.g. 8-Week Strength & Hypertrophy'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Weeks repetition input */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isAr ? 'تكرار لمدة (أسابيع):' : 'Repeat for (Weeks):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={repeatWeeksInput}
                    onChange={(e) => setRepeatWeeksInput(parseInt(e.target.value, 10) || 4)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    {isAr ? 'نص الشيت أو جدول الإكسل المنسوخ:' : 'Pasted Sheet Text / Spreadsheet Rows:'}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {isAr ? 'يدعم تنسيقات 4x10 أو 3 sets x 12 reps' : 'Supports 4x10, 3 sets x 12 reps, etc.'}
                  </span>
                </div>

                <textarea
                  rows={8}
                  value={sheetInputText}
                  onChange={(e) => setSheetInputText(e.target.value)}
                  placeholder={
                    isAr
                      ? `Day 1 - Chest & Triceps (Push)\nBarbell Bench Press 4x10 @ 80kg\nIncline Dumbbell Press 3x12 @ 26kg\nOverhead Tricep Extension 3x12\n\nDay 2 - Back & Biceps (Pull)\nDeadlift 4x8 @ 120kg\nLat Pulldown 4x10 @ 65kg\nBicep Barbell Curl 4x10 @ 30kg\n\nDay 3 - Legs & Core\nBarbell Squats 4x10 @ 100kg\nRomanian Deadlift 4x10\nStanding Calf Raises 4x15`
                      : `Day 1 - Push (Chest & Shoulders)\nBarbell Bench Press 4x10 @ 80kg\nIncline Dumbbell Press 3x12 @ 26kg\nDumbbell Lateral Raises 4x15\n\nDay 2 - Pull (Back & Biceps)\nConventional Deadlift 4x8 @ 120kg\nWide Grip Lat Pulldown 4x10 @ 65kg\nIncline Bicep Curls 4x12\n\nDay 3 - Legs & Abs\nBarbell Squats 4x10 @ 100kg\nRomanian Deadlift 4x10\nHanging Leg Raises 3x15`
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              {extractionNotice && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{extractionNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtractorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleExtractSheet}
                  disabled={isExtracting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isExtracting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-950" />
                  )}
                  <span>
                    {isExtracting
                      ? isAr
                        ? 'جاري استخراج التمارين...'
                        : 'Extracting Exercises...'
                      : isAr
                      ? 'استخراج التمارين وبدء الخطة'
                      : 'Extract Exercises & Apply Plan'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
