import { CharacterAttributes } from '../types';

function hairStyleForPrompt(attrs: CharacterAttributes): string {
  if (attrs.hairStyle === 'Custom') {
    const c = attrs.hairStyleCustom?.trim();
    return c || 'natural hairstyle as described by user';
  }
  return attrs.hairStyle;
}

export function generatePrompt(attrs: CharacterAttributes): string {
  const baseDescription = `A ${attrs.age}-year-old ${attrs.gender} ${attrs.ethnicity} model. 
    Height: ${attrs.height} cm.
    Face: ${attrs.faceShape} face shape, ${attrs.eyeShape} eyes (${attrs.eyeColor}), ${attrs.noseHeight} nose height, ${attrs.noseWidth} nose width, ${attrs.mouthShape} mouth shape.
    Hair: ${hairStyleForPrompt(attrs)} (${attrs.hairColor}), ${attrs.eyebrows} eyebrows, ${attrs.beard} facial hair.
    Skin: ${attrs.skinTone} skin tone.
    Makeup: ${attrs.makeup}.
    Body: ${attrs.bodyType} build, wearing ${attrs.clothing}.
    Scene: ${attrs.lighting}, ${attrs.background}.
    ${attrs.customPrompt ? `Additional Directives: ${attrs.customPrompt}` : ''}`;

  if (attrs.isVirtualRestoration) {
    return `A professional model comp card (model card) featuring the SAME CHARACTER in 4 DIFFERENT POSES. 
    The character is a real-life human version of the virtual character in the reference image.
    Layout: A 2x2 grid of 4 photos.
    Pose 1 (Top Left): Standard front-facing portrait, head to chest, looking at camera.
    Pose 2 (Top Right): Half-body side profile, relaxed pose.
    Pose 3 (Bottom Left): 2/3 body shot, relaxed pose.
    Pose 4 (Bottom Right — MANDATORY FULL BODY): The bottom-right cell MUST be a true full-length full-body photograph: entire person visible from top of head to feet (toes/shoes fully in frame), standing, camera pulled back enough that the whole body fits inside that quadrant — NOT a half-body, NOT a knee-up crop, NOT missing feet.
    Style: Absolute photorealism, raw amateur photography, matte skin texture, visible pores, non-greasy, natural lighting, white studio background. 
    CRITICAL: All 4 images must be of the EXACT SAME PERSON. NO CG, NO 3D look.`;
  }

  return `A professional model comp card (model card) featuring the SAME CHARACTER in 4 DIFFERENT POSES.
    Character Description: ${baseDescription}
    Layout: A 2x2 grid of 4 photos.
    Pose 1 (Top Left): Standard front-facing portrait, head to chest, looking at camera.
    Pose 2 (Top Right): Half-body side profile, relaxed pose.
    Pose 3 (Bottom Left): 2/3 body shot, relaxed pose.
    Pose 4 (Bottom Right — MANDATORY FULL BODY): The bottom-right cell MUST be a true full-length full-body photograph: entire person visible from top of head to feet (toes/shoes fully in frame), standing, camera pulled back enough that the whole body fits inside that quadrant — NOT a half-body, NOT a knee-up crop, NOT missing feet.
    Style: Absolute photorealism, raw amateur photography, matte skin texture, visible pores, non-greasy, natural lighting, white studio background.
    CRITICAL: All 4 images must be of the EXACT SAME PERSON. NO CG, NO 3D render, NO AI look.`;
}
