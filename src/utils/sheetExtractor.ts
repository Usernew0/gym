import { WorkoutExercise, WorkoutSheet, MuscleGroup } from '../types';

/**
 * Intelligent Muscle Group Classifier based on exercise keywords
 */
export function classifyMuscleGroup(exerciseName: string): MuscleGroup {
  const name = exerciseName.toLowerCase();

  // Chest
  if (
    name.includes('bench') ||
    name.includes('chest') ||
    name.includes('fly') ||
    name.includes('incline') ||
    name.includes('decline') ||
    name.includes('push up') ||
    name.includes('pushup') ||
    name.includes('dip') ||
    name.includes('pec')
  ) {
    return 'Chest';
  }

  // Back
  if (
    name.includes('deadlift') ||
    name.includes('row') ||
    name.includes('pull') ||
    name.includes('lat') ||
    name.includes('chin') ||
    name.includes('back') ||
    name.includes('shrug') ||
    name.includes('hyperextension')
  ) {
    return 'Back';
  }

  // Legs
  if (
    name.includes('squat') ||
    name.includes('leg') ||
    name.includes('lunge') ||
    name.includes('calf') ||
    name.includes('hamstring') ||
    name.includes('quad') ||
    name.includes('press') && name.includes('leg') ||
    name.includes('hack') ||
    name.includes('thrust') ||
    name.includes('rdl')
  ) {
    return 'Legs';
  }

  // Shoulders
  if (
    name.includes('shoulder') ||
    name.includes('overhead') ||
    name.includes('ohp') ||
    name.includes('military') ||
    name.includes('lateral') ||
    name.includes('delt') ||
    name.includes('front raise') ||
    name.includes('rear delt') ||
    name.includes('arnold')
  ) {
    return 'Shoulders';
  }

  // Arms
  if (
    name.includes('curl') ||
    name.includes('bicep') ||
    name.includes('tricep') ||
    name.includes('pushdown') ||
    name.includes('skull') ||
    name.includes('hammer') ||
    name.includes('preacher') ||
    name.includes('extension') && (name.includes('tricep') || name.includes('overhead'))
  ) {
    return 'Arms';
  }

  // Core
  if (
    name.includes('ab') ||
    name.includes('crunch') ||
    name.includes('plank') ||
    name.includes('core') ||
    name.includes('leg raise') ||
    name.includes('twist') ||
    name.includes('sit up')
  ) {
    return 'Core';
  }

  // Cardio
  if (
    name.includes('treadmill') ||
    name.includes('run') ||
    name.includes('bike') ||
    name.includes('cycle') ||
    name.includes('rowing') ||
    name.includes('stair') ||
    name.includes('elliptical')
  ) {
    return 'Cardio';
  }

  return 'Full Body';
}

/**
 * Heuristic Extractor: Parses pasted text, spreadsheets, or notes
 * Handles patterns such as:
 * - "Day 1: Chest & Triceps"
 * - "Barbell Bench Press 4x10 @ 80kg"
 * - "Incline DB Press - 3 sets x 12 reps"
 * - "Squats: 5x5, 2 min rest"
 * - Tabular / CSV rows: "Exercise\tSets\tReps\tWeight"
 */
