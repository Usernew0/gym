# Gym workout — Technical Specification & Architecture

> **Application Name**: Gym workout  
> **Status**: Production Ready & Fully Responsive  
> **Bilingual**: English (LTR) & Arabic (RTL)

---

## 🏗️ Architectural Overview

Gym workout operates on a resilient multi-tier architecture:
- **Client Layer**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
- **Authentication & Security**: Firebase Authentication + Cloud Firestore session tokens + TOTP 2FA + Inactivity Watchdog.
- **Relational Data & Progression**: Supabase (PostgreSQL) with synchronized schema definitions for workout sheets, logged workouts, and nutrition.
- **Offline & Local Isolation**: Isolated browser `localStorage` keyed per user (`gym_sheets_${userId}`, `gym_logs_${userId}`) ensuring instantaneous client responsiveness.

---

## 📋 Data Models & TypeScript Interfaces (`src/types.ts`)

```typescript
export interface WorkoutExercise {
  id: string;
  name: string;
  category: MuscleGroup;
  sets: number;
  targetReps: string;
  targetWeight?: number;
  restSeconds?: number;
  dayName?: string;
  dayIndex?: number;
  notes?: string;
}

export interface WorkoutSheet {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  totalWeeks: number;
  currentWeek: number;
  splitType: 'Push Pull Legs' | 'Upper Lower' | 'Full Body' | 'Bro Split' | 'Custom';
  daysCount: number;
  rawSheetText?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WorkoutLog {
  id: string;
  sheetId: string;
  sheetName: string;
  userId: string;
  dayName: string;
  weekNumber: number;
  date: string;
  totalVolumeKg: number;
  maxWeightKg: number;
  exercises: LoggedExercise[];
  notes?: string;
  createdAt: string;
}

export interface NutritionLog {
  id: string;
  userId: string;
  date: string;
  targetCalories: number;
  consumedCalories: number;
  proteinGrams: number;
  targetProteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
  meals: NutritionMeal[];
  notes?: string;
}
```

---

## 🔍 Sheet Extraction Algorithm (`src/utils/sheetExtractor.ts`)

1. **Text Normalization**: Splits raw text into lines, trimming whitespace and filtering out headers or decorative characters.
2. **Day / Split Detection**: Identifies markers such as `Day 1`, `Day 2`, `Push Day`, `Pull Day`, `Leg Day`, `Upper`, `Lower`.
3. **Regex Exercise & Reps Parsing**:
   - Matches standard expressions like `3x10`, `4 x 12`, `3 sets of 8-10 reps`, `5x5 @ 80kg`.
   - Extracts numeric sets and target repetition ranges.
4. **Muscle Group Classification**:
   - Classifies exercises into `Chest`, `Back`, `Legs`, `Shoulders`, `Arms`, `Core`, or `Cardio` using domain keywords.
5. **Fallback Pre-built Splits**:
   - Provides defaults: Push/Pull/Legs (PPL), Upper/Lower 4-Day Hypertrophy, and 3-Day Full Body strength routines.

---

## 🗄️ SQL Schema Definitions (`/schema.sql` & `src/lib/supabase.ts`)

```sql
-- Workout Sheets
CREATE TABLE IF NOT EXISTS public.workout_sheets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  total_weeks INTEGER DEFAULT 8,
  current_week INTEGER DEFAULT 1,
  split_type TEXT DEFAULT 'Push Pull Legs',
  days_count INTEGER DEFAULT 3,
  raw_sheet_text TEXT,
  exercises JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id TEXT PRIMARY KEY,
  sheet_id TEXT REFERENCES public.workout_sheets(id) ON DELETE SET NULL,
  sheet_name TEXT,
  user_id TEXT,
  day_name TEXT NOT NULL,
  week_number INTEGER DEFAULT 1,
  date TEXT,
  total_volume_kg NUMERIC DEFAULT 0,
  max_weight_kg NUMERIC DEFAULT 0,
  notes TEXT,
  exercises JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Logs
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  target_calories INTEGER DEFAULT 2400,
  consumed_calories INTEGER DEFAULT 0,
  protein_grams NUMERIC DEFAULT 0,
  target_protein_grams NUMERIC DEFAULT 160,
  carbs_grams NUMERIC DEFAULT 0,
  fats_grams NUMERIC DEFAULT 0,
  water_ml INTEGER DEFAULT 0,
  meals JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Credentials & Cloud Integration

### Firebase Web SDK Configuration
```json
{
  "apiKey": "AIzaSyD0Pe0BSOi8bknKHNXJviW2JB1THFXA80E",
  "authDomain": "root-genius-12sm5.firebaseapp.com",
  "projectId": "root-genius-12sm5",
  "storageBucket": "root-genius-12sm5.firebasestorage.app",
  "messagingSenderId": "496486223288",
  "appId": "1:496486223288:web:0eefd63453bf1c489b534d"
}
```

### 🔄 Multi-Cloud Sync Architecture
1. **Firestore Collections**:
   - `users`: User authentication, session watchdog, 2FA tokens, admin roles.
   - `workout_sheets`: Uploaded and extracted workout programs, multi-week progression schedules.
   - `workout_logs`: Real-time session logs with weight, rep counts, and volume tonnage.
   - `nutrition_logs`: Daily macro balance, calories, and hydration logs.
   - `site_settings`: Inactivity timeout and branding.
2. **Supabase Tables**:
   - Synchronized mirror of `users`, `workout_sheets`, `workout_logs`, `nutrition_logs`, `calculations`, and `gallery_images`.
3. **Offline-First Resilience**:
   - Instant local storage updates (0ms interaction latency) paired with asynchronous background cloud sync to Firestore & Supabase.
   - Database auto-check diagnostic tool in Admin Panel verifies live database connectivity. If the Firestore database has not yet been initialized in Google Cloud Console, a direct 1-click link is presented (`https://console.firebase.google.com/project/root-genius-12sm5/firestore`).

### Supabase Relational Database Configuration
- **Supabase URL**: `https://poomtiapythnxhrhjtto.supabase.co`
- **Anon Public API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb210aWFweXRobnhocmhqdHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDI5MTYsImV4cCI6MjEwNDQxODkxNn0.Lt1xVWRp1Nj73C-kD8opiY-ucf9hoZUniQOVvf4sKJQ`
- **JWT Secret**: `da77bdf9-0c63-4a11-8bc0-76b9890f27f8`

### Default Admin & User Accounts
- **Primary Admin**:
  - Username: `admin` (or `educationsessions@gmail.com`)
  - Password: `admin123`
  - Role: `admin` (Full administrative privileges, user management, and system diagnostics)
- **Standard User**:
  - Username: `trader`
  - Password: `user123`
  - Role: `user`

---

## 📱 Mobile & Responsive Testing
- **Viewport Fluidity**: Dynamic breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`).
- **Touch Ergonomics**: All interactive elements (set completion buttons, rest timer triggers, week selectors) have a minimum touch footprint of 44px.
- **RTL Mirroring**: Full mirroring support for Arabic layout with directional flexbox and margin logic.
