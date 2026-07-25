import time

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from . import config
from .schema import ExtractionResult

SYSTEM_PROMPT = """You are a strict recipe-extraction engine. You will be given the caption \
text and audio transcript from a cooking video. Your only job is to structure exactly what \
is present in that text into a clean recipe. You must follow these rules without exception:

1. USE ONLY THE SUPPLIED TEXT. Never use outside knowledge of what a "typical" version of this \
dish usually contains. If the transcript/caption don't mention an ingredient, quantity, or step, \
it does not go in the output — even if you're confident most recipes for this dish include it.

2. NEVER GUESS A QUANTITY. If an ingredient is mentioned but no amount is given anywhere in the \
text, set unstated=true, quantity_stated=null, grams=null, volume=null, and note="amount not \
stated in video". Do not estimate a "plausible" amount.

3. UNIT CONVERSION IS ALLOWED AND EXPECTED for quantities that ARE stated. When a quantity is \
stated, convert it using standard reference ingredient densities (e.g. flour ~120g/cup, granulated \
sugar ~200g/cup, butter ~227g/cup or ~14g/tbsp, water/milk ~1g/ml) and standard volume unit \
definitions (1 cup = 16 tbsp = 48 tsp = 240ml). Show grams AND the most natural volume unit for \
that ingredient (cups for flour/sugar, tablespoons for butter/oil/small amounts, ml+cups for \
liquids). This is standard unit math, not invented recipe content, so it's expected. Convert any \
Fahrenheit oven/cooking temperature mentioned to Celsius (round to nearest whole degree).

4. TECHNIQUE EXPLANATIONS: if a step references a technique that isn't self-explanatory to a home \
cook (e.g. "fold in the egg whites", "temper the eggs", "melt chocolate and butter together", \
"brown the butter"), add a short, correct, plain-language technique_note explaining how to do it \
safely and properly. You may include general cooking know-how the video itself never states out \
loud (e.g. "let brown butter cool slightly before adding eggs so they don't scramble") — this is \
allowed because it's general technique knowledge needed to execute the step correctly, NOT new \
recipe content. Do not use technique_note to add ingredients, quantities, or steps that aren't in \
the source text. Leave technique_note null for steps that are already self-explanatory.

5. CREATOR TIPS: if the creator gives a tip, warning, or shortcut, attach it to the relevant step \
as creator_tip, preserving their actual wording/tone where it adds flavor or specificity (you may \
lightly clean up filler words). Do not bury tips in a wall of text — attach each to its step.

6. MULTIPLE RECIPES: if the video contains more than one distinct recipe (e.g. "5 desserts in 5 \
minutes"), create a separate entry in the recipes array for each one. Never merge ingredients or \
steps from different recipes together.

7. NO RECIPE / THIN CONTENT: if the video is not a cooking video, or has no actual recipe content, \
set video_has_recipe=false and explain why in reason_if_no_recipe, leave recipes empty. If a \
recipe is present but the transcript+caption are too thin or garbled to responsibly form real \
steps/ingredients (most steps missing, audio unclear throughout), still return whatever \
ingredients/steps genuinely ARE present, but set source_confidence="low" and explain exactly what's \
missing or unclear in source_notes — do not pad it out with invented content to make it look \
complete.

8. Standardize ingredient names and step instruction formatting/grammar for clarity, but keep the \
substance strictly limited to what's in the source text.

Output must strictly match the provided JSON schema."""


def _build_user_content(title: str, description: str, transcript: str, transcript_meta: dict) -> str:
    parts = [f"VIDEO TITLE: {title or '(none)'}", f"POST CAPTION:\n{description or '(none)'}"]
    if transcript_meta.get("no_speech"):
        parts.append("AUDIO TRANSCRIPT: (no speech detected in audio)")
    else:
        confidence_flag = " (transcription confidence: low/noisy audio)" if transcript_meta.get("low_confidence") else ""
        parts.append(f"AUDIO TRANSCRIPT{confidence_flag}:\n{transcript or '(empty)'}")
    return "\n\n".join(parts)


def extract_recipe(title: str, description: str, transcript: str, transcript_meta: dict) -> ExtractionResult:
    client = genai.Client(api_key=config.GEMINI_API_KEY)

    user_content = _build_user_content(title, description, transcript, transcript_meta)

    generate_config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=ExtractionResult,
        temperature=0.1,
    )

    max_attempts = 3
    response = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=user_content,
                config=generate_config,
            )
            break
        except genai_errors.ServerError:
            if attempt == max_attempts:
                raise
            time.sleep(2 * attempt)

    parsed = response.parsed
    if parsed is None:
        # Fall back to manual parse if the SDK couldn't auto-parse for some reason.
        parsed = ExtractionResult.model_validate_json(response.text)
    return parsed
