/**
 * Supabase stub for local-only mode.
 * This file exists so imports can reference @/lib/supabase.
 * When Supabase is connected, this will be replaced with real client configuration.
 */

export const isBackendConfigured = false;

export const supabase = {
  from: () => ({
    select: () => ({
      order: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
        gte: () => Promise.resolve({ data: null, error: null }),
        limit: () => Promise.resolve({ data: null, error: null }),
      }),
      eq: () => ({
        order: () => Promise.resolve({ data: null, error: null }),
        limit: () => Promise.resolve({ data: null, error: null }),
      }),
      gte: () => ({
        order: () => Promise.resolve({ data: null, error: null }),
      }),
      order: () => Promise.resolve({ data: null, error: null }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
  rpc: () => Promise.resolve({ data: null, error: null }),
};
