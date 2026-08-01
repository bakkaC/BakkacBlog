import { useRef, useState, useEffect } from 'react';
import Matter from 'matter-js';
import './FallingText.css';

interface FallingTextProps {
  text?: string;
  highlightWords?: string[];
  highlightClass?: string;
  trigger?: 'auto' | 'scroll' | 'click' | 'hover';
  gravity?: number;
  mouseConstraintStiffness?: number;
  fontSize?: string;
  chaosFactor?: number;
}

const DEFAULT_HIGHLIGHT_WORDS: string[] = [];
const LEGACY_PHYSICS_SPEED = 2;

const FallingText: React.FC<FallingTextProps> = ({
  text = '',
  highlightWords = DEFAULT_HIGHLIGHT_WORDS,
  highlightClass = 'highlighted',
  trigger = 'auto',
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = '1rem',
  chaosFactor = 1
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);

  const [effectStarted, setEffectStarted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!textRef.current) return;
    const words = text.split(' ');
    const newHTML = words
      .map(word => {
        const isHighlighted = highlightWords.some(hw => word.startsWith(hw));
        return `<span class="word ${isHighlighted ? highlightClass : ''}">${word}</span>`;
      })
      .join(' ');
    textRef.current.innerHTML = newHTML;
  }, [text, highlightWords, highlightClass]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(motionQuery.matches);

    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);

    return () => motionQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (trigger === 'auto') {
      setEffectStarted(true);
      return;
    }
    if (trigger === 'scroll' && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectStarted || prefersReducedMotion) return;

    const { Engine, World, Bodies, Mouse, MouseConstraint } = Matter;

    if (!containerRef.current || !textRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    if (width <= 0 || height <= 0) {
      return;
    }

    const engine = Engine.create();
    engine.enableSleeping = true;
    engine.world.gravity.y = gravity;

    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: 'transparent' }
    };
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

    const wordSpans = textRef.current.querySelectorAll<HTMLSpanElement>('.word');
    const wordBodies = Array.from(wordSpans).map(elem => {
      const rect = elem.getBoundingClientRect();

      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;

      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2,
        sleepThreshold: 30
      });

      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5 * chaosFactor,
        y: (Math.random() - 0.5) * 2 * chaosFactor
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05 * chaosFactor);
      return { elem, body };
    });
    type WordBody = (typeof wordBodies)[number]['body'];

    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = 'absolute';
      elem.style.left = '0';
      elem.style.top = '0';
      elem.style.margin = '0';
      elem.style.willChange = 'transform';
      elem.style.transform = `translate3d(${body.position.x}px, ${body.position.y}px, 0) translate(-50%, -50%) rotate(${body.angle}rad)`;
    });

    const mouse = Mouse.create(container);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: mouseConstraintStiffness,
        render: { visible: false }
      }
    });

    World.add(engine.world, [floor, leftWall, rightWall, ceiling, mouseConstraint, ...wordBodies.map(wb => wb.body)]);

    let animationFrameId: number | null = null;
    let lastFrameTime: number | null = null;
    let isInViewport = true;
    let stoppedAfterSettling = false;
    let disposed = false;
    let isPointerDown = false;

    const clearCompositorHints = () => {
      wordBodies.forEach(({ elem }) => {
        elem.style.willChange = '';
      });
    };

    const syncWordPositions = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
    };

    const clampBodyToContainer = (body: WordBody) => {
      const correction = { x: 0, y: 0 };

      if (body.bounds.min.x < 0) {
        correction.x = -body.bounds.min.x;
      } else if (body.bounds.max.x > width) {
        correction.x = width - body.bounds.max.x;
      }

      if (body.bounds.min.y < 0) {
        correction.y = -body.bounds.min.y;
      } else if (body.bounds.max.y > height) {
        correction.y = height - body.bounds.max.y;
      }

      if (correction.x === 0 && correction.y === 0) return false;

      Matter.Body.translate(body, correction);

      // Only cancel velocity that is still pushing the body out of the canvas.
      // Keeping inward velocity preserves the original collision/fall response.
      const velocity = { x: body.velocity.x, y: body.velocity.y };
      if (correction.x > 0 && velocity.x < 0) velocity.x = 0;
      if (correction.x < 0 && velocity.x > 0) velocity.x = 0;
      if (correction.y > 0 && velocity.y < 0) velocity.y = 0;
      if (correction.y < 0 && velocity.y > 0) velocity.y = 0;
      Matter.Body.setVelocity(body, velocity);
      return true;
    };

    const clampBodiesToContainer = () => {
      let activeBodyWasClamped = false;

      wordBodies.forEach(({ body }) => {
        const wasClamped = clampBodyToContainer(body);
        if (wasClamped && body === mouseConstraint.body) {
          activeBodyWasClamped = true;
        }
      });

      if (activeBodyWasClamped && mouseConstraint.body && mouseConstraint.constraint.pointB) {
        mouse.position.x = mouseConstraint.body.position.x + mouseConstraint.constraint.pointB.x;
        mouse.position.y = mouseConstraint.body.position.y + mouseConstraint.constraint.pointB.y;
      }
    };

    const constrainMouseTarget = () => {
      const activeBody = mouseConstraint.body;
      const pointB = mouseConstraint.constraint.pointB;
      if (!isPointerDown || !activeBody || !pointB) return;

      const halfWidth = Math.max(
        activeBody.position.x - activeBody.bounds.min.x,
        activeBody.bounds.max.x - activeBody.position.x
      );
      const halfHeight = Math.max(
        activeBody.position.y - activeBody.bounds.min.y,
        activeBody.bounds.max.y - activeBody.position.y
      );
      const targetCenterX = mouse.position.x - pointB.x;
      const targetCenterY = mouse.position.y - pointB.y;
      const centerX = Math.max(halfWidth, Math.min(width - halfWidth, targetCenterX));
      const centerY = Math.max(halfHeight, Math.min(height - halfHeight, targetCenterY));

      mouse.position.x = centerX + pointB.x;
      mouse.position.y = centerY + pointB.y;
    };

    const stopAnimation = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastFrameTime = null;
      clearCompositorHints();
    };

    const updateLoop = (time: number) => {
      animationFrameId = null;
      if (disposed || document.hidden || !isInViewport) return;

      const delta = lastFrameTime === null
        ? 1000 / 60
        : Math.min(time - lastFrameTime, 1000 / 30);
      lastFrameTime = time;

      if (!isPointerDown && mouse.button === 0) {
        mouse.button = -1;
        Mouse.clearSourceEvents(mouse);
      }
      constrainMouseTarget();
      // The previous implementation advanced Matter once in Runner and once in its own RAF.
      Engine.update(engine, delta * LEGACY_PHYSICS_SPEED);
      // Static walls/floor handle normal physics. Manual clamping is only
      // needed while dragging, when the mouse constraint can pull through them.
      if (isPointerDown) {
        clampBodiesToContainer();
      }
      syncWordPositions();

      if (wordBodies.every(({ body }) => body.isSleeping)) {
        stoppedAfterSettling = true;
        clearCompositorHints();
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateLoop);
    };

    const startAnimation = () => {
      if (disposed || document.hidden || !isInViewport || animationFrameId !== null) return;

      stoppedAfterSettling = false;
      lastFrameTime = null;
      wordBodies.forEach(({ elem }) => {
        elem.style.willChange = 'transform';
      });
      animationFrameId = window.requestAnimationFrame(updateLoop);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      isPointerDown = true;
      try {
        container.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic pointer events do not own a capturable pointer.
      }
      startAnimation();
    };

    const releasePointer = (pointerId?: number) => {
      isPointerDown = false;
      mouse.button = -1;
      Mouse.clearSourceEvents(mouse);

      if (pointerId !== undefined && container.hasPointerCapture?.(pointerId)) {
        container.releasePointerCapture(pointerId);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      releasePointer(event.pointerId);
    };

    const handleWindowBlur = () => {
      releasePointer();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else if (!stoppedAfterSettling) {
        startAnimation();
      }
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isInViewport = entry?.isIntersecting ?? true;
      if (isInViewport && !stoppedAfterSettling) {
        startAnimation();
      } else {
        stopAnimation();
      }
    });

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('lostpointercapture', handlePointerUp);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityObserver.observe(container);
    startAnimation();

    return () => {
      disposed = true;
      stopAnimation();
      visibilityObserver.disconnect();
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('lostpointercapture', handlePointerUp);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releasePointer();

      container.removeEventListener('mousemove', mouse.mousemove);
      container.removeEventListener('mousedown', mouse.mousedown);
      container.removeEventListener('mouseup', mouse.mouseup);
      container.removeEventListener('wheel', mouse.mousewheel);
      container.removeEventListener('touchmove', mouse.mousemove);
      container.removeEventListener('touchstart', mouse.mousedown);
      container.removeEventListener('touchend', mouse.mouseup);
      Mouse.clearSourceEvents(mouse);

      wordBodies.forEach(({ elem }) => {
        elem.style.position = '';
        elem.style.left = '';
        elem.style.top = '';
        elem.style.margin = '';
        elem.style.transform = '';
        elem.style.willChange = '';
      });

      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [effectStarted, prefersReducedMotion, gravity, mouseConstraintStiffness, chaosFactor]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) {
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="falling-text-container"
      onClick={trigger === 'click' ? handleTrigger : undefined}
      onMouseEnter={trigger === 'hover' ? handleTrigger : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4
        }}
      />
    </div>
  );
};

export default FallingText;
