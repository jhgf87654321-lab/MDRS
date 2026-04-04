export interface CharacterAttributes {
  name: string;
  gender: 'male' | 'female' | 'creature';
  age: number;
  height: number;
  ethnicity: string;
  hairStyle: string;
  hairColor: string;
  eyebrows: string;
  beard: string;
  eyeColor: string;
  eyeShape: string;
  skinTone: string;
  faceShape: string;
  noseHeight: string;
  noseWidth: string;
  mouthShape: string;
  bodyType: string;
  expression: string;
  makeup: string;
  lighting: string;
  cameraAngle: string;
  style: string;
  clothing: string;
  background: string;
  customPrompt: string;
  interrogatedPrompt: string | null;
  isVirtualRestoration: boolean;
  virtualImage: string | null;
  referenceImage: string | null;
  referenceWeight: number;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  name: 'DIGITAL HUMAN',
  gender: 'female',
  age: 25,
  height: 175,
  ethnicity: 'Caucasian',
  hairStyle: 'Long wavy',
  hairColor: 'Blonde',
  eyebrows: 'Arched',
  beard: 'Clean-shaven',
  eyeColor: 'Blue',
  eyeShape: 'Almond',
  skinTone: 'Fair',
  faceShape: 'Oval',
  noseHeight: 'Medium',
  noseWidth: 'Average',
  mouthShape: 'Full',
  bodyType: 'Athletic',
  expression: 'Neutral',
  makeup: 'Natural beauty',
  lighting: 'Cinematic Studio',
  cameraAngle: 'Close-up',
  style: 'Hyper-realistic',
  clothing: 'Minimalist techwear',
  background: 'Futuristic studio',
  customPrompt: '',
  interrogatedPrompt: null,
  isVirtualRestoration: false,
  virtualImage: null,
  referenceImage: null,
  referenceWeight: 0.5,
};
