import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

const BRAND = '#cc5500';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signInWithEmail } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.back(); // dismiss the modal; session updates via the auth listener
  }

  function onGoogle() {
    // Wired but not active yet: Google sign-in needs the Supabase Google
    // provider + the app's signing SHA-1 from the first EAS build.
    Alert.alert('Google sign-in', 'Coming soon — needs Supabase provider setup first.');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
            <ThemedText type="small" themeColor="textSecondary">
              Close
            </ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.heading}>
            Welcome back
          </ThemedText>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: BRAND },
              (pressed || submitting) && styles.pressed,
            ]}>
            <ThemedText style={styles.primaryButtonText}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onGoogle}
            style={({ pressed }) => [
              styles.googleButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="default">Continue with Google</ThemedText>
          </Pressable>

          <ThemedView style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              No account yet?{' '}
            </ThemedText>
            <Link href="/sign-up" replace>
              <ThemedText type="link" style={{ color: BRAND }}>
                Sign up
              </ThemedText>
            </Link>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  form: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  close: { position: 'absolute', top: Spacing.four, right: Spacing.four },
  heading: { marginBottom: Spacing.three },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  error: { color: '#e5484d' },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  googleButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
