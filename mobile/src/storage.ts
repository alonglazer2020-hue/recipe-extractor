import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, SavedRecipe } from './types';

const STORAGE_KEY = 'recipe_extractor.saved_recipes';

export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedRecipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRecipe(
  recipe: Recipe,
  sourceUrl: string,
  sourceTitle: string,
  sourcePlatform: string,
): Promise<SavedRecipe> {
  const existing = await getSavedRecipes();
  const saved: SavedRecipe = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recipe,
    source_url: sourceUrl,
    source_title: sourceTitle,
    source_platform: sourcePlatform,
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
