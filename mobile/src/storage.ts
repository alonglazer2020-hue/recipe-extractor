import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, SavedRecipe, Source } from './types';

const STORAGE_KEY = 'recipe_extractor.saved_recipes';

export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed)) return [];
    // Migrate recipes saved before multi-source support (single source_url/title/platform).
    return parsed.map(item =>
      Array.isArray(item.sources)
        ? item
        : {
            ...item,
            sources: item.source_url
              ? [{ url: item.source_url, title: item.source_title, platform: item.source_platform }]
              : [],
          },
    );
  } catch {
    return [];
  }
}

export async function saveRecipe(recipe: Recipe, sources: Source[]): Promise<SavedRecipe> {
  const existing = await getSavedRecipes();
  const saved: SavedRecipe = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recipe,
    sources,
    saved_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...existing]));
  return saved;
}

export async function deleteSavedRecipe(id: string): Promise<void> {
  const existing = await getSavedRecipes();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter(r => r.id !== id)),
  );
}
