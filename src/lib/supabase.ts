import { createClient } from '@supabase/supabase-js';
import { CalculationResult, UserProfile, FlightConsignment, WorkoutSheet, WorkoutLog, NutritionLog } from '../types';

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

const SUPABASE_URL =
  env.VITE_SUPABASE_URL || 'https://poomtiapythnxhrhjtto.supabase.co';
const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb210aWFweXRobnhocmhqdHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDI5MTYsImV4cCI6MjEwNDQxODkxNn0.Lt1xVWRp1Nj73C-kD8opiY-ucf9hoZUniQOVvf4sKJQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS_TABLE = 'users';
const CALCULATIONS_TABLE = 'calculations';
const GALLERY_TABLE = 'gallery_images';
const SETTINGS_TABLE = 'site_settings';
const FLIGHTS_TABLE = 'flight_consignments';
const WORKOUT_SHEETS_TABLE = 'workout_sheets';
const WORKOUT_LOGS_TABLE = 'workout_logs';
const NUTRITION_LOGS_TABLE = 'nutrition_logs';

function handleSupabaseError(context: string, error: any) {
  if (!error) return;
  const msg = error.message || '';
  if (
    error.code === 'PGRST301' ||
    error.code === '42P01' ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('does not exist')
  ) {
    console.info(
      `[Supabase Setup Info] Table required for "${context}" is not created yet in Supabase. Open Admin Panel to view/copy the SQL DDL setup script.`
    );
  } else {
    console.warn(`Supabase ${context} warning:`, msg);
  }
}

/**
 * Save user profile to Supabase.
 * If oldUsername is provided and differs from the new username, purges the old user row.
 */
