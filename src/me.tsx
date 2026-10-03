import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Visibility } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

const BRAND = '#cc5500';

type MyList = {
  id: string;
  title: string;
  city: string;
  visibility: Visibility;
  like_count: number;
  occasions?: { label: string; icon: string | null } | null;
};

export default function MeScreen() {
  const { user } = useSession();
  const router = useRouter();
  const theme = useTheme();

  const [myLists, setMyLists] = useState<MyList[]>([]);
  const [saved, setSaved] = useState<MyList[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      let active = true;
      (async () => {
        setLoading(true);
        const [{ data: mine }, { data: savedRows }] = await Promise.all([
          supabase
            .from('lists')
            .select('id, title, city, visibility, like_count, created_at, occasions(label, icon)')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('list_saves')
            .select('lists(id, title, city, visibility, like_count, occasions(label, icon))')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);
        if (!active) return;
        setMyLists((mine ?? []) as unknown as MyList[]);
        setSaved(
          ((savedRows ?? []) as unknown as { lists: MyList | null }[])
            .map((r) => r.lists)
            .filter((l): l is MyList => l != null),
        );
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [user]),
  );

  function renderCard(l: MyList) {
    return (
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
            {l.occasions?.icon ?? ''} {l.occasions?.label ?? ''}
          </ThemedText>
          <View style={styles.metaRight}>
            {l.visibility === 'private' && (
              <ThemedText type="small" themeColor="textSecondary">
                🔒 Private
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              ♥ {l.like_count}
            </ThemedText>
          </View>
        </View>
      </Pressable>
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
        </View>

        {!user ? (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary">
              Sign in to see your lists and saves.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/sign-in')}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: BRAND },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.ctaText}>Sign in</ThemedText>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="subtitle">My lists</ThemedText>
            {myLists.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                You haven&apos;t made any lists yet.
              </ThemedText>
            ) : (
              <View style={styles.list}>{myLists.map(renderCard)}</View>
            )}

            <ThemedText type="subtitle" style={styles.sectionGap}>
              Saved
            </ThemedText>
            {saved.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing saved yet.
              </ThemedText>
            ) : (
              <View style={styles.list}>{saved.map(renderCard)}</View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  topbar: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  loader: { marginTop: Spacing.five },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  content: { padding: Spacing.four, gap: Spacing.three },
  sectionGap: { marginTop: Spacing.four },
  list: { gap: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  cardTitle: { fontWeight: '600' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRight: { flexDirection: 'row', gap: Spacing.three },
  cta: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  ctaText: { color: '#ffffff', fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
