import { PaperTexture } from '@paper-design/shaders-react';
import { usePaperTextureReveal } from '../../lib/use-paper-texture-reveal';

/**
 * Paper texture for the collection pages.
 *
 * Same shader and tuning as the home page — only the paper/shadow tint differs,
 * so each page can sit on its own accent colour. Both call sites must keep
 * importing the same `PaperTexture` symbol so Vite emits one shared chunk.
 */
export default function PaperTextureBackground() {
  const { ref, revealed } = usePaperTextureReveal();

  return (
    <PaperTexture
      ref={ref}
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
      wrinkles={0.45}
      wrinkleSize={0.65}
      drops={0.08}
      colorBack="#00000000"
      // Keep the page's accent color as the base; the texture only adds subtle grain and shadows.
      colorPaper="#FFFFFF28"
      colorShadow="#77777772"
      className="paper-texture-background paper-texture-reveal"
      style={{ opacity: revealed ? undefined : 0 }}
    />
  );
}
