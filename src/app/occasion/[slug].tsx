import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { ListRow, Occasion } from '@/lib/types';
import { useProtectedAction } from '@/providers/session-provider';

const BRAND = '#cc5500';
const CITY = 'Milano';

export default function OccasionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const runProtected = useProtectedAction();

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: occ } = await supabase
        .from('occasions')
        .select('id, slug, label, icon, sort_order')
        .eq('slug', slug)
        .single();
      if (!active) return;
      setOccasion(occ ?? null);

      if (occ) {
        const { data: rows } = await supabase
          .from('lists')
          .select('id, title, city, visibility, like_count, occasion_id, owner_id, created_at, profiles(display_name)')
          .eq('occasion_id', occ.id)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });
        if (!active) return;
        // Supabase infers joined relations as arrays without generated types;
        // for a to-one FK it's an object at runtime, so cast through unknown.
        setLists((rows ?? []) as unknown as ListRow[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  function onCreate() {
    runProtected(() =>
      router.push({ pathname: '/create-list', params: { occasion: slug } }),
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText type="link">‹ Back</ThemedText>
          </Pressable>
          <Pressable onPress={onCreate} hitSlop={12}>
            <ThemedText type="link" style={{ color: BRAND }}>
              + New list
            </ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : occasion ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.icon}>{occasion.icon ?? ''}</ThemedText>
              <ThemedText type="title">{occasion.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                in {CITY}
              </ThemedText>
            </View>

            {lists.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.empty, { borderColor: theme.backgroundSelected }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  No lists yet for this occasion.
                </ThemedText>
                <Pressable
                  onPress={onCreate}
                  style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: BRAND },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.ctaText}>Create the first one</ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <View style={styles.list}>
                {lists.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })}
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="default" style={styles.cardTitle}>
                      {l.title}
                    </ThemedText>
                    <View style={styles.cardMeta}>
                      <ThemedText type="small" themeColor="textSecondary">
                        By {l.profiles?.display_name ?? 'someone'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        ♥ {l.like_count}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <ThemedText type="small" style={styles.notFound}>
            Occasion not found.
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  loader: { marginTop: Spacing.five },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.two, alignItems: 'flex-start' },
  icon: { fontSize: 44 },
  empty: {
    alignSelf: 'stretch',
    padding: Spacing.five,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyText: { textAlign: 'center' },
  cta: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  ctaText: { color: '#ffffff', fontWeight: '600' },
  list: { gap: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  cardTitle: { fontWeight: '600' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },
  notFound: { padding: Spacing.four },
});
