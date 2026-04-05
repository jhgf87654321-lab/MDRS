import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uImageAspect;

  void main() {
    vec2 uv = vUv;
    float planeAspect = uAspect;
    float imageAspect = uImageAspect;

    if (planeAspect > imageAspect) {
      float scale = imageAspect / planeAspect;
      uv.y = (uv.y - 0.5) * scale + 0.5;
    } else {
      float scale = planeAspect / imageAspect;
      uv.x = (uv.x - 0.5) * scale + 0.5;
    }

    vec4 texColor = texture2D(uTexture, uv);

    vec2 correctedUv = vUv;
    correctedUv.x *= uAspect;
    vec2 correctedMouse = uMouse;
    correctedMouse.x *= uAspect;

    float dist = distance(correctedUv, correctedMouse);

    float radius = 0.3;
    float softness = 0.2;
    float intensity = 1.0 - smoothstep(radius - softness, radius + softness, dist);

    vec3 ambient = texColor.rgb * 0.02;
    vec3 finalColor = mix(ambient, texColor.rgb, intensity);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

type Props = {
  imageUrl: string;
};

export function FlashlightScene({ imageUrl }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const texture = useTexture(imageUrl);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAspect: { value: 1 },
      uImageAspect: { value: 1.6 },
    }),
    [texture],
  );

  useLayoutEffect(() => {
    const mat = materialRef.current;
    const img = texture.image as HTMLImageElement | undefined;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (!mat || !img) return;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w > 0 && h > 0) {
      mat.uniforms.uImageAspect.value = w / h;
    }
  }, [texture]);

  useFrame(({ viewport, pointer }) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uAspect.value = viewport.width / viewport.height;
    const targetMouse = new THREE.Vector2((pointer.x + 1) / 2, (pointer.y + 1) / 2);
    mat.uniforms.uMouse.value.lerp(targetMouse, 0.15);
  });

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
