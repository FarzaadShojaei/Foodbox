import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

export default function SignUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signUpWithEmail } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const { error, needsConfirmation } = await signUpWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    if (needsConfirmation) {
      // "Confirm email" is ON: no session yet, user must click the email link.
      setNotice('Check your email to confirm your account, then sign in.');
      return;
    }
    // "Confirm email" is OFF: session created, we're signed in -> close the modal.
    router.back();
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
            Create account
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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password-new"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          {notice && (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
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
              {submitting ? 'Creating…' : 'Sign up'}
            </ThemedText>
          </Pressable>

          <ThemedView style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account?{' '}
            </ThemedText>
            <Link href="/sign-in" replace>
              <ThemedText type="link" style={{ color: BRAND }}>
                Sign in
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
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
