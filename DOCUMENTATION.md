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

## ⚠️ MANDATORY SQL SCHEMA AUTO-UPDATE POLICY

> **MANDATORY CODING STANDARD & AUTO-UPDATE PROTOCOL:**
> 1. Any code modification, feature addition, column addition, or data entity update anywhere in the project **MUST AUTOMATICALLY UPDATE BOTH `/schema.sql` (at workspace root) AND `SUPABASE_REQUIRED_DDL_SQL` (in `src/lib/supabase.ts`)**.
> 2. Both files must remain **100% synchronized** at all times.
> 3. Every schema change must include backwards-compatible `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration commands.
> 4. Default seed accounts (`admin`, `educationsessions@gmail.com`, and `trader`) must be maintained using `INSERT ... ON CONFLICT (id) DO UPDATE` to prevent data overwrites.

---

## 🗄️ SQL Schema Definitions (`/schema.sql` & `src/lib/supabase.ts`)

```sql
-- 1. Users Table (Stores user accounts, roles, and 2FA credentials)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  password TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_backup_codes JSONB,
  two_factor_confirmed_at TIMESTAMPTZ,
  profile_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workout Sheets Table (Stores workout programs, extracted routines, week repetition schedules)
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
  sheet_data JSONB, -- Complete WorkoutSheet object backup for zero data loss
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workout Logs Table (Stores daily workout sessions, weights, sets, reps, and volume progression)
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
  log_data JSONB, -- Complete WorkoutLog object backup
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Nutrition Logs Table (Stores daily nutrition targets, meals, calories, macros, and hydration)
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
  nutrition_data JSONB, -- Complete NutritionLog object backup
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Calculations Table (Stores landed cost calculations, quotes, and pricing breakdowns)
CREATE TABLE IF NOT EXISTS public.calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  target_currency TEXT,
  total_landed_cost NUMERIC,
  total_revenue NUMERIC,
  net_profit NUMERIC,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  calculation_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Gallery Images Table (Stores media assets and invoice captures)
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id TEXT PRIMARY KEY,
  calculation_id TEXT REFERENCES public.calculations(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT,
  sku TEXT,
  category TEXT DEFAULT 'General',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'image/jpeg',
  trade_direction TEXT DEFAULT 'import',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Site Settings Table (Stores global branding, favicon, and site config)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY,
  favicon_url TEXT,
  settings_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Flight Consignments Table (Air cargo manifests, waybills, and flights)
CREATE TABLE IF NOT EXISTS public.flight_consignments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  flight_number TEXT,
  flight_name TEXT,
  airline TEXT,
  flight_date TEXT,
  origin_airport TEXT,
  destination_airport TEXT,
  awb_number TEXT,
  document_pdf_url TEXT,
  status TEXT DEFAULT 'scheduled',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  flight_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Row Level Security (RLS) & Performance Indexes
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_consignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read write users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write workout_sheets" ON public.workout_sheets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write workout_logs" ON public.workout_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write nutrition_logs" ON public.nutrition_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write calculations" ON public.calculations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write gallery_images" ON public.gallery_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read write flight_consignments" ON public.flight_consignments FOR ALL USING (true) WITH CHECK (true);

-- 10. Safe Migrations
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.workout_sheets ADD COLUMN IF NOT EXISTS sheet_data JSONB;
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS log_data JSONB;
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS nutrition_data JSONB;
```

---

## 🔐 Credentials & Cloud Integration

### Firebase Web SDK & Database Configuration
```json
{
  "projectId": "root-genius-12sm5",
  "appId": "1:496486223288:web:0eefd63453bf1c489b534d",
  "apiKey": "AIzaSyD0Pe0BSOi8bknKHNXJviW2JB1THFXA80E",
  "authDomain": "root-genius-12sm5.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-tempadminpanel-d2cdb614-8ac0-4155-a7d9-868c027f7ff1",
  "storageBucket": "root-genius-12sm5.firebasestorage.app",
  "messagingSenderId": "496486223288",
  "oAuthClientId": "496486223288-1l4qt508aeldokcq5ap38fqgi1fo26sv.apps.googleusercontent.com"
}
```

- **Database Status**: Cloud Firestore database provisioned and connected (`ai-studio-tempadminpanel-d2cdb614-8ac0-4155-a7d9-868c027f7ff1`).
- **Security Rules**: Deployed and enforced with zero-trust collections protection for `users`, `workout_sheets`, `workout_logs`, `nutrition_logs`, and `site_settings`.

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

### User Accounts & Production Security
- **No Pre-Configured Credentials**: Hardcoded default credentials have been completely removed for production security.
- **Account Creation**: Users and administrators register directly through the secure Registration portal (`/api/auth/register`) or are onboarded via the Admin Panel user roster.
- **Initial Setup**: The first registered administrator sets their own private, custom credentials with zero hardcoded default fallbacks.

---

## 📱 Mobile & Responsive Testing
- **Viewport Fluidity**: Dynamic breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`).
- **Touch Ergonomics**: All interactive elements (set completion buttons, rest timer triggers, week selectors) have a minimum touch footprint of 44px.
- **RTL Mirroring**: Full mirroring support for Arabic layout with directional flexbox and margin logic.
