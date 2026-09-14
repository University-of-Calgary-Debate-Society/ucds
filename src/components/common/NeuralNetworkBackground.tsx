import React, { useRef, useEffect } from 'react';
import { useAppSettings } from '@/contexts/AppSettingsContext';

interface NeuralNetworkBackgroundProps {
  mode: 'flicker-out' | 'flicker-in';
  isActive: boolean;
}

interface Node {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  brightness: number;
  targetBrightness: number;
  flickerDelay: number;
  strobeCount: number;
  pulsePhase: number;
  shockwaveRadius: number;
  shockwaveAlpha: number;
  colorHex: string;
}

export const NeuralNetworkBackground: React.FC<NeuralNetworkBackgroundProps> = ({ mode, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const { animationsEnabled } = useAppSettings();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Check system reduced motion as well
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isStatic = !animationsEnabled || prefersReducedMotion;

    // Controlled node count for guaranteed 60fps performance without CPU/GPU lag
    const NODE_COUNT = Math.min(Math.max(Math.floor((width * height) / 22000), 32), 65);
    const MAX_DISTANCE = 215;
    const MAX_DIST_SQ = MAX_DISTANCE * MAX_DISTANCE;
    const MAX_MOUSE_DRIFT = 40;
    const MOUSE_RADIUS = 260;

    const colors = ['#0075A2', '#53afd0', '#38bdf8', '#60a5fa', '#a5f3fc'];

    let nodes: Node[] = [];

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        // Distribute nodes evenly across screen grid + small jitter to avoid clustering
        const col = i % 8;
        const row = Math.floor(i / 8);
        const cellW = width / 8;
        const cellH = height / Math.ceil(NODE_COUNT / 8);
        const x = col * cellW + Math.random() * cellW;
        const y = row * cellH + Math.random() * cellH;

        const initialBrightness = mode === 'flicker-out' ? 1.0 : (isStatic ? 0.9 : 0.0);
        const targetBrightness = mode === 'flicker-out' ? (isStatic ? 0.85 : 0.0) : 1.0;

        nodes.push({
          baseX: x,
          baseY: y,
          x,
          y,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 2.2 + 3.0,
          brightness: initialBrightness,
          targetBrightness,
          flickerDelay: mode === 'flicker-out' ? Math.random() * 160 + 50 : Math.random() * 260 + 40,
          strobeCount: 0,
          pulsePhase: Math.random() * Math.PI * 2,
          shockwaveRadius: 0,
          shockwaveAlpha: 0,
          colorHex: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();

      if (isStatic) {
        renderStaticMesh();
      }
    };

    // ==============================================================
    // STATIC MODE (Reduced Motion / Disabled Animations):
    // Zero CPU usage. Rendered once to canvas, fades via CSS opacity.
    // ==============================================================
    const renderStaticMesh = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw strong connections
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < MAX_DIST_SQ * 1.3) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / (MAX_DISTANCE * 1.25)) * 0.85;
            if (alpha > 0.02) {
              ctx.beginPath();
              ctx.moveTo(nodeA.x, nodeA.y);
              ctx.lineTo(nodeB.x, nodeB.y);
              ctx.strokeStyle = '#38bdf8';
              ctx.globalAlpha = Math.min(alpha, 0.95);
              ctx.lineWidth = 2.4;
              ctx.stroke();
            }
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.colorHex;
        ctx.globalAlpha = 0.85;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.restore();
      }
    };

    if (isStatic) {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }

    // ==============================================================
    // ANIMATED MODE: Butter-smooth, zero-lag animation loop
    // No per-frame sorting or object allocations!
    // ==============================================================
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    resizeCanvas();

    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        return;
      }

      frameCount++;

      // Subtle cursor energy glow
      if (mouseRef.current.active) {
        const cursorGlow = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          MOUSE_RADIUS
        );
        cursorGlow.addColorStop(0, 'rgba(83, 175, 208, 0.18)');
        cursorGlow.addColorStop(0.5, 'rgba(0, 117, 162, 0.06)');
        cursorGlow.addColorStop(1, 'rgba(0, 117, 162, 0)');
        ctx.fillStyle = cursorGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Update nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        node.baseX += node.vx;
        node.baseY += node.vy;

        if (node.baseX < 0 || node.baseX > width) node.vx *= -1;
        if (node.baseY < 0 || node.baseY > height) node.vy *= -1;

        let targetX = node.baseX;
        let targetY = node.baseY;

        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - node.baseX;
          const dy = mouseRef.current.y - node.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_RADIUS && dist > 0) {
            const pullFactor = (1 - dist / MOUSE_RADIUS) * MAX_MOUSE_DRIFT;
            targetX = node.baseX + (dx / dist) * pullFactor;
            targetY = node.baseY + (dy / dist) * pullFactor;
          }
        }

        node.x += (targetX - node.x) * 0.08;
        node.y += (targetY - node.y) * 0.08;

        // Flickering dynamics
        if (frameCount > node.flickerDelay) {
          if (mode === 'flicker-out') {
            if (node.strobeCount < 16) {
              node.strobeCount++;
              node.brightness = node.strobeCount % 2 === 0 ? (Math.random() > 0.4 ? 1.0 : 0.1) : 0.0;
            } else {
              node.brightness = Math.max(node.brightness - 0.035, 0.0);
            }
          } else {
            // mode === 'flicker-in': Appear more gradually with soft ignition and steady ramp
            if (node.strobeCount === 0) {
              node.brightness = 0.18;
              node.shockwaveRadius = node.radius + 1;
              node.shockwaveAlpha = 0.45;
              node.strobeCount = 1;
            } else if (node.strobeCount < 8) {
              node.strobeCount++;
              node.brightness = Math.min(0.2 + (node.strobeCount / 8) * 0.4, 0.65);
            } else {
              node.brightness = Math.min(node.brightness + 0.012, 1.0);
            }
          }
        }

        // Expand shockwave
        if (node.shockwaveAlpha > 0.01) {
          node.shockwaveRadius += 1.4;
          node.shockwaveAlpha *= 0.93;
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.shockwaveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = '#67e8f9';
          ctx.globalAlpha = node.shockwaveAlpha;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }

        node.pulsePhase += 0.035;
      }

      // Fast connection drawing without per-frame sorts or costly shadowBlur
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (nodeA.brightness < 0.04) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          if (nodeB.brightness < 0.04) continue;

          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < MAX_DIST_SQ) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / MAX_DISTANCE;
            const alpha = factor * Math.min(nodeA.brightness, nodeB.brightness) * 1.2;

            if (alpha > 0.02) {
              ctx.beginPath();
              ctx.moveTo(nodeA.x, nodeA.y);
              ctx.lineTo(nodeB.x, nodeB.y);
              ctx.strokeStyle = '#38bdf8';
              ctx.globalAlpha = Math.min(alpha, 0.95);
              ctx.lineWidth = 1.8 + factor * 1.4;
              ctx.stroke();
            }
          }
        }
      }

      // Draw living nodes with bright luminous centers
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.brightness < 0.02) continue;

        const pulse = 1 + Math.sin(node.pulsePhase) * 0.15;

        ctx.save();
        // Node outer aura
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = node.colorHex;
        ctx.globalAlpha = node.brightness;
        ctx.fill();

        // White core
        ctx.beginPath();
        ctx.arc(node.x, node.y, (node.radius * 0.45) * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = Math.min(node.brightness * 1.1, 1.0);
        ctx.fill();

        // Active corona
        if (node.brightness > 0.65) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.radius + 3.5) * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.globalAlpha = (node.brightness - 0.65) * 0.7;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    if (isActive) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode, isActive, animationsEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        opacity: isActive ? 0.95 : 0,
        transition: mode === 'flicker-in'
          ? 'opacity 2.4s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'opacity 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    />
  );
};

export default NeuralNetworkBackground;
