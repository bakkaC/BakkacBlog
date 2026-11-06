import type { ReactNode } from 'react';
import { PaperTexture } from '@paper-design/shaders-react';
import { usePaperTextureReveal } from '../../lib/use-paper-texture-reveal';

/**
 * Homepage paper wash. Kept as its own island so the ProfileCard hydrates
 * without pulling the WebGL shader onto the critical path.
 *
 * Must import the same `PaperTexture` symbol as `PaperTextureBackground` so
 * Vite still emits one shared chunk.
 */
export default function HomePaperTexture(): ReactNode {
  const paper = usePaperTextureReveal();

  return (
    <PaperTexture
      ref={paper.ref}
      fit="contain"
      scale={0.9}
      blending={1}
      distortion={0.3}
      clip={false}
      angle={300}
      seed={4}
      roughness={0.4}
      roughnessSize={0.5}
      roughnessRows={0}
      fiber={0.39}
      fiberSize={0.5}
      folds={0}
      foldSizeX={1}
      foldSizeY={1}
      foldOffsetX={0}
      foldOffsetY={0}
      wrinkles={1}
      wrinkleSize={0.65}
      drops={0.08}
      colorBack="#00000000"
      colorPaper="#FFFFFFC2"
      colorShadow="#CCCCCC66"
      className="paper-texture-reveal absolute inset-0 z-0 h-full w-full bg-[#F4F4F4]"
      style={{ opacity: paper.revealed ? undefined : 0 }}
    />
  );
}
