export interface Ingredient {
  item: string;
  quantity_stated: string | null;
  grams: number | null;
  volume: string | null;
  unstated: boolean;
  note: string | null;
}

export interface Step {
  instruction: string;
  technique_note: string | null;
  creator_tip: string | null;
}

export interface Recipe {
  title: string;
  ingredients: Ingredient[];
  oven_temp_original: string | null;
  oven_temp_celsius: number | null;
  steps: Step[];
}

export interface ExtractionResult {
  video_has_recipe: boolean;
  reason_if_no_recipe: string | null;
  source_confidence: 'high' | 'medium' | 'low';
  source_notes: string | null;
  recipes: Recipe[];
  source_url: string;
  source_title: string;
  source_platform: string;
}

export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'transcribing'
  | 'extracting'
  | 'done'
  | 'error';

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  result: ExtractionResult | null;
  error: string | null;
}

export interface SavedRecipe {
  id: string;
  recipe: Recipe;
  source_url: string;
  source_title: string;
  source_platform: string;
  saved_at: string;
}
