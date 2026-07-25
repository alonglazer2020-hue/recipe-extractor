from typing import List, Optional

from pydantic import BaseModel, Field


class Ingredient(BaseModel):
    item: str = Field(description="Ingredient name as named by the creator")
    quantity_stated: Optional[str] = Field(
        default=None, description="Quantity exactly as stated in the source, e.g. '2 cups'. Null if never stated."
    )
    grams: Optional[float] = Field(
        default=None, description="Stated quantity converted to grams. Null if quantity was unstated or not convertible."
    )
    volume: Optional[str] = Field(
        default=None, description="Stated quantity converted to cups/tbsp/tsp (whichever fits), e.g. '2 tbsp'. Null if not applicable/unstated."
    )
    unstated: bool = Field(
        default=False, description="True if the video never gave a quantity for this ingredient."
    )
    note: Optional[str] = Field(
        default=None, description="e.g. 'amount not stated in video' when unstated is true."
    )


class Step(BaseModel):
    instruction: str = Field(description="The step itself, standardized/clear wording")
    technique_note: Optional[str] = Field(
        default=None,
        description="Plain-language explanation of any non-obvious technique in this step, using general cooking knowledge. Null if the step is self-explanatory.",
    )
    creator_tip: Optional[str] = Field(
        default=None,
        description="A tip/warning/shortcut the creator gave for this step, in or close to their own words. Null if none.",
    )


class Recipe(BaseModel):
    title: str
    ingredients: List[Ingredient]
    oven_temp_original: Optional[str] = Field(
        default=None, description="Oven/cooking temp exactly as stated, e.g. '350F'. Null if none mentioned."
    )
    oven_temp_celsius: Optional[float] = Field(
        default=None, description="oven_temp_original converted to Celsius. Null if none mentioned."
    )
    steps: List[Step]


class ExtractionResult(BaseModel):
    video_has_recipe: bool = Field(description="False if this video does not contain any cooking recipe at all")
    reason_if_no_recipe: Optional[str] = Field(
        default=None, description="Plain explanation when video_has_recipe is false, e.g. 'This is a restaurant review with no recipe given.'"
    )
    source_confidence: str = Field(
        description="One of 'high', 'medium', 'low' — how complete/clear the transcript+caption were for producing a real recipe"
    )
    source_notes: Optional[str] = Field(
        default=None,
        description="Explain any gaps, e.g. 'Audio was unclear for the last 20 seconds' or 'Caption filled in a step missing from audio' or 'Steps are incomplete — only 2 of what looks like several steps were captured.'",
    )
    recipes: List[Recipe] = Field(
        default_factory=list, description="One entry per distinct recipe in the video. Empty if video_has_recipe is false."
    )
