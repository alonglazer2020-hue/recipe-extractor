import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExtractionResult, SavedRecipe } from '../types';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../screens/LoadingScreen';
import RecipeScreen from '../screens/RecipeScreen';

export type RecipeScreenParams =
  | { mode: 'fresh'; result: ExtractionResult }
  | { mode: 'saved'; saved: SavedRecipe };

export type RootStackParamList = {
  Home: undefined;
  Loading: { urls: string[]; note?: string };
  Recipe: RecipeScreenParams;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1b1410' },
          headerTintColor: '#f5ead9',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Recipe Extractor' }}
        />
        <Stack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{ title: 'Extracting…', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="Recipe"
          component={RecipeScreen}
          options={{ title: 'Recipe' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
