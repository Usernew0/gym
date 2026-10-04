# Gym workout — Smart Workout & Sheet Tracker

Gym workout is a full-stack, responsive workout tracking and progression platform designed for gym athletes, coaches, and fitness enthusiasts. It enables users to upload or update workout sheets, automatically extracts exercises, sets, and reps using smart text processing, tracks multi-week progressive overload, provides a comprehensive history of sheets and past workouts, and includes a dedicated food and nutrition module.

---

## 🌟 Key Functional Modules

### 1. Workout Sheet Extractor & Value Input Engine (`WorkoutSheetView.tsx`)
- **Automated Sheet Extraction (`sheetExtractor.ts`)**:
  - Paste any raw workout routine text (e.g. from WhatsApp, Notes, coach emails, or Excel).
  - Automatically identifies exercise names, target sets (e.g. `4 sets`, `3x10`), target reps, default rest periods, and muscle categories (Chest, Back, Legs, Shoulders, Arms, Core, Cardio).
  - Smart fallback to Full Body preset routines if the text is empty or freeform.
- **Multi-Week Duration & Overload Schedule**:
  - Configure how many weeks the workout sheet repeats (e.g. 4, 6, 8, 12, or 16 weeks).
  - Quick week switcher (`Week 1`, `Week 2`, ..., `Week N`) to plan progressive weight and rep increments.
  - Interactive progression percentage indicator showing completion across the full cycle.
- **Live Exercise Value Input**:
  - Itemized cards for each exercise in the routine.
  - Interactive set loggers where users enter exact lifted weights (`kg`) and completed repetitions.
  - 1-click completion checkmarks (`✓`) to mark sets as finished.
  - Real-time session metrics: Live Total Volume Lifted (`kg`), Completed Sets count, and Rest Timer.
- **Rest Interval Timer**:
  - Built-in rest timer (30s, 60s, 90s, 120s) with live countdown and audio/visual completion alerts.

---

### 2. History of the Sheets (`WorkoutHistoryView.tsx`)
- **Historical Sheet Directory**:
  - View all active and completed workout programs created by the user.
  - Displays total weeks planned, current week progress, split type, and total exercises count.
  - Instant "Set as Active Sheet" switcher to toggle between routines.
- **Progression Analytics**:
  - Aggregated metrics: Total Sessions Completed, Total Tonnage/Volume Lifted (`kg`), Heavy Lift Records, and Active Streaks.
  - Volume trend visualization across past training weeks.
- **Detailed Session Logs Timeline**:
  - Chronological timeline of all logged workouts with date stamps, day names, and volume summaries.
  - Accordion detail expansion to inspect every exercise, set, rep, and weight lifted in that session.
  - PDF & Print export capability for coaching check-ins.

---

### 3. Food & Nutrition Module (`FoodNutritionView.tsx`)
- **Macro & Calorie Balance Tracker**:
  - Daily calorie target vs. consumed calories with animated progress gauge.
  - Macro breakdown: Protein (`g`), Carbohydrates (`g`), and Fats (`g`).
- **Meal Logger**:
  - Categorized meal logging: Breakfast, Lunch, Dinner, Pre-Workout, Post-Workout, and Snacks.
  - Calculates meal calories, protein, carbs, and fats automatically.
- **Hydration Tracker**:
  - Real-time water intake tracker with 250ml quick-log buttons and daily hydration goal.
- **TDEE & Macro Calculator**:
  - Built-in calculator for Maintenance, Muscle Gain (Bulking), or Fat Loss (Cutting) caloric targets.

---

### 4. Admin Panel & Enterprise Authentication (`AdminPanel.tsx`)
- **Robust User Management**:
  - Complete user directory with instant search, role filtering (`admin` vs `user`), and status management (`active` vs `suspended`).
  - Add new athletes/users, reset passwords, and assign coaching/admin privileges.
- **Two-Factor Authentication (2FA)**:
  - TOTP setup with QR code generator, secret keys, and offline backup codes.
  - Self-service and admin-enforced 2FA reset tools.
- **Session Security & Inactivity Safeguards**:
  - Configurable inactivity timeout with automatic logout.
  - Real-time session invalidation listener powered by Firebase Firestore.
- **System Health Diagnostics**:
  - Self-testing diagnostic suite verifying Supabase, Firestore, Session tokens, and database schema integrity.

---

## 🗄️ Database Architecture & Schema Synchronization

The application adheres strictly to the rule of dual synchronization between `/schema.sql` and `src/lib/supabase.ts` (`SUPABASE_REQUIRED_DDL_SQL`):

1. **`users` Table**: Stores user authentication credentials, roles, 2FA secrets, and profile information.
2. **`workout_sheets` Table**: Stores extracted workout routines, total weeks, split types, and JSONB exercises.
3. **`workout_logs` Table**: Stores recorded sessions, completed sets, reps, weight values, and total volume.
4. **`nutrition_logs` Table**: Stores daily nutrition targets, consumed calories, macros, and itemized meals.
5. **`site_settings` Table**: Stores branding, favicon data, and security timeout parameters.

---

## 🔐 Credentials & Cloud Integration

- **Firebase Firestore & Authentication**:
  - Project ID: `root-genius-12sm5`
  - Auth Domain: `root-genius-12sm5.firebaseapp.com`
  - Storage Bucket: `root-genius-12sm5.firebasestorage.app`
  - Database: Cloud Firestore database instance for persistent auth records, user credentials, workout sheets, daily logs, and nutrition records.
  - Setup Notice: If the Firestore database has not yet been initialized in Google Cloud, click "Create Database" in Firebase Console (`https://console.firebase.google.com/project/root-genius-12sm5/firestore`).
- **Supabase Cloud Relational Database**:
  - Endpoint URL: `https://poomtiapythnxhrhjtto.supabase.co`
  - Role: Anon Public & Service Role JWT with HMAC SHA256 authentication.
  - JWT Secret: Synchronized server-side token signature (`da77bdf9-0c63-4a11-8bc0-76b9890f27f8`).

### 👤 Default System Accounts
- **Administrator**:
  - Username: `admin` (or `educationsessions@gmail.com`)
  - Password: `admin123`
  - Privileges: Full Administrative control, athlete & coach roster, database diagnostic tools
- **Standard User**:
  - Username: `trader`
  - Password: `user123`
  - Privileges: Personal workout sheet management, daily tracking, nutrition logs

---

## 🌐 Bilingual LTR & RTL Support
- Full support for English (`en`, LTR) and Arabic (`ar`, RTL) with native typography (`Cairo` and `Tajawal`).
- Responsive layouts tested for Mobile (`<640px`), Tablet (`640px-1024px`), and Desktop (`>1024px`).
