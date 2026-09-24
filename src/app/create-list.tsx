import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { Occasion, Visibility } from '@/lib/types';
import { useSession } from '@/providers/session-provider';

const BRAND = '#cc5500';
const CITY = 'Milano';

type DraftRestaurant = { name: string; note: string };

export default function CreateListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams<{ occasion?: string }>();

  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [occasionId, setOccasionId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [restaurants, setRestaurants] = useState<DraftRestaurant[]>([{ name: '', note: '' }]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // load occasions for the picker; preselect the one passed in (from an occasion page)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('occasions')
        .select('id, slug, label, icon, sort_order')
        .order('sort_order', { ascending: true });
      if (!active || !data) return;
      setOccasions(data);
      if (params.occasion) {
        const match = data.find((o: Occasion) => o.slug === params.occasion);
        if (match) setOccasionId(match.id);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.occasion]);

  function updateRestaurant(index: number, patch: Partial<DraftRestaurant>) {
    setRestaurants((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRestaurantRow() {
    setRestaurants((prev) => [...prev, { name: '', note: '' }]);
  }

  // Find an existing restaurant by (name, city) or create it. Returns its id.
  async function findOrCreateRestaurant(name: string): Promise<string | null> {
    const trimmed = name.trim();
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', trimmed)
      .eq('city', CITY)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data: created, error } = await supabase
      .from('restaurants')
      .insert({ name: trimmed, city: CITY, created_by: user?.id })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return created?.id ?? null;
  }

  async function onSave() {
    setError(null);
    if (!user) {
      setError('Please sign in first.');
      return;
    }
    if (!title.trim()) {
      setError('Give your list a title.');
      return;
    }
    if (!occasionId) {
      setError('Pick an occasion.');
      return;
    }

    const filled = restaurants.filter((r) => r.name.trim().length > 0);

    setSaving(true);
    try {
      // 1) create the list
      const { data: list, error: listError } = await supabase
        .from('lists')
        .insert({
          owner_id: user.id,
          title: title.trim(),
          city: CITY,
          occasion_id: occasionId,
          visibility,
        })
        .select('id')
        .single();
      if (listError) throw new Error(listError.message);

      // 2) attach restaurants (find-or-create), then link them as list_items
      if (filled.length > 0) {
        const items = [];
        for (let i = 0; i < filled.length; i++) {
          const restaurantId = await findOrCreateRestaurant(filled[i].name);
          if (!restaurantId) continue;
          items.push({
            list_id: list.id,
            restaurant_id: restaurantId,
            position: i + 1,
            note: filled[i].note.trim() || null,
          });
        }
        if (items.length > 0) {
          const { error: itemsError } = await supabase.from('list_items').insert(items);
          if (itemsError) throw new Error(itemsError.message);
        }
      }

      // 3) go to the new list
      router.replace({ pathname: '/list/[id]', params: { id: list.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ThemedText type="small" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable onPress={onSave} disabled={saving} hitSlop={12}>
              <ThemedText type="link" style={{ color: BRAND, opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">New list</ThemedText>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title (e.g. Best for a first date)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <ThemedText type="small" themeColor="textSecondary">
              Occasion
            </ThemedText>
            <View style={styles.chips}>
              {occasions.map((o) => {
                const selected = o.id === occasionId;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setOccasionId(o.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? BRAND : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? '#ffffff' : theme.text }}>
                      {o.icon ?? ''} {o.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Visibility
            </ThemedText>
            <View style={styles.visibilityRow}>
              {(['public', 'private'] as Visibility[]).map((v) => {
                const selected = v === visibility;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVisibility(v)}
                    style={[
                      styles.visibilityButton,
                      {
                        backgroundColor: selected ? BRAND : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.text }}>
                      {v === 'public' ? 'Public' : 'Private'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionSpacer}>
              Restaurants
            </ThemedText>
            {restaurants.map((r, i) => (
              <View key={i} style={styles.restaurantRow}>
                <TextInput
                  value={r.name}
                  onChangeText={(t) => updateRestaurant(i, { name: t })}
                  placeholder={`Place #${i + 1}`}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <TextInput
                  value={r.note}
                  onChangeText={(t) => updateRestaurant(i, { note: t })}
                  placeholder="Note (optional) — e.g. book the window table"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, styles.noteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>
            ))}
            <Pressable onPress={addRestaurantRow} hitSlop={8} style={styles.addRow}>
              <ThemedText type="link" style={{ color: BRAND }}>
                + Add another place
              </ThemedText>
            </Pressable>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}
            {saving && <ActivityIndicator color={BRAND} style={styles.saving} />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  noteInput: { marginTop: Spacing.two, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.five },
  visibilityRow: { flexDirection: 'row', gap: Spacing.two },
  visibilityButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  sectionSpacer: { marginTop: Spacing.two },
  restaurantRow: { marginBottom: Spacing.three },
  addRow: { paddingVertical: Spacing.two },
  error: { color: '#e5484d' },
  saving: { marginTop: Spacing.two },
});
