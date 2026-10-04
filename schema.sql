-- ==============================================================================
-- Gym Workout Application Database Schema (PostgreSQL / Supabase DDL)
-- Auto-Updated: Syncs with SUPABASE_REQUIRED_DDL_SQL in src/lib/supabase.ts
-- Architecture: Supabase powers Calculations, Gallery Images, Invoices & Relational Analytics
--               Firestore powers User Authentication, Security Credentials & Real-Time Session Invalidation
-- ==============================================================================

-- 1. Create users table (Stores user account metadata & backup cache)
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
  profile_data JSONB, -- Stores full UserProfile object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create calculations table (Stores all landed cost calculations, quotes, and pricing breakdowns)
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
  calculation_data JSONB, -- Stores complete calculation, product image (invoiceImage), SKU, and freight specs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create gallery_images table (Stores product photos, invoice captures, and cargo media assets linked to calculations)
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id TEXT PRIMARY KEY,
  calculation_id TEXT REFERENCES public.calculations(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT,
  sku TEXT,
  category TEXT DEFAULT 'General',
  image_url TEXT NOT NULL, -- High-res Base64 / Data-URI or Storage URL (extracted from invoiceImage)
  thumbnail_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'image/jpeg',
  trade_direction TEXT DEFAULT 'import',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create site_settings table (Stores global branding, favicon, and site config)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY,
  favicon_url TEXT,
  settings_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create flight_consignments table (Stores grouped flight batches, air waybills, routes, and cargo manifests)
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
  flight_data JSONB, -- Stores full FlightConsignment metadata, weights, and items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Optimization Indexes (Enables instant searching by Product SKU, Title, Trade Direction & Cargo Media)
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON public.users (is_deleted);
CREATE INDEX IF NOT EXISTS idx_calculations_is_deleted ON public.calculations (is_deleted);
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON public.calculations (user_id);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON public.calculations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculations_product_sku ON public.calculations ((calculation_data->'input'->>'skuSupplier'));
CREATE INDEX IF NOT EXISTS idx_calculations_trade_direction ON public.calculations ((calculation_data->'input'->>'tradeDirection'));
CREATE INDEX IF NOT EXISTS idx_calculations_has_image ON public.calculations (((calculation_data->'input'->>'invoiceImage') IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_gallery_images_user_id ON public.gallery_images (user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_calculation_id ON public.gallery_images (calculation_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sku ON public.gallery_images (sku);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at ON public.gallery_images (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flight_consignments_is_deleted ON public.flight_consignments (is_deleted);
CREATE INDEX IF NOT EXISTS idx_flight_consignments_user_id ON public.flight_consignments (user_id);
CREATE INDEX IF NOT EXISTS idx_flight_consignments_flight_date ON public.flight_consignments (flight_date DESC);
CREATE INDEX IF NOT EXISTS idx_flight_consignments_flight_num ON public.flight_consignments (flight_number);

-- 7. Trigger Function: Automatically extracts and synchronizes gallery_images from calculations.invoiceImage
CREATE OR REPLACE FUNCTION public.sync_calculation_invoice_image()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_img TEXT;
  v_title TEXT;
  v_sku TEXT;
  v_category TEXT;
  v_direction TEXT;
BEGIN
  -- Extract fields safely from calculation_data JSONB
  v_invoice_img := NEW.calculation_data->'input'->>'invoiceImage';
  v_title := COALESCE(NEW.calculation_data->'input'->>'title', NEW.title, 'Product Cargo Image');
  v_sku := COALESCE(NEW.calculation_data->'input'->>'skuSupplier', '');
  v_category := COALESCE(NEW.calculation_data->'input'->>'category', 'General');
  v_direction := COALESCE(NEW.calculation_data->'input'->>'tradeDirection', 'import');

  IF v_invoice_img IS NOT NULL AND length(trim(v_invoice_img)) > 0 THEN
    INSERT INTO public.gallery_images (
      id,
      calculation_id,
      user_id,
      title,
      sku,
      category,
      image_url,
      trade_direction,
      created_at
    ) VALUES (
      'IMG-' || NEW.id,
      NEW.id,
      NEW.user_id,
      v_title,
      v_sku,
      v_category,
      v_invoice_img,
      v_direction,
      COALESCE(NEW.created_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      title = EXCLUDED.title,
      sku = EXCLUDED.sku,
      category = EXCLUDED.category,
      image_url = EXCLUDED.image_url,
      trade_direction = EXCLUDED.trade_direction,
      created_at = EXCLUDED.created_at;
  ELSE
    -- If invoiceImage was removed on update, remove record from gallery_images
    DELETE FROM public.gallery_images WHERE calculation_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_calculation_invoice_image ON public.calculations;
CREATE TRIGGER trg_sync_calculation_invoice_image
  AFTER INSERT OR UPDATE ON public.calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_calculation_invoice_image();

-- 7. Relational View: Direct dynamic projection of calculation invoice images
CREATE OR REPLACE VIEW public.v_calculation_gallery_images AS
SELECT 
  'IMG-' || id AS id,
  id AS calculation_id,
  user_id,
  COALESCE(calculation_data->'input'->>'title', title, 'Product Cargo Image') AS title,
  COALESCE(calculation_data->'input'->>'skuSupplier', '') AS sku,
  COALESCE(calculation_data->'input'->>'category', 'General') AS category,
  calculation_data->'input'->>'invoiceImage' AS image_url,
  COALESCE(calculation_data->'input'->>'tradeDirection', 'import') AS trade_direction,
  total_landed_cost,
  total_revenue,
  net_profit,
  target_currency,
  created_at
FROM public.calculations
WHERE calculation_data->'input'->>'invoiceImage' IS NOT NULL 
  AND length(trim(calculation_data->'input'->>'invoiceImage')) > 0;

-- 8. Enable Row Level Security (RLS) and permissive policies for public client app
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_consignments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 9. Gym Workout Tracking & Progression Tables (Workout Sheets, Logs, Nutrition)
-- ==============================================================================

-- Create workout_sheets table (Stores workout programs, extracted routines, week repetition schedules)
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
  exercises JSONB, -- Stores WorkoutExercise[] array
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workout_logs table (Stores daily workout sessions, weights, sets, reps, and volume progression)
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
  exercises JSONB, -- Stores LoggedExercise[] with sets, reps, weight_kg, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create nutrition_logs table (Stores daily nutrition targets, meals, calories, macros, and hydration)
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
  meals JSONB, -- Stores NutritionMeal[] array
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Gym Workout performance
CREATE INDEX IF NOT EXISTS idx_workout_sheets_user_id ON public.workout_sheets (user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_sheet_id ON public.workout_logs (sheet_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_created_at ON public.workout_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id ON public.nutrition_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON public.nutrition_logs (date);

ALTER TABLE public.workout_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read write workout_sheets" ON public.workout_sheets;
CREATE POLICY "Allow anon read write workout_sheets" ON public.workout_sheets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write workout_logs" ON public.workout_logs;
CREATE POLICY "Allow anon read write workout_logs" ON public.workout_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write nutrition_logs" ON public.nutrition_logs;
CREATE POLICY "Allow anon read write nutrition_logs" ON public.nutrition_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write users" ON public.users;
CREATE POLICY "Allow anon read write users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write calculations" ON public.calculations;
CREATE POLICY "Allow anon read write calculations" ON public.calculations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write gallery_images" ON public.gallery_images;
CREATE POLICY "Allow anon read write gallery_images" ON public.gallery_images FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write site_settings" ON public.site_settings;
CREATE POLICY "Allow anon read write site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read write flight_consignments" ON public.flight_consignments;
CREATE POLICY "Allow anon read write flight_consignments" ON public.flight_consignments FOR ALL USING (true) WITH CHECK (true);

-- 9. Add columns if not exists (Migrations safe for existing tables)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_confirmed_at TIMESTAMPTZ;

-- 10. Seed Default Admin Accounts
INSERT INTO public.users (
  id,
  user_id,
  username,
  full_name,
  email,
  phone,
  company_name,
  role,
  status,
  password,
  created_at
) VALUES 
  (
    'admin',
    'USR-ADMIN-001',
    'admin',
    'System Administrator',
    'admin@globaltrade.com',
    '+201001234567',
    'Gym Workout Operations',
    'admin',
    'active',
    'admin123',
    NOW()
  ),
  (
    'educationsessions@gmail.com',
    'USR-ADMIN-002',
    'educationsessions@gmail.com',
    'Education Admin',
    'educationsessions@gmail.com',
    '+201001234567',
    'Gym Workout Operations',
    'admin',
    'active',
    'admin123',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  password = EXCLUDED.password;

