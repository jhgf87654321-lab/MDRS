export interface CharacterAttributes {
  name: string;
  gender: 'male' | 'female' | 'creature';
  age: number;
  height: number;
  ethnicity: string;
  hairStyle: string;
  /** 发型选「Custom」时写入生成 prompt 的自定义描述 */
  hairStyleCustom: string;
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
  age: 18,
  height: 175,
  ethnicity: 'Asian',
  hairStyle: 'Ponytail',
  hairStyleCustom: '',
  hairColor: 'Black',
  eyebrows: 'Thin',
  beard: 'Clean-shaven',
  eyeColor: 'Brown',
  eyeShape: 'Almond',
  skinTone: 'Fair',
  faceShape: 'Strong jawline',
  noseHeight: 'Medium',
  noseWidth: 'Average',
  mouthShape: 'Thin',
  bodyType: 'Athletic',
  expression: 'Angry',
  makeup: 'Natural beauty',
  lighting: 'Cinematic Studio',
  cameraAngle: 'Close-up',
  style: 'Hyper-realistic',
  clothing: 'T-shirt',
  background: 'Futuristic studio',
  customPrompt: '',
  interrogatedPrompt: null,
  isVirtualRestoration: false,
  virtualImage: null,
  referenceImage: null,
  referenceWeight: 0.5,
};
