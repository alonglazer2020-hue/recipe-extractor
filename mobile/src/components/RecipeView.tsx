import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Recipe } from '../types';

type SaveAction =
  | { type: 'save'; saved: boolean; onSave: () => void }
  | { type: 'remove'; onRemove: () => void };

interface Props {
  recipe: Recipe;
  sourceUrl: string;
  sourceTitle: string;
  sourcePlatform: string;
  saveAction: SaveAction;
}

export default function RecipeView({
  recipe,
  sourceUrl,
  sourceTitle,
  sourcePlatform,
  saveAction,
}: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{recipe.title}</Text>

      {!!sourceUrl && (
        <Pressable onPress={() => Linking.openURL(sourceUrl)}>
          <Text style={styles.sourceLink} numberOfLines={1}>
            {sourcePlatform ? `${sourcePlatform} · ` : ''}
            {sourceTitle || sourceUrl}
          </Text>
        </Pressable>
      )}

      {recipe.oven_temp_original && (
        <View style={styles.ovenBox}>
          <Text style={styles.ovenText}>
            Oven: {recipe.oven_temp_original}
            {recipe.oven_temp_celsius != null ? ` (${Math.round(recipe.oven_temp_celsius)}°C)` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.sectionHeading}>Ingredients</Text>
      {recipe.ingredients.map((ing, i) => (
        <View key={i} style={styles.ingredientRow}>
          <Text style={styles.bullet}>•</Text>
          <View style={styles.ingredientTextWrap}>
            <Text style={styles.ingredientItem}>
              {ing.item}
              {ing.unstated ? '' : ing.quantity_stated ? ` — ${ing.quantity_stated}` : ''}
              {!ing.unstated && (ing.grams != null || ing.volume)
                ? '  (' +
                  [
                    ing.grams != null ? `${Math.round(ing.grams)}g` : null,
                    ing.volume && ing.volume !== ing.quantity_stated ? ing.volume : null,
                  ]
                    .filter(Boolean)
                    .join(', ') +
                  ')'
                : ''}
            </Text>
            {ing.unstated && (
              <Text style={styles.unstatedNote}>
                {ing.note || 'amount not stated in video'}
              </Text>
            )}
          </View>
        </View>
      ))}

      <Text style={styles.sectionHeading}>Steps</Text>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.stepBlock}>
          <Text style={styles.stepInstruction}>
            <Text style={styles.stepNumber}>{i + 1}. </Text>
            {step.instruction}
          </Text>
          {step.technique_note && (
            <View style={styles.techniqueBox}>
              <Text style={styles.techniqueLabel}>How to do this</Text>
              <Text style={styles.techniqueText}>{step.technique_note}</Text>
            </View>
          )}
          {step.creator_tip && (
            <View style={styles.tipBox}>
              <Text style={styles.tipLabel}>Creator tip</Text>
              <Text style={styles.tipText}>{step.creator_tip}</Text>
            </View>
          )}
        </View>
      ))}

      {saveAction.type === 'save' ? (
        <Pressable
          style={[styles.saveButton, saveAction.saved && styles.saveButtonDisabled]}
          onPress={saveAction.onSave}
          disabled={saveAction.saved}
        >
          <Text style={styles.saveButtonText}>
            {saveAction.saved ? 'Saved to My Recipes' : 'Save to My Recipes'}
          </Text>
        </Pressable>
      ) : (
        <Pressable style={styles.removeButton} onPress={saveAction.onRemove}>
          <Text style={styles.removeButtonText}>Remove from Saved</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sourceLink: { color: colors.accent, marginTop: 6, fontSize: 13 },
  ovenBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  ovenText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 22,
    marginBottom: 10,
  },
  ingredientRow: { flexDirection: 'row', marginBottom: 8 },
  bullet: { color: colors.accent, fontSize: 16, marginRight: 8 },
  ingredientTextWrap: { flex: 1 },
  ingredientItem: { fontSize: 15, color: colors.text },
  unstatedNote: { fontSize: 12, color: colors.warning, marginTop: 2, fontStyle: 'italic' },
  stepBlock: { marginBottom: 18 },
  stepInstruction: { fontSize: 15, color: colors.text, lineHeight: 21 },
  stepNumber: { fontWeight: '700' },
  techniqueBox: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  techniqueLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginBottom: 3 },
  techniqueText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  tipBox: {
    backgroundColor: colors.warningBg,
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  tipLabel: { fontSize: 11, fontWeight: '700', color: colors.warning, marginBottom: 3 },
  tipText: { fontSize: 13, color: colors.text, lineHeight: 18, fontStyle: 'italic' },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveButtonText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },
  removeButton: {
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  removeButtonText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
