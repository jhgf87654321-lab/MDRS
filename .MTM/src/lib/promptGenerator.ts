import { CharacterAttributes } from '../types';

function hairStyleForPrompt(attrs: CharacterAttributes): string {
  if (attrs.hairStyle === 'Custom') {
    const c = attrs.hairStyleCustom?.trim();
    return c || 'natural hairstyle as described by user';
  }
  return attrs.hairStyle;
}

/** 面容天然斑驳（雀斑、胎记等）强度，写入 prompt */
export function faceMarkingPromptDirective(level: number): string {
  const n = Math.max(0, Math.min(100, Math.round(Number.isFinite(level) ? level : 20)));
  if (n <= 10) {
    return 'Facial skin markings: very even complexion on the face, no prominent freckles, birthmarks, or patchy pigmentation.';
  }
  if (n <= 35) {
    return 'Facial skin markings: natural face with subtle variation only; at most faint freckles or tiny beauty marks, keep markings understated.';
  }
  if (n <= 60) {
    return 'Facial skin markings: clearly natural face with moderate freckles and/or light birthmarks where appropriate; authentic uneven tone on the face.';
  }
  if (n <= 85) {
    return 'Facial skin markings: strong natural character on the face — visible freckles, noticeable birthmarks or beauty marks, pronounced natural mottling.';
  }
  return 'Facial skin markings: heavy natural character on the face — dense freckling, prominent birthmarks, strong authentic patchy pigmentation; realistic, not stylized acne or wounds.';
}

export function generatePrompt(attrs: CharacterAttributes): string {
  // Baseline behavior (match earliest non-reference mode):
  // Always force a fixed 3:4 portrait card and strict 2x2 equal grid.
  const structureDirective =
    'STRUCTURE (NON-NEGOTIABLE): Output EXACTLY 4 photos arranged as a 2x2 grid (2 columns, 2 rows). No third row. No extra thumbnails. No filmstrip. No contact sheet. No additional images anywhere.';
  const aspectDirective =
    'Output framing: STRICT portrait 3:4 aspect ratio (width:height = 3:4).';
  const gridDirective =
    'Grid constraint: STRICT 2x2 with four equal-size quadrants (same width and height per cell), perfectly aligned rows/columns, consistent margins; do not merge cells or change per-cell size.';
  const perCellAspectDirective =
    'PER-CELL FRAMING (NON-NEGOTIABLE): Each of the 4 quadrants must be square 1:1 tiles. Keep all four cells exactly square and equal-sized.';
  const noFakeUiDirective =
    'NO EXTRA TEXT/UI: Do not add any captions, labels, names, heights, metadata, watermarks, logos, UI bars, buttons, icons, or interface elements inside the generated image.';
  const baseDescription = `A ${attrs.age}-year-old ${attrs.gender} ${attrs.ethnicity} model. 
    Height: ${attrs.height} cm.
    Face: ${attrs.faceShape} face shape, ${attrs.eyeShape} eyes (${attrs.eyeColor}), ${attrs.noseHeight} nose height, ${attrs.noseWidth} nose width, ${attrs.mouthShape} mouth shape.
    Hair: ${hairStyleForPrompt(attrs)} (${attrs.hairColor}), ${attrs.eyebrows} eyebrows, ${attrs.beard} facial hair.
    Skin: ${attrs.skinTone} skin tone.
    ${faceMarkingPromptDirective(attrs.faceMarkingDetail ?? 20)}
    Makeup: ${attrs.makeup}.
    Body: ${attrs.bodyType} build, wearing ${attrs.clothing}.
    Scene: ${attrs.lighting}, ${attrs.background}.
    ${attrs.customPrompt ? `Additional Directives: ${attrs.customPrompt}` : ''}`;

  if (attrs.isVirtualRestoration) {
    return `A professional model comp card (model card) featuring the SAME CHARACTER in 4 DIFFERENT POSES. 
    The character is a real-life human version of the virtual character in the reference image.
    Layout: A 2x2 grid of 4 photos.
    ${structureDirective}
    ${aspectDirective}
    ${gridDirective}
    ${perCellAspectDirective}
    ${noFakeUiDirective}
    Pose 1 (Top Left): Standard front-facing portrait, head to chest, looking at camera.
    Pose 2 (Top Right): Half-body side profile, relaxed pose.
    Pose 3 (Bottom Left): 2/3 body shot, relaxed pose.
    Pose 4 (Bottom Right — MANDATORY FULL BODY): The bottom-right cell MUST be a true full-length full-body photograph: entire person visible from top of head to feet (toes/shoes fully in frame), standing, camera pulled back enough that the whole body fits inside that quadrant — NOT a half-body, NOT a knee-up crop, NOT missing feet.
    Style: Absolute photorealism, raw amateur photography, matte skin texture, visible pores, non-greasy, natural lighting, white studio background. 
    ${faceMarkingPromptDirective(attrs.faceMarkingDetail ?? 20)}
    CRITICAL: All 4 images must be of the EXACT SAME PERSON. NO CG, NO 3D look.`;
  }

  return `A professional model comp card (model card) featuring the SAME CHARACTER in 4 DIFFERENT POSES.
    Character Description: ${baseDescription}
    Layout: A 2x2 grid of 4 photos.
    ${structureDirective}
    ${aspectDirective}
    ${gridDirective}
    ${perCellAspectDirective}
    ${noFakeUiDirective}
    Pose 1 (Top Left): Standard front-facing portrait, head to chest, looking at camera.
    Pose 2 (Top Right): Half-body side profile, relaxed pose.
    Pose 3 (Bottom Left): 2/3 body shot, relaxed pose.
    Pose 4 (Bottom Right — MANDATORY FULL BODY): The bottom-right cell MUST be a true full-length full-body photograph: entire person visible from top of head to feet (toes/shoes fully in frame), standing, camera pulled back enough that the whole body fits inside that quadrant — NOT a half-body, NOT a knee-up crop, NOT missing feet.
    Style: Absolute photorealism, raw amateur photography, matte skin texture, visible pores, non-greasy, natural lighting, white studio background.
    CRITICAL: All 4 images must be of the EXACT SAME PERSON. NO CG, NO 3D render, NO AI look.`;
}
