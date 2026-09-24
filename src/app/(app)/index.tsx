import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Occasion } from '@/lib/types';
import { useProtectedAction, useSession } from '@/providers/session-provider';

const BRAND = '#cc5500';
const CITY = 'Milano';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, signOut } = useSession();
  const runProtected = useProtectedAction();

  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('occasions')
        .select('id, slug, label, icon, sort_order')
        .order('sort_order', { ascending: true });
      if (!active) return;
      if (error) setError(error.message);
      else setOccasions(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.brand}>
                Foodbox
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                📍 {CITY}
              </ThemedText>
            </View>
            {user ? (
              <Pressable onPress={signOut} hitSlop={8}>
                <ThemedText type="link" style={{ color: BRAND }}>
                  Sign out
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/sign-in')} hitSlop={8}>
                <ThemedText type="link" style={{ color: BRAND }}>
                  Sign in
                </ThemedText>
              </Pressable>
            )}
          </View>

          <ThemedText type="subtitle" style={styles.prompt}>
            What&apos;s the occasion?
          </ThemedText>

          <Pressable
            onPress={() => runProtected(() => router.push('/create-list'))}
            style={({ pressed }) => [
              styles.newListButton,
              { borderColor: BRAND },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: BRAND, fontWeight: '600' }}>
              + New list
            </ThemedText>
          </Pressable>

          {loading ? (
            <ActivityIndicator color={BRAND} style={styles.loader} />
          ) : error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : (
            <View style={styles.grid}>
              {occasions.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => router.push({ pathname: '/occasion/[slug]', params: { slug: o.slug } })}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.tileIcon}>{o.icon ?? '•'}</ThemedText>
                  <ThemedText type="small" style={styles.tileLabel}>
                    {o.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { gap: Spacing.half },
  brand: { fontSize: 34, lineHeight: 40 },
  prompt: { marginTop: Spacing.two },
  newListButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loader: { marginTop: Spacing.five },
  error: { color: '#e5484d' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  tile: {
    width: '48%',
    aspectRatio: 1.4,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  tileIcon: { fontSize: 30 },
  tileLabel: { fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
