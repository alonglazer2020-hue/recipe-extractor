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

const MAX_URLS = 5;

function isLikelyVideoUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value.trim())) return false;
  return /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(value);
}

function extractUrls(raw: string): string[] {
  const tokens = raw.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  const urls = tokens.filter(t => /^https?:\/\//i.test(t));
  return Array.from(new Set(urls));
}

export default function HomeScreen({ navigation }: Props) {
  const [linksText, setLinksText] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSavedRecipes().then(setSaved);
    }, []),
  );

  const urls = extractUrls(linksText);
  const nonUrlTokenPresent =
    linksText.trim().length > 0 &&
    linksText.split(/[\s,]+/).map(t => t.trim()).filter(Boolean).length > urls.length;
  const showUrlWarning =
    touched && urls.length > 0 && !urls.every(isLikelyVideoUrl);
  const tooManyUrls = urls.length > MAX_URLS;

  const onExtract = () => {
    if (urls.length === 0) {
      setTouched(true);
      return;
    }
    navigation.navigate('Loading', {
      urls: urls.slice(0, MAX_URLS),
      note: note.trim() || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inputSection}>
        <Text style={styles.label}>Paste one or more cooking video links</Text>
        <TextInput
          style={[styles.input, styles.linksInput]}
          placeholder={'TikTok, Instagram Reels, or YouTube URLs\n(one per line, or separated by spaces)'}
          placeholderTextColor={colors.textMuted}
          value={linksText}
          onChangeText={t => {
            setLinksText(t);
            if (!touched) setTouched(true);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          textAlignVertical="top"
        />
        {nonUrlTokenPresent && (
          <Text style={styles.warningText}>
            Ignoring some text that doesn't look like a link.
          </Text>
        )}
        {showUrlWarning && (
          <Text style={styles.warningText}>
            That doesn't look like a TikTok, Instagram, or YouTube link — you can still try it.
          </Text>
        )}
        {tooManyUrls && (
          <Text style={styles.warningText}>
            Only the first {MAX_URLS} links will be used.
          </Text>
        )}
        {urls.length > 1 && (
          <Text style={styles.hintText}>{urls.length} links found</Text>
        )}

        <Text style={[styles.label, styles.noteLabel]}>Notes for the extractor (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder={
            'e.g. "These two links are the same recipe, combine them" or ' +
            '"Only use the second video, the first is just an intro"'
          }
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
        />

        <Pressable style={styles.button} onPress={onExtract}>
          <Text style={styles.buttonText}>
            {urls.length > 1 ? `Extract ${urls.length} Recipes` : 'Extract Recipe'}
          </Text>
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
                  {item.sources[0]?.platform || 'source'}
                  {item.sources.length > 1 ? ` +${item.sources.length - 1} more` : ''} ·{' '}
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
  linksInput: { minHeight: 80 },
  noteInput: { minHeight: 70 },
  noteLabel: { marginTop: 16 },
  warningText: { color: colors.warning, marginTop: 8, fontSize: 13 },
  hintText: { color: colors.textMuted, marginTop: 8, fontSize: 13 },
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
