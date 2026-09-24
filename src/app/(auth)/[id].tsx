import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { ListItemRow } from '@/lib/types';

type ListHeader = {
  id: string;
  title: string;
  city: string;
  like_count: number;
  occasions?: { label: string; icon: string | null } | null;
  profiles?: { display_name: string | null } | null;
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [list, setList] = useState<ListHeader | null>(null);
  const [items, setItems] = useState<ListItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: header } = await supabase
        .from('lists')
        .select('id, title, city, like_count, occasions(label, icon), profiles(display_name)')
        .eq('id', id)
        .single();

      const { data: rows } = await supabase
        .from('list_items')
        .select('id, position, note, restaurants(id, name, city, cover_image_url, rating)')
        .eq('list_id', id)
        .order('position', { ascending: true });

      if (!active) return;
      // Joined relations infer as arrays without generated types; they're
      // objects at runtime for to-one FKs, so cast through unknown.
      setList((header ?? null) as unknown as ListHeader | null);
      setItems((rows ?? []) as unknown as ListItemRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText type="link">‹ Back</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : list ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <ThemedText type="small" themeColor="textSecondary">
                {list.occasions?.icon ?? ''} {list.occasions?.label ?? ''} · {list.city}
              </ThemedText>
              <ThemedText type="title">{list.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                By {list.profiles?.display_name ?? 'someone'} · ♥ {list.like_count}
              </ThemedText>
            </View>

            {items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No places in this list yet.
              </ThemedText>
            ) : (
              <View style={styles.list}>
                {items.map((it, index) => (
                  <ThemedView
                    key={it.id}
                    type="backgroundElement"
                    style={styles.card}>
                    <View style={styles.cardHead}>
                      <ThemedText type="default" style={styles.rank}>
                        {index + 1}.
                      </ThemedText>
                      <ThemedText type="default" style={styles.name}>
                        {it.restaurants?.name ?? 'Unknown place'}
                      </ThemedText>
                      {it.restaurants?.rating != null && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {it.restaurants.rating.toFixed(1)}
                        </ThemedText>
                      )}
                    </View>
                    {it.note ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {it.note}
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <ThemedText type="small" style={styles.notFound}>
            List not found.
          </ThemedText>
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
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.two },
  list: { gap: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Spacing.four, gap: Spacing.two },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rank: { fontWeight: '700', color: '#cc5500' },
  name: { fontWeight: '600', flex: 1 },
  notFound: { padding: Spacing.four },
});