export function extractExercisesFromText(rawText: string): {
  sheetName: string;
  totalWeeks: number;
  daysPerWeek: number;
  exercises: WorkoutExercise[];
} {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const exercises: WorkoutExercise[] = [];

  let currentDayName = 'Day 1 - Full Body';
  let currentDayIndex = 1;
  let detectedWeeks = 4;
  let inferredSheetName = 'Custom Gym Workout Plan';

  // Check for week declaration in the header lines e.g. "8 Weeks Hypertrophy Program" or "Duration: 6 weeks"
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    const weekMatch = l.match(/(\d+)\s*(?:-|–)?\s*(?:week|wk)s?/i) || l.match(/duration[:\s]*(\d+)\s*weeks?/i);
    if (weekMatch && weekMatch[1]) {
      const w = parseInt(weekMatch[1], 10);
      if (w >= 1 && w <= 52) {
        detectedWeeks = w;
      }
    }

    if (
      i === 0 &&
      !l.match(/^(?:day|exercise|push|pull|legs|\d+x\d+)/i) &&
      l.length < 60
    ) {
      inferredSheetName = l.replace(/^[#*_\s]+|[#*_\s]+$/g, '');
    }
  }

  const seenDays = new Set<string>();

  for (const line of lines) {
    // Skip table header lines like "Exercise, Sets, Reps, Weight"
    if (
      line.toLowerCase().includes('exercise') &&
      (line.toLowerCase().includes('set') || line.toLowerCase().includes('rep'))
    ) {
      continue;
    }

    // Check if line indicates a Day header
    // e.g. "Day 1 - Chest & Triceps", "Day 2:", "Push Day (Chest, Shoulders, Triceps)", "Legs Day"
    const dayHeaderRegex = /^(?:#+\s*)?(?:day\s*(\d+)[:\s-]*|week\s*\d+\s*day\s*(\d+)[:\s-]*|(push|pull|legs|upper|lower|full\s*body|arms|chest|back|shoulders)\s*(?:day|workout|split)?[:\s-]*)(.*)$/i;
    const isDayHeader =
      line.match(/^(?:day\s*\d+|push|pull|legs|upper|lower|full\s*body)/i) ||
      (line.toLowerCase().includes('day ') && line.length < 45);

    if (isDayHeader) {
      let cleanDay = line.replace(/^[#*_\s]+|[#*_\s]+$/g, '');
      if (!cleanDay.toLowerCase().startsWith('day') && !cleanDay.toLowerCase().includes('day')) {
        cleanDay = `Day ${currentDayIndex} - ${cleanDay}`;
      }
      currentDayName = cleanDay;
      if (!seenDays.has(currentDayName)) {
        seenDays.add(currentDayName);
        currentDayIndex = seenDays.size;
      }
      continue;
    }

    // Parse Exercise line
    // Look for set/rep patterns:
    // 1. "4x10", "4 x 10", "4 x 8-12", "4 sets x 10 reps", "3 sets of 12"
    // 2. "@ 80kg", "80 kg", "150 lbs"
    // 3. Tab-separated: "Bench Press \t 4 \t 10 \t 80"
    // 4. Comma-separated: "Bench Press, 4, 10, 80"

    let exerciseName = '';
    let sets = 3;
    let targetReps = '10';
    let targetWeight: number | undefined;
    let restSeconds = 90;
    let notes = '';

    // Check TSV / CSV delimiter first
    const parts = line.split(/[\t,;|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3 && !isNaN(parseInt(parts[1], 10))) {
      exerciseName = parts[0];
      sets = parseInt(parts[1], 10) || 3;
      targetReps = parts[2] || '10';
      if (parts[3]) {
        const wt = parseFloat(parts[3].replace(/[^\d.]/g, ''));
        if (!isNaN(wt)) targetWeight = wt;
      }
      if (parts[4]) notes = parts[4];
    } else {
      // Regex pattern matching on text line
      // Pattern: [Exercise Name] [Sets]x[Reps] ...
      const setRepMatch = line.match(/(\d+)\s*(?:x|sets?\s*(?:x|of)?)\s*(\d+(?:-\d+)?|\d+\+?)\s*(?:reps?)?/i);
      const weightMatch = line.match(/(?:@|weight[:\s]*)?(\d+(?:\.\d+)?)\s*(?:kg|lbs|kilos?)/i);
      const restMatch = line.match(/(\d+)\s*(?:sec|s|min|minutes?)\s*rest/i);

      if (setRepMatch) {
        sets = parseInt(setRepMatch[1], 10) || 3;
        targetReps = setRepMatch[2] || '10';

        // Exercise name is whatever precedes the sets x reps match
        const splitIdx = line.indexOf(setRepMatch[0]);
        if (splitIdx > 1) {
          exerciseName = line.substring(0, splitIdx).trim();
        } else {
          // If sets x reps is at the beginning e.g. "4x10 Bench Press"
          exerciseName = line.replace(setRepMatch[0], '').trim();
        }
      } else {
        // Fallback: If line doesn't have explicit "4x10", check if it looks like an exercise
        if (line.length >= 3 && line.length <= 60 && !line.includes('http') && !line.startsWith('//')) {
          exerciseName = line;
          sets = 3;
          targetReps = '10-12';
        }
      }

      if (weightMatch && weightMatch[1]) {
        const wt = parseFloat(weightMatch[1]);
        if (!isNaN(wt)) targetWeight = wt;
      }

      if (restMatch && restMatch[1]) {
        const val = parseInt(restMatch[1], 10);
        if (restMatch[0].includes('min')) {
          restSeconds = val * 60;
        } else {
          restSeconds = val;
        }
      }
    }

    // Clean up exercise name (remove bullet points, numbers, asterisks, trailing hyphens)
    exerciseName = exerciseName
      .replace(/^[\d.)\-*•\s]+/, '')
      .replace(/[\-–:@]+$/, '')
      .trim();

    if (exerciseName && exerciseName.length >= 2) {
      const category = classifyMuscleGroup(exerciseName);
      exercises.push({
        id: `EX-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dayName: currentDayName,
        dayIndex: currentDayIndex,
        name: exerciseName,
        category,
        sets: Math.min(Math.max(sets, 1), 20),
        targetReps: targetReps || '10',
        targetWeight,
        restSeconds,
        notes: notes || undefined,
      });
    }
  }

  // If no day groupings were detected, ensure default Day 1
  if (exercises.length > 0 && seenDays.size === 0) {
    seenDays.add('Day 1 - Full Body');
  }

  return {
    sheetName: inferredSheetName,
    totalWeeks: detectedWeeks,
    daysPerWeek: Math.max(seenDays.size, 1),
    exercises,
  };
}

/**
 * Standard Ready-to-Use Gym Workout Plan Templates
 */
export const PRESET_WORKOUT_PLANS: WorkoutSheet[] = [
  {
    id: 'PRESET-PPL-8WEEKS',
    userId: 'system',
    userName: 'Gym Pro System',
    name: 'Push / Pull / Legs Hypertrophy & Progressive Overload',
    description: 'A proven 8-week periodized split designed for maximum muscle growth and strength progression.',
    totalWeeks: 8,
    currentWeek: 1,
    daysPerWeek: 3,
    sheetSource: 'manual',
    status: 'active',
    createdAt: new Date().toISOString(),
    exercises: [
      // Day 1 - Push
      {
        id: 'ex-ppl-1',
        dayName: 'Day 1 - Push (Chest, Shoulders & Triceps)',
        dayIndex: 1,
        name: 'Barbell Flat Bench Press',
        category: 'Chest',
        sets: 4,
        targetReps: '8-10',
        targetWeight: 80,
        restSeconds: 120,
        notes: 'Control the eccentric tempo (2 sec down).',
      },
      {
        id: 'ex-ppl-2',
        dayName: 'Day 1 - Push (Chest, Shoulders & Triceps)',
        dayIndex: 1,
        name: 'Incline Dumbbell Press',
        category: 'Chest',
        sets: 3,
        targetReps: '10-12',
        targetWeight: 26,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-3',
        dayName: 'Day 1 - Push (Chest, Shoulders & Triceps)',
        dayIndex: 1,
        name: 'Standing Overhead Barbell Press (OHP)',
        category: 'Shoulders',
        sets: 4,
        targetReps: '8-10',
        targetWeight: 50,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-4',
        dayName: 'Day 1 - Push (Chest, Shoulders & Triceps)',
        dayIndex: 1,
        name: 'Dumbbell Lateral Raises',
        category: 'Shoulders',
        sets: 4,
        targetReps: '12-15',
        targetWeight: 12,
        restSeconds: 60,
      },
      {
        id: 'ex-ppl-5',
        dayName: 'Day 1 - Push (Chest, Shoulders & Triceps)',
        dayIndex: 1,
        name: 'Cable Tricep Pushdown (Rope)',
        category: 'Arms',
        sets: 4,
        targetReps: '12-15',
        targetWeight: 35,
        restSeconds: 60,
      },
      // Day 2 - Pull
      {
        id: 'ex-ppl-6',
        dayName: 'Day 2 - Pull (Back, Rear Delts & Biceps)',
        dayIndex: 2,
        name: 'Conventional Barbell Deadlift',
        category: 'Back',
        sets: 4,
        targetReps: '6-8',
        targetWeight: 120,
        restSeconds: 150,
        notes: 'Maintain neutral spine and reset each rep.',
      },
      {
        id: 'ex-ppl-7',
        dayName: 'Day 2 - Pull (Back, Rear Delts & Biceps)',
        dayIndex: 2,
        name: 'Wide Grip Lat Pulldown',
        category: 'Back',
        sets: 4,
        targetReps: '10-12',
        targetWeight: 65,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-8',
        dayName: 'Day 2 - Pull (Back, Rear Delts & Biceps)',
        dayIndex: 2,
        name: 'Seated Cable Row (V-Grip)',
        category: 'Back',
        sets: 3,
        targetReps: '10-12',
        targetWeight: 60,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-9',
        dayName: 'Day 2 - Pull (Back, Rear Delts & Biceps)',
        dayIndex: 2,
        name: 'Incline Dumbbell Bicep Curls',
        category: 'Arms',
        sets: 4,
        targetReps: '10-12',
        targetWeight: 14,
        restSeconds: 60,
      },
      {
        id: 'ex-ppl-10',
        dayName: 'Day 2 - Pull (Back, Rear Delts & Biceps)',
        dayIndex: 2,
        name: 'Face Pulls (Cable with Rope)',
        category: 'Shoulders',
        sets: 4,
        targetReps: '15-20',
        targetWeight: 25,
        restSeconds: 60,
      },
      // Day 3 - Legs
      {
        id: 'ex-ppl-11',
        dayName: 'Day 3 - Legs & Abs (Quads, Hamstrings & Core)',
        dayIndex: 3,
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: 4,
        targetReps: '8-10',
        targetWeight: 100,
        restSeconds: 120,
      },
      {
        id: 'ex-ppl-12',
        dayName: 'Day 3 - Legs & Abs (Quads, Hamstrings & Core)',
        dayIndex: 3,
        name: 'Romanian Deadlift (RDL)',
        category: 'Legs',
        sets: 4,
        targetReps: '10-12',
        targetWeight: 80,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-13',
        dayName: 'Day 3 - Legs & Abs (Quads, Hamstrings & Core)',
        dayIndex: 3,
        name: 'Seated Leg Press',
        category: 'Legs',
        sets: 3,
        targetReps: '12-15',
        targetWeight: 160,
        restSeconds: 90,
      },
      {
        id: 'ex-ppl-14',
        dayName: 'Day 3 - Legs & Abs (Quads, Hamstrings & Core)',
        dayIndex: 3,
        name: 'Standing Calf Raises',
        category: 'Legs',
        sets: 4,
        targetReps: '15-20',
        targetWeight: 50,
        restSeconds: 60,
      },
      {
        id: 'ex-ppl-15',
        dayName: 'Day 3 - Legs & Abs (Quads, Hamstrings & Core)',
        dayIndex: 3,
        name: 'Hanging Leg Raises',
        category: 'Core',
        sets: 3,
        targetReps: '12-15',
        restSeconds: 60,
      },
    ],
  },
  {
    id: 'PRESET-FULLBODY-6WEEKS',
    userId: 'system',
    userName: 'Gym Pro System',
    name: '3-Day Classic Full Body Strength & Conditioning',
    description: 'High-frequency 6-week program hitting every major muscle group 3 times per week for optimal stimulus.',
    totalWeeks: 6,
    currentWeek: 1,
    daysPerWeek: 3,
    sheetSource: 'manual',
    status: 'active',
    createdAt: new Date().toISOString(),
    exercises: [
      // Day 1
      {
        id: 'ex-fb-1',
        dayName: 'Day 1 - Full Body Focus A',
        dayIndex: 1,
        name: 'Barbell Back Squat',
        category: 'Legs',
        sets: 3,
        targetReps: '8',
        targetWeight: 90,
        restSeconds: 120,
      },
      {
        id: 'ex-fb-2',
        dayName: 'Day 1 - Full Body Focus A',
        dayIndex: 1,
        name: 'Barbell Bench Press',
        category: 'Chest',
        sets: 3,
        targetReps: '8',
        targetWeight: 75,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-3',
        dayName: 'Day 1 - Full Body Focus A',
        dayIndex: 1,
        name: 'Bent-Over Barbell Row',
        category: 'Back',
        sets: 3,
        targetReps: '10',
        targetWeight: 65,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-4',
        dayName: 'Day 1 - Full Body Focus A',
        dayIndex: 1,
        name: 'Overhead Dumbbell Tricep Extension',
        category: 'Arms',
        sets: 3,
        targetReps: '12',
        targetWeight: 22,
        restSeconds: 60,
      },
      // Day 2
      {
        id: 'ex-fb-5',
        dayName: 'Day 2 - Full Body Focus B',
        dayIndex: 2,
        name: 'Conventional Barbell Deadlift',
        category: 'Back',
        sets: 3,
        targetReps: '6',
        targetWeight: 110,
        restSeconds: 120,
      },
      {
        id: 'ex-fb-6',
        dayName: 'Day 2 - Full Body Focus B',
        dayIndex: 2,
        name: 'Military Overhead Press (OHP)',
        category: 'Shoulders',
        sets: 3,
        targetReps: '8',
        targetWeight: 45,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-7',
        dayName: 'Day 2 - Full Body Focus B',
        dayIndex: 2,
        name: 'Pull-Ups / Lat Pulldown',
        category: 'Back',
        sets: 3,
        targetReps: '10',
        restSeconds: 90,
      },
      {
        id: 'ex-fb-8',
        dayName: 'Day 2 - Full Body Focus B',
        dayIndex: 2,
        name: 'Standing Barbell Bicep Curl',
        category: 'Arms',
        sets: 3,
        targetReps: '10',
        targetWeight: 30,
        restSeconds: 60,
      },
      // Day 3
      {
        id: 'ex-fb-9',
        dayName: 'Day 3 - Full Body Focus C',
        dayIndex: 3,
        name: 'Bulgarian Split Squats',
        category: 'Legs',
        sets: 3,
        targetReps: '10 per leg',
        targetWeight: 16,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-10',
        dayName: 'Day 3 - Full Body Focus C',
        dayIndex: 3,
        name: 'Incline Dumbbell Bench Press',
        category: 'Chest',
        sets: 3,
        targetReps: '10',
        targetWeight: 24,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-11',
        dayName: 'Day 3 - Full Body Focus C',
        dayIndex: 3,
        name: 'Cable Seated Row',
        category: 'Back',
        sets: 3,
        targetReps: '12',
        targetWeight: 55,
        restSeconds: 90,
      },
      {
        id: 'ex-fb-12',
        dayName: 'Day 3 - Full Body Focus C',
        dayIndex: 3,
        name: 'Plank Holds & Cable Crunches',
        category: 'Core',
        sets: 3,
        targetReps: '60s / 15 reps',
        restSeconds: 60,
      },
    ],
  },
];
