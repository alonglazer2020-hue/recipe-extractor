import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';
import { SavedRecipe } from '../types';
import { getSavedRecipes } from '../storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function isLikelyVideoUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value.trim())) return false;
  return /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(value);
}

export default function HomeScreen({ navigation }: Props) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedRecipes().then(setSaved);
    }, []),
  );

  const showUrlWarning = touched && url.trim().length > 0 && !isLikelyVideoUrl(url);

  const onExtract = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setTouched(true);
      return;
    }
    navigation.navigate('Loading', { url: trimmed });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inputSection}>
        <Text style={styles.label}>Paste a cooking video link</Text>
        <TextInput
          style={styles.input}
          placeholder="TikTok, Instagram Reels, or YouTube URL"
          placeholderTextColor={colors.textMuted}
          value={url}
          onChangeText={t => {
            setUrl(t);
            if (!touched) setTouched(true);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {showUrlWarning && (
          <Text style={styles.warningText}>
            That doesn't look like a TikTok, Instagram, or YouTube link — you can still try it.
          </Text>
        )}
        <Pressable style={styles.button} onPress={onExtract}>
          <Text style={styles.buttonText}>Extract Recipe</Text>
        </Pressable>
      </View>

      <View style={styles.savedSection}>
        <Text style={styles.sectionTitle}>Saved Recipes</Text>
        {saved.length === 0 ? (
          <Text style={styles.emptyText}>
            Recipes you save will show up here.
          </Text>
        ) : (
          <FlatList
            data={saved}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.savedItem}
                onPress={() =>
                  navigation.navigate('Recipe', { mode: 'saved', saved: item })
                }
              >
                <Text style={styles.savedTitle} numberOfLines={1}>
                  {item.recipe.title}
                </Text>
                <Text style={styles.savedMeta}>
                  {item.source_platform || 'source'} ·{' '}
                  {new Date(item.saved_at).toLocaleDateString()}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inputSection: { padding: 20 },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  warningText: { color: colors.warning, marginTop: 8, fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  savedSection: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  savedItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  savedTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  savedMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
