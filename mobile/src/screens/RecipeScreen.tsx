import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme';
import RecipeView from '../components/RecipeView';
import { deleteSavedRecipe, saveRecipe } from '../storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Recipe'>;

export default function RecipeScreen({ route, navigation }: Props) {
  const params = route.params;

  if (params.mode === 'saved') {
    const { saved } = params;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <RecipeView
          recipe={saved.recipe}
          sourceUrl={saved.source_url}
          sourceTitle={saved.source_title}
          sourcePlatform={saved.source_platform}
          saveAction={{
            type: 'remove',
            onRemove: async () => {
              await deleteSavedRecipe(saved.id);
              navigation.goBack();
            },
          }}
        />
      </SafeAreaView>
    );
  }

  return <FreshResult navigation={navigation} result={params.result} />;
}

function FreshResult({ navigation, result }: { navigation: Props['navigation']; result: NonNullable<Extract<Props['route']['params'], { mode: 'fresh' }>['result']> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  if (!result.video_has_recipe || result.recipes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.noRecipeTitle}>No recipe found in this video</Text>
          <Text style={styles.noRecipeText}>
            {result.reason_if_no_recipe ||
              "This video doesn't appear to contain a recipe."}
          </Text>
          {!!result.source_url && (
            <Pressable onPress={() => Linking.openURL(result.source_url)}>
              <Text style={styles.link}>View original video</Text>
            </Pressable>
          )}
          <Pressable style={styles.backButton} onPress={() => navigation.popToTop()}>
            <Text style={styles.backButtonText}>Try another link</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const recipe = result.recipes[activeIndex];
  const isSaved = savedIndices.has(activeIndex);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {result.recipes.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {result.recipes.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.tab, i === activeIndex && styles.tabActive]}
              onPress={() => setActiveIndex(i)}
            >
              <Text style={[styles.tabText, i === activeIndex && styles.tabTextActive]} numberOfLines={1}>
                {r.title || `Recipe ${i + 1}`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {result.source_confidence === 'low' && (
        <View style={styles.confidenceBanner}>
          <Text style={styles.confidenceBannerText}>
            Some of this recipe may be incomplete —{' '}
            {result.source_notes || 'the audio/caption were unclear or thin in places.'}
          </Text>
        </View>
      )}

      <RecipeView
        recipe={recipe}
        sourceUrl={result.source_url}
        sourceTitle={result.source_title}
        sourcePlatform={result.source_platform}
        saveAction={{
          type: 'save',
          saved: isSaved,
          onSave: async () => {
            await saveRecipe(recipe, result.source_url, result.source_title, result.source_platform);
            setSavedIndices(prev => new Set(prev).add(activeIndex));
          },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  noRecipeTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  noRecipeText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  link: { color: colors.accent, fontSize: 14, marginBottom: 20 },
  backButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: { color: colors.accentText, fontWeight: '700' },
  tabBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 180,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  tabTextActive: { color: colors.accentText },
  confidenceBanner: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confidenceBannerText: { color: colors.warning, fontSize: 12, lineHeight: 17 },
});
