import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Values live in .env (never committed). EXPO_PUBLIC_ = readable by the app bundle.
// The ANON key is designed to be public — RLS is what protects your data.
// NEVER put the service_role key in the app.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // persists the session across app restarts
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // native app, not a web redirect flow
  },
});

// Keep the token fresh only while the app is in the foreground.
// (Supabase's recommended pattern for React Native.)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