export async function saveUserProfileToSupabase(profile: UserProfile, oldUsername?: string): Promise<boolean> {
  try {
    const docKey = String(profile.username || profile.userId || 'user').toLowerCase().trim();

    // If username changed, delete the old user row from Supabase
    if (oldUsername && String(oldUsername).toLowerCase().trim() !== docKey) {
      try {
        await deleteUserFromSupabase(String(oldUsername).toLowerCase().trim());
      } catch (delErr) {
        console.warn('Supabase delete old user row notice:', delErr);
      }
    }

    // Lookup existing row to preserve 2FA credentials if not explicitly passed
    let existingRecord: any = null;
    if (profile.twoFactorSecret === undefined || profile.twoFactorEnabled === undefined) {
      try {
        const { data: existingData } = await supabase
          .from(USERS_TABLE)
          .select('*')
          .eq('id', docKey)
          .maybeSingle();
        if (existingData) {
          existingRecord = existingData;
        }
      } catch {}
    }

    const preservedTwoFactorEnabled = profile.twoFactorEnabled !== undefined
      ? Boolean(profile.twoFactorEnabled)
      : Boolean(existingRecord?.two_factor_enabled ?? (existingRecord?.profile_data as any)?.twoFactorEnabled ?? false);

    const preservedTwoFactorSecret = profile.twoFactorSecret !== undefined
      ? profile.twoFactorSecret
      : (existingRecord?.two_factor_secret || (existingRecord?.profile_data as any)?.twoFactorSecret || null);

    const preservedTwoFactorBackupCodes = Array.isArray(profile.twoFactorBackupCodes)
      ? profile.twoFactorBackupCodes
      : (Array.isArray(existingRecord?.two_factor_backup_codes)
          ? existingRecord.two_factor_backup_codes
          : ((existingRecord?.profile_data as any)?.twoFactorBackupCodes || []));

    const preservedTwoFactorConfirmedAt = profile.twoFactorConfirmedAt !== undefined
      ? profile.twoFactorConfirmedAt
      : (existingRecord?.two_factor_confirmed_at || (existingRecord?.profile_data as any)?.twoFactorConfirmedAt || null);

    const existingPassword = existingRecord?.password || (existingRecord?.profile_data as any)?.password || '';
    const resolvedPassword = (profile.password && String(profile.password).trim().length > 0)
      ? String(profile.password).trim()
      : existingPassword;

    const fullProfileData = {
      ...((existingRecord?.profile_data as any) || {}),
      ...profile,
      password: resolvedPassword,
      twoFactorEnabled: preservedTwoFactorEnabled,
      twoFactorSecret: preservedTwoFactorSecret,
      twoFactorBackupCodes: preservedTwoFactorBackupCodes,
      twoFactorConfirmedAt: preservedTwoFactorConfirmedAt,
    };

    const payload: any = {
      id: docKey,
      user_id: profile.userId || docKey,
      username: profile.username || docKey,
      full_name: profile.name || profile.username || '',
      email: profile.email || '',
      phone: profile.phone || '',
      company_name: profile.company || '',
      role: profile.role || 'user',
      status: profile.status || 'active',
      password: resolvedPassword,
      two_factor_enabled: preservedTwoFactorEnabled,
      two_factor_secret: preservedTwoFactorSecret,
      two_factor_backup_codes: preservedTwoFactorBackupCodes,
      two_factor_confirmed_at: preservedTwoFactorConfirmedAt,
      profile_data: fullProfileData,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(USERS_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError('save user profile', error);
      return false;
    }
    console.info('User profile saved to Supabase successfully:', docKey);
    return true;
  } catch (err) {
    handleSupabaseError('save user profile exception', err);
    return false;
  }
}

/**
 * Get user profile from Supabase by username or userId
 */
export async function getUserProfileFromSupabase(username: string): Promise<UserProfile | null> {
  try {
    const key = username.toLowerCase().trim();
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .or(`id.eq.${key},username.eq.${key},user_id.eq.${key}`)
      .maybeSingle();

    if (error) {
      handleSupabaseError('fetch user profile', error);
      return null;
    }

    if (data) {
      if (data.profile_data) {
        return {
          ...(data.profile_data as UserProfile),
          twoFactorEnabled: Boolean(data.two_factor_enabled ?? (data.profile_data as any)?.twoFactorEnabled ?? false),
          twoFactorSecret: (data.profile_data as any)?.twoFactorSecret || (data as any).two_factor_secret || undefined,
          twoFactorBackupCodes: (data.profile_data as any)?.twoFactorBackupCodes || (data as any).two_factor_backup_codes || [],
          twoFactorConfirmedAt: (data.profile_data as any)?.twoFactorConfirmedAt || (data as any).two_factor_confirmed_at || undefined,
        };
      }
      return {
        userId: data.user_id || data.id,
        username: data.username || data.id,
        name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company_name || '',
        role: data.role || 'user',
        status: data.status || 'active',
        password: data.password || '',
        twoFactorEnabled: Boolean(data.two_factor_enabled ?? false),
        twoFactorSecret: (data as any).two_factor_secret || undefined,
        twoFactorBackupCodes: (data as any).two_factor_backup_codes || [],
        twoFactorConfirmedAt: (data as any).two_factor_confirmed_at || undefined,
        createdAt: data.created_at || new Date().toISOString(),
        lastLoginAt: data.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    handleSupabaseError('fetch user profile exception', err);
  }
  return null;
}

/**
 * Fetch all users from Supabase
 */
export async function getAllUsersFromSupabase(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*');

    if (error) {
      handleSupabaseError('fetch all users', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((item) => {
        const pData = (item.profile_data as any) || {};
        return {
          userId: item.user_id || item.id || pData.userId,
          username: item.username || item.id || pData.username,
          name: item.full_name || pData.name || '',
          email: item.email || pData.email || '',
          phone: item.phone || pData.phone || '',
          company: item.company_name || pData.company || '',
          role: item.role || pData.role || 'user',
          status: item.status || pData.status || 'active',
          password: item.password || pData.password || '',
          twoFactorEnabled: Boolean(item.two_factor_enabled ?? pData.twoFactorEnabled ?? false),
          twoFactorSecret: item.two_factor_secret || pData.twoFactorSecret || undefined,
          twoFactorBackupCodes: Array.isArray(item.two_factor_backup_codes) 
            ? item.two_factor_backup_codes 
            : (Array.isArray(pData.twoFactorBackupCodes) ? pData.twoFactorBackupCodes : []),
          twoFactorConfirmedAt: item.two_factor_confirmed_at || pData.twoFactorConfirmedAt || undefined,
          createdAt: item.created_at || pData.createdAt || new Date().toISOString(),
          lastLoginAt: item.updated_at || pData.lastLoginAt || new Date().toISOString(),
        };
      });
    }
  } catch (err) {
    handleSupabaseError('fetch all users exception', err);
  }
  return [];
}

/**
 * Delete user from Supabase (standard user row deletion)
 */
export async function deleteUserFromSupabase(key: string): Promise<boolean> {
  try {
    const docKey = key.toLowerCase().trim();
    const { error } = await supabase
      .from(USERS_TABLE)
      .delete()
      .or(`id.ilike.${docKey},username.ilike.${docKey},user_id.ilike.${docKey}`);

    if (error) {
      handleSupabaseError('delete user', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete user exception', err);
    return false;
  }
}

/**
 * Soft delete user in Supabase: suspends user, sets is_deleted flag, preserves calculations
 */
export async function softDeleteUserInSupabase(key: string, adminUsername?: string): Promise<boolean> {
  try {
    const docKey = key.toLowerCase().trim();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from(USERS_TABLE)
      .update({
        status: 'suspended',
        is_deleted: true,
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .or(`id.ilike.${docKey},username.ilike.${docKey},user_id.ilike.${docKey}`);

    if (error) {
      handleSupabaseError('soft delete user', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('soft delete user exception', err);
    return false;
  }
}

/**
 * Restore a soft-deleted user in Supabase
 */
export async function restoreUserInSupabase(key: string): Promise<boolean> {
  try {
    const docKey = key.toLowerCase().trim();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from(USERS_TABLE)
      .update({
        status: 'active',
        is_deleted: false,
        deleted_at: null,
        updated_at: nowIso,
      })
      .or(`id.ilike.${docKey},username.ilike.${docKey},user_id.ilike.${docKey}`);

    if (error) {
      handleSupabaseError('restore user', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('restore user exception', err);
    return false;
  }
}

/**
 * Hard delete user and ALL associated calculations, gallery images, and consignments from Supabase
 */
export async function hardDeleteUserAndCalculationsFromSupabase(userTokens: string[]): Promise<boolean> {
  try {
    const cleanTokens = Array.from(
      new Set(userTokens.map((t) => t?.toLowerCase().trim()).filter(Boolean))
    );
    if (cleanTokens.length === 0) return true;

    // 1. Delete user row
    const userExpr = cleanTokens.map((t) => `id.ilike.${t},username.ilike.${t},user_id.ilike.${t}`).join(',');
    await supabase.from(USERS_TABLE).delete().or(userExpr);

    // 2. Delete all calculations belonging to this user
    for (const token of cleanTokens) {
      await supabase.from(CALCULATIONS_TABLE).delete().or(`user_id.ilike.${token},user_id.eq.${token}`);
      await supabase.from(GALLERY_TABLE).delete().or(`user_id.ilike.${token},user_id.eq.${token}`);
      await supabase.from('flight_consignments').delete().or(`user_id.ilike.${token},created_by.ilike.${token}`);
    }
    return true;
  } catch (err) {
    handleSupabaseError('hard delete user and calculations exception', err);
    return false;
  }
}

/**
 * Save calculation record to Supabase
 */
export async function saveCalculationToSupabase(calc: CalculationResult): Promise<boolean> {
  try {
    const payload = {
      id: calc.id,
      user_id: calc.userId || 'guest',
      title: calc.input?.title || 'Calculation Record',
      target_currency: calc.input?.targetCurrency || 'USD',
      total_landed_cost: calc.totalLandedCostTarget || 0,
      total_revenue: calc.totalRevenueTarget || 0,
      net_profit: calc.totalProfitTarget || 0,
      calculation_data: calc,
      created_at: calc.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase
      .from(CALCULATIONS_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError('save calculation', error);
      return false;
    }
    console.info('Calculation saved to Supabase successfully:', calc.id);
    return true;
  } catch (err) {
    handleSupabaseError('save calculation exception', err);
    return false;
  }
}

/**
 * Get calculations from Supabase for a specific user or all
 * Supports multi-token and case-insensitive matching for user IDs and aliases
 */
export async function getCalculationsFromSupabase(
  filterUserId?: string | null,
  userAliases?: string[]
): Promise<CalculationResult[]> {
  try {
    let query = supabase.from(CALCULATIONS_TABLE).select('*');

    const targetTokens = [
      filterUserId,
      ...(userAliases || []),
    ]
      .filter(Boolean)
      .map((t) => String(t).trim());

    if (targetTokens.length > 0) {
      // Build PostgreSQL OR clause matching user_id column case-insensitively
      const orClauses = targetTokens
        .flatMap((token) => [
          `user_id.ilike.${token}`,
          `user_id.eq.${token}`,
        ])
        .join(',');

      query = query.or(orClauses);
    }

    const { data, error } = await query;
    if (error) {
      handleSupabaseError('fetch calculations', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      const results: CalculationResult[] = data.map((item) => {
        let calcObj: any = item;
        if (item.calculation_data) {
          calcObj =
            typeof item.calculation_data === 'string'
              ? JSON.parse(item.calculation_data)
              : item.calculation_data;
        }

        return {
          ...calcObj,
          id: calcObj.id || item.id,
          userId: calcObj.userId || item.user_id || filterUserId || '',
          createdAt: calcObj.createdAt || item.created_at || new Date().toISOString(),
        } as CalculationResult;
      });

      results.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      return results;
    }
  } catch (err) {
    handleSupabaseError('fetch calculations exception', err);
  }
  return [];
}

/**
 * Delete calculation from Supabase
 */
export async function deleteCalculationFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(CALCULATIONS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError('delete calculation', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete calculation exception', err);
    return false;
  }
}

/**
 * Clear all calculations from Supabase for a specific user or all
 */
export async function clearAllCalculationsFromSupabase(filterUserId?: string | null): Promise<boolean> {
  try {
    let query = supabase.from(CALCULATIONS_TABLE).delete();
    if (filterUserId) {
      query = query.or(`user_id.ilike.${filterUserId},user_id.eq.${filterUserId}`);
    } else {
      query = query.neq('id', '');
    }

    const { error } = await query;
    if (error) {
      handleSupabaseError('clear calculations', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('clear calculations exception', err);
    return false;
  }
}

/**
 * Subscribe to real-time changes in calculations table
 */
export function subscribeToCalculationsSupabase(
  onUpdate: (data: CalculationResult[]) => void,
  filterUserId?: string | null,
  userAliases?: string[]
) {
  // Fetch initial data
  getCalculationsFromSupabase(filterUserId, userAliases).then((initialData) => {
    onUpdate(initialData);
  });

  const channelId = `calculations_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // Subscribe to changes
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: CALCULATIONS_TABLE },
      () => {
        getCalculationsFromSupabase(filterUserId, userAliases).then((freshData) => {
          onUpdate(freshData);
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time changes in users table
 */
export function subscribeToUsersSupabase(onUpdate: (data: UserProfile[]) => void) {
  // Fetch initial data
  getAllUsersFromSupabase().then((initialUsers) => {
    onUpdate(initialUsers);
  });

  const channelId = `users_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: USERS_TABLE },
      () => {
        getAllUsersFromSupabase().then((freshUsers) => {
          onUpdate(freshUsers);
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Save gallery image record to Supabase
 */
export interface GalleryImageRecord {
  id: string;
  calculation_id?: string;
  user_id?: string;
  title: string;
  sku?: string;
  category?: string;
  image_url: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  mime_type?: string;
  trade_direction?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export async function saveGalleryImageToSupabase(record: GalleryImageRecord): Promise<boolean> {
  try {
    const payload = {
      id: record.id || `IMG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      calculation_id: record.calculation_id || null,
      user_id: record.user_id || 'guest',
      title: record.title || 'Product Image',
      sku: record.sku || '',
      category: record.category || 'General',
      image_url: record.image_url,
      thumbnail_url: record.thumbnail_url || null,
      file_size_bytes: record.file_size_bytes || null,
      mime_type: record.mime_type || 'image/jpeg',
      trade_direction: record.trade_direction || 'import',
      metadata: record.metadata || {},
      created_at: record.created_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from(GALLERY_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError('save gallery image', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save gallery image exception', err);
    return false;
  }
}

/**
 * Get gallery images from Supabase
 */
export async function getGalleryImagesFromSupabase(filterUserId?: string | null): Promise<GalleryImageRecord[]> {
  try {
    let query = supabase.from(GALLERY_TABLE).select('*');
    if (filterUserId) {
      query = query.eq('user_id', filterUserId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      handleSupabaseError('fetch gallery images', error);
      return [];
    }
    return (data || []) as GalleryImageRecord[];
  } catch (err) {
    handleSupabaseError('fetch gallery images exception', err);
    return [];
  }
}

/**
 * Delete gallery image from Supabase
 */
export async function deleteGalleryImageFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(GALLERY_TABLE).delete().eq('id', id);
    if (error) {
      handleSupabaseError('delete gallery image', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete gallery image exception', err);
    return false;
  }
}

/**
 * Save flight consignment to Supabase
 */
export async function saveFlightConsignmentToSupabase(flight: FlightConsignment): Promise<boolean> {
  try {
    const payload = {
      id: flight.id,
      user_id: flight.userId || 'system',
      flight_number: flight.flightNumber || '',
      flight_name: flight.flightName || '',
      airline: flight.airline || '',
      flight_date: flight.flightDate || '',
      origin_airport: flight.originAirport || '',
      destination_airport: flight.destinationAirport || '',
      awb_number: flight.awbNumber || '',
      document_pdf_url: flight.documentPdfUrl || null,
      status: flight.status || 'scheduled',
      flight_data: flight,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(FLIGHTS_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      handleSupabaseError('save flight consignment', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('save flight consignment exception', err);
    return false;
  }
}

/**
 * Fetch flight consignments from Supabase
 */
export async function getFlightConsignmentsFromSupabase(userId?: string): Promise<FlightConsignment[]> {
  try {
    let query = supabase.from(FLIGHTS_TABLE).select('*');
    if (userId && userId !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      handleSupabaseError('fetch flight consignments', error);
      return [];
    }

    if (data && Array.isArray(data)) {
      return data.map((item) => {
        if (item.flight_data) {
          return {
            ...item.flight_data,
            id: item.id || item.flight_data.id,
            status: item.status || item.flight_data.status,
          };
        }
        return {
          id: item.id,
          userId: item.user_id,
          flightNumber: item.flight_number,
          flightName: item.flight_name || item.flight_number,
          airline: item.airline,
          flightDate: item.flight_date,
          originAirport: item.origin_airport,
          destinationAirport: item.destination_airport,
          awbNumber: item.awb_number,
          documentPdfUrl: item.document_pdf_url,
          status: item.status,
          calculationIds: [],
          createdAt: item.created_at || new Date().toISOString(),
        } as FlightConsignment;
      });
    }
  } catch (err) {
    handleSupabaseError('fetch flight consignments exception', err);
  }
  return [];
}

/**
 * Delete flight consignment from Supabase
 */
export async function deleteFlightConsignmentFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(FLIGHTS_TABLE).delete().eq('id', id);
    if (error) {
      handleSupabaseError('delete flight consignment', error);
      return false;
    }
    return true;
  } catch (err) {
    handleSupabaseError('delete flight consignment exception', err);
    return false;
  }
}

/**
 * Subscribe to real-time changes in flight_consignments table in Supabase
 */
export function subscribeToFlightConsignmentsSupabase(
  onUpdate: (data: FlightConsignment[]) => void,
  userId?: string | null
) {
  // Fetch initial data
  getFlightConsignmentsFromSupabase(userId || undefined).then((initialData) => {
    if (initialData && initialData.length > 0) {
      onUpdate(initialData);
    }
  });

  const channelId = `flights_sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: FLIGHTS_TABLE },
      () => {
        getFlightConsignmentsFromSupabase(userId || undefined).then((freshData) => {
          onUpdate(freshData);
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * ==============================================================================
 * Gym Workout Progression & Nutrition Supabase Handlers
 * ==============================================================================
 */

export async function saveWorkoutSheetToSupabase(sheet: WorkoutSheet): Promise<void> {
  try {
    const row = {
      id: sheet.id,
      user_id: sheet.userId || null,
      name: sheet.name,
      description: sheet.description || '',
      total_weeks: sheet.totalWeeks || 8,
      current_week: sheet.currentWeek || 1,
      split_type: sheet.splitType || 'Push Pull Legs',
      days_count: sheet.daysCount || sheet.daysPerWeek || 3,
      raw_sheet_text: sheet.rawSheetText || sheet.rawSheetContent || '',
      exercises: sheet.exercises || [],
      is_active: sheet.isActive !== false && sheet.status !== 'archived',
      sheet_data: sheet,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from(WORKOUT_SHEETS_TABLE)
      .upsert(row, { onConflict: 'id' });
    if (error) handleSupabaseError('saveWorkoutSheetToSupabase', error);
  } catch (err) {
    handleSupabaseError('saveWorkoutSheetToSupabase catch', err);
  }
}

export async function getWorkoutSheetsFromSupabase(userId?: string): Promise<WorkoutSheet[]> {
  try {
    let query = supabase.from(WORKOUT_SHEETS_TABLE).select('*').order('created_at', { ascending: false });
    if (userId && userId !== 'admin') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error) {
      handleSupabaseError('getWorkoutSheetsFromSupabase', error);
      return [];
    }
    return (data || []).map((row: any) => {
      const fallback = row.sheet_data || {};
      const status: 'active' | 'completed' | 'archived' =
        fallback.status || (row.is_active === false ? 'archived' : 'active');
      return {
        id: row.id,
        userId: row.user_id || fallback.userId || 'user',
        userName: row.user_name || fallback.userName,
        name: row.name || fallback.name || 'Workout Sheet',
        description: row.description ?? fallback.description,
        totalWeeks: row.total_weeks ?? fallback.totalWeeks ?? 8,
        currentWeek: row.current_week ?? fallback.currentWeek ?? 1,
        daysPerWeek: row.days_count ?? row.days_per_week ?? fallback.daysPerWeek ?? fallback.daysCount ?? 3,
        daysCount: row.days_count ?? fallback.daysCount ?? 3,
        splitType: row.split_type ?? fallback.splitType ?? 'Push Pull Legs',
        sheetSource: fallback.sheetSource || 'manual',
        rawSheetContent: row.raw_sheet_text ?? fallback.rawSheetContent ?? '',
        rawSheetText: row.raw_sheet_text ?? fallback.rawSheetText ?? '',
        exercises: Array.isArray(row.exercises) && row.exercises.length > 0 ? row.exercises : (fallback.exercises || []),
        status,
        isActive: status === 'active',
        createdAt: row.created_at || fallback.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || fallback.updatedAt,
      };
    });
  } catch (err) {
    handleSupabaseError('getWorkoutSheetsFromSupabase catch', err);
    return [];
  }
}

export async function deleteWorkoutSheetFromSupabase(sheetId: string): Promise<void> {
  try {
    const { error } = await supabase.from(WORKOUT_SHEETS_TABLE).delete().eq('id', sheetId);
    if (error) handleSupabaseError('deleteWorkoutSheetFromSupabase', error);
  } catch (err) {
    handleSupabaseError('deleteWorkoutSheetFromSupabase catch', err);
  }
}

export async function saveWorkoutLogToSupabase(log: WorkoutLog): Promise<void> {
  try {
    const row = {
      id: log.id,
      sheet_id: log.sheetId || null,
      sheet_name: log.sheetName || '',
      user_id: log.userId || null,
      day_name: log.dayName,
      week_number: log.weekNumber || 1,
      date: log.date || new Date().toISOString().split('T')[0],
      total_volume_kg: log.totalVolumeKg || 0,
      max_weight_kg: log.maxWeightKg || 0,
      notes: log.notes || '',
      exercises: log.exercises || [],
      log_data: log,
      created_at: log.loggedAt || log.createdAt || new Date().toISOString(),
    };
    const { error } = await supabase
      .from(WORKOUT_LOGS_TABLE)
      .upsert(row, { onConflict: 'id' });
    if (error) handleSupabaseError('saveWorkoutLogToSupabase', error);
  } catch (err) {
    handleSupabaseError('saveWorkoutLogToSupabase catch', err);
  }
}

export async function getWorkoutLogsFromSupabase(userId?: string): Promise<WorkoutLog[]> {
  try {
    let query = supabase.from(WORKOUT_LOGS_TABLE).select('*').order('created_at', { ascending: false });
    if (userId && userId !== 'admin') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error) {
      handleSupabaseError('getWorkoutLogsFromSupabase', error);
      return [];
    }
    return (data || []).map((row: any) => {
      const fallback = row.log_data || {};
      const loggedAt = row.created_at || fallback.loggedAt || fallback.createdAt || new Date().toISOString();
      return {
        id: row.id,
        sheetId: row.sheet_id || fallback.sheetId || '',
        sheetName: row.sheet_name || fallback.sheetName,
        userId: row.user_id || fallback.userId || '',
        userName: fallback.userName,
        dayName: row.day_name || fallback.dayName || 'Day 1',
        weekNumber: row.week_number ?? fallback.weekNumber ?? 1,
        date: row.date || fallback.date || new Date().toISOString().split('T')[0],
        totalVolumeKg: Number(row.total_volume_kg) || Number(fallback.totalVolumeKg) || 0,
        maxWeightKg: Number(row.max_weight_kg) || Number(fallback.maxWeightKg) || 0,
        completed: Boolean(fallback.completed ?? true),
        notes: row.notes ?? fallback.notes ?? '',
        exercises: Array.isArray(row.exercises) && row.exercises.length > 0 ? row.exercises : (fallback.exercises || []),
        loggedAt,
        createdAt: loggedAt,
      };
    });
  } catch (err) {
    handleSupabaseError('getWorkoutLogsFromSupabase catch', err);
    return [];
  }
}

export async function saveNutritionLogToSupabase(log: NutritionLog): Promise<void> {
  try {
    const row = {
      id: log.id || log.date,
      user_id: log.userId || null,
      date: log.date,
      target_calories: log.calorieTarget || log.targetCalories || 2400,
      consumed_calories: log.calorieConsumed || log.consumedCalories || 0,
      protein_grams: log.proteinGrams || 0,
      target_protein_grams: log.proteinTargetGrams || log.targetProteinGrams || 160,
      carbs_grams: log.carbsGrams || 0,
      fats_grams: log.fatGrams || log.fatsGrams || 0,
      water_ml: log.waterMl || Math.round((log.waterLiters || 0) * 1000),
      meals: log.meals || [],
      notes: log.notes || '',
      nutrition_data: log,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from(NUTRITION_LOGS_TABLE)
      .upsert(row, { onConflict: 'id' });
    if (error) handleSupabaseError('saveNutritionLogToSupabase', error);
  } catch (err) {
    handleSupabaseError('saveNutritionLogToSupabase catch', err);
  }
}

export async function getNutritionLogsFromSupabase(userId?: string): Promise<NutritionLog[]> {
  try {
    let query = supabase.from(NUTRITION_LOGS_TABLE).select('*').order('date', { ascending: false });
    if (userId && userId !== 'admin') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error) {
      handleSupabaseError('getNutritionLogsFromSupabase', error);
      return [];
    }
    return (data || []).map((row: any) => {
      const fallback = row.nutrition_data || {};
      const calorieTarget = Number(row.target_calories) || Number(fallback.calorieTarget) || 2400;
      const calorieConsumed = Number(row.consumed_calories) || Number(fallback.calorieConsumed) || 0;
      const proteinGrams = Number(row.protein_grams) || Number(fallback.proteinGrams) || 0;
      const proteinTargetGrams = Number(row.target_protein_grams) || Number(fallback.proteinTargetGrams) || 160;
      const carbsGrams = Number(row.carbs_grams) || Number(fallback.carbsGrams) || 0;
      const carbsTargetGrams = Number(fallback.carbsTargetGrams) || 250;
      const fatGrams = Number(row.fats_grams) || Number(fallback.fatGrams) || 0;
      const fatTargetGrams = Number(fallback.fatTargetGrams) || 60;
      const waterLiters = Number(fallback.waterLiters) || (row.water_ml ? row.water_ml / 1000 : 0);
      const waterTargetLiters = Number(fallback.waterTargetLiters) || 3.0;

      return {
        id: row.id,
        userId: row.user_id || fallback.userId || '',
        date: row.date || fallback.date || new Date().toISOString().split('T')[0],
        calorieTarget,
        calorieConsumed,
        targetCalories: calorieTarget,
        consumedCalories: calorieConsumed,
        proteinGrams,
        proteinTargetGrams,
        targetProteinGrams: proteinTargetGrams,
        carbsGrams,
        carbsTargetGrams,
        fatGrams,
        fatsGrams: fatGrams,
        fatTargetGrams,
        waterLiters,
        waterTargetLiters,
        waterMl: row.water_ml ?? Math.round(waterLiters * 1000),
        meals: Array.isArray(row.meals) && row.meals.length > 0 ? row.meals : (fallback.meals || []),
        notes: row.notes ?? fallback.notes ?? '',
        createdAt: row.created_at || fallback.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || fallback.updatedAt,
      };
    });
  } catch (err) {
    handleSupabaseError('getNutritionLogsFromSupabase catch', err);
    return [];
  }
}

export interface SupabaseHealthReport {
  isConnected: boolean;
  usersTableOk: boolean;
  calculationsTableOk: boolean;
  galleryTableOk: boolean;
  flightsTableOk?: boolean;
  workoutSheetsTableOk?: boolean;
  workoutLogsTableOk?: boolean;
  nutritionLogsTableOk?: boolean;
  usersCount: number;
  calculationsCount: number;
  galleryImagesCount: number;
  flightsCount?: number;
  workoutSheetsCount?: number;
  workoutLogsCount?: number;
  nutritionLogsCount?: number;
  usersError?: string;
  calculationsError?: string;
  galleryError?: string;
  flightsError?: string;
  workoutSheetsError?: string;
  workoutLogsError?: string;
  nutritionLogsError?: string;
  generalError?: string;
  checkedAt: string;
  recommendedSqlDDL: string;
}

export const SUPABASE_REQUIRED_DDL_SQL = `-- ==============================================================================
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
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON public.calculations (user_id);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON public.calculations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculations_product_sku ON public.calculations ((calculation_data->'input'->>'skuSupplier'));
CREATE INDEX IF NOT EXISTS idx_calculations_trade_direction ON public.calculations ((calculation_data->'input'->>'tradeDirection'));
CREATE INDEX IF NOT EXISTS idx_calculations_has_image ON public.calculations (((calculation_data->'input'->>'invoiceImage') IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_gallery_images_user_id ON public.gallery_images (user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_calculation_id ON public.gallery_images (calculation_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sku ON public.gallery_images (sku);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at ON public.gallery_images (created_at DESC);

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
  sheet_data JSONB, -- Complete WorkoutSheet object backup
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
  log_data JSONB, -- Complete WorkoutLog object backup
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
  nutrition_data JSONB, -- Complete NutritionLog object backup
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
ALTER TABLE public.workout_sheets ADD COLUMN IF NOT EXISTS sheet_data JSONB;
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS log_data JSONB;
ALTER TABLE public.nutrition_logs ADD COLUMN IF NOT EXISTS nutrition_data JSONB;

-- 10. Default Pre-Configured Credentials removed for production security.
-- User accounts are created dynamically via User Registration or the Admin Panel.
`;

/**
 * Diagnostic auto-check for Supabase connection and tables status
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthReport> {
  const report: SupabaseHealthReport = {
    isConnected: false,
    usersTableOk: false,
    calculationsTableOk: false,
    galleryTableOk: false,
    flightsTableOk: false,
    workoutSheetsTableOk: false,
    workoutLogsTableOk: false,
    nutritionLogsTableOk: false,
    usersCount: 0,
    calculationsCount: 0,
    galleryImagesCount: 0,
    flightsCount: 0,
    workoutSheetsCount: 0,
    workoutLogsCount: 0,
    nutritionLogsCount: 0,
    checkedAt: new Date().toISOString(),
    recommendedSqlDDL: SUPABASE_REQUIRED_DDL_SQL,
  };

  try {
    // 1. Check users table
    const { count: usersCount, error: usersErr } = await supabase
      .from(USERS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (usersErr) {
      report.usersError = usersErr.message;
      if (usersErr.code === '42P01' || (usersErr.message || '').toLowerCase().includes('does not exist')) {
        report.usersError = `Table "${USERS_TABLE}" missing in Supabase. Please run SQL setup script.`;
      }
    } else {
      report.usersTableOk = true;
      report.usersCount = usersCount ?? 0;
    }

    // 2. Check workout_sheets table
    const { count: sheetsCount, error: sheetsErr } = await supabase
      .from(WORKOUT_SHEETS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (sheetsErr) {
      report.workoutSheetsError = sheetsErr.message;
      report.workoutSheetsTableOk = false;
    } else {
      report.workoutSheetsTableOk = true;
      report.workoutSheetsCount = sheetsCount ?? 0;
    }

    // 3. Check workout_logs table
    const { count: logsCount, error: logsErr } = await supabase
      .from(WORKOUT_LOGS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (logsErr) {
      report.workoutLogsError = logsErr.message;
      report.workoutLogsTableOk = false;
    } else {
      report.workoutLogsTableOk = true;
      report.workoutLogsCount = logsCount ?? 0;
    }

    // 4. Check nutrition_logs table
    const { count: nutrCount, error: nutrErr } = await supabase
      .from(NUTRITION_LOGS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (nutrErr) {
      report.nutritionLogsError = nutrErr.message;
      report.nutritionLogsTableOk = false;
    } else {
      report.nutritionLogsTableOk = true;
      report.nutritionLogsCount = nutrCount ?? 0;
    }

    // 5. Check calculations table
    const { count: calcsCount, error: calcsErr } = await supabase
      .from(CALCULATIONS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (calcsErr) {
      report.calculationsError = calcsErr.message;
      if (calcsErr.code === '42P01' || (calcsErr.message || '').toLowerCase().includes('does not exist')) {
        report.calculationsError = `Table "${CALCULATIONS_TABLE}" missing in Supabase. Please run SQL setup script.`;
      }
    } else {
      report.calculationsTableOk = true;
      report.calculationsCount = calcsCount ?? 0;
    }

    // 6. Check gallery_images table
    const { count: galleryCount, error: galleryErr } = await supabase
      .from(GALLERY_TABLE)
      .select('id', { count: 'exact', head: true });

    if (galleryErr) {
      report.galleryError = galleryErr.message;
    } else {
      report.galleryTableOk = true;
      report.galleryImagesCount = galleryCount ?? 0;
    }

    // 7. Check flight_consignments table
    const { count: flightsCount, error: flightsErr } = await supabase
      .from(FLIGHTS_TABLE)
      .select('id', { count: 'exact', head: true });

    if (flightsErr) {
      report.flightsError = flightsErr.message;
    } else {
      report.flightsTableOk = true;
      report.flightsCount = flightsCount ?? 0;
    }

    report.isConnected =
      report.usersTableOk ||
      report.workoutSheetsTableOk ||
      report.calculationsTableOk ||
      !report.usersError?.includes('FetchError');
  } catch (err: any) {
    report.generalError = err?.message || 'Failed to connect to Supabase backend';
  }

  return report;
}


