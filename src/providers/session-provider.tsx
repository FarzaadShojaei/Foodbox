import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';

type AuthResult = { error: string | null };
/** needsConfirmation = signed up, but no session yet (email confirmation is on) */
type SignUpResult = { error: string | null; needsConfirmation: boolean };

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  /** true only while we load the persisted session on cold start */
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1) read the session persisted in AsyncStorage on startup
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 2) keep it in sync with sign-in / sign-out / token refresh
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      async signInWithEmail(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUpWithEmail(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        // If "Confirm email" is OFF, Supabase returns a session -> already signed in.
        // If it's ON, there's no session until the user clicks the email link.
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}

/**
 * Guest-first gate. Wrap any action that requires an account (like, save,
 * create list). If the user is signed out, it opens the sign-in modal instead
 * of running the action.
 *
 *   const run = useProtectedAction();
 *   <Pressable onPress={() => run(() => likeList(id))}>
 */
export function useProtectedAction() {
  const { session } = useSession();
  const router = useRouter();

  return (action: () => void) => {
    if (!session) {
      router.push('/sign-in');
      return;
    }
    action();
  };
}
