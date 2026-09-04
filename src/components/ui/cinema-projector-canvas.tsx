import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_intensity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);

  vec2 projectorOrigin = vec2(0.85, 0.95);
  vec2 mouseOffset = (u_mouse - 0.5) * 0.12;
  projectorOrigin += mouseOffset;

  vec2 dir = (uv - projectorOrigin) * aspect;
  float dist = length(dir);
  float angle = atan(dir.y, dir.x);

  float beamAngle = -2.356;
  float spread = 0.65;
  float angleDiff = abs(mod(angle - beamAngle + 3.14159, 6.28318) - 3.14159);

  float cone = smoothstep(spread, 0.0, angleDiff);
  cone *= smoothstep(1.8, 0.05, dist);

  float rays = noise(vec2(angle * 14.0 + u_time * 0.15, dist * 2.0 - u_time * 0.08));
  rays += 0.5 * noise(vec2(angle * 32.0 - u_time * 0.25, dist * 5.0));
  cone *= (0.75 + 0.35 * rays);

  vec2 dustUv = uv * 35.0 + vec2(u_time * 0.25, sin(u_time * 0.2 + uv.x * 6.0) * 0.8);
  float dust = pow(noise(dustUv), 7.0) * 4.5;
  float dustMask = cone * smoothstep(0.05, 0.6, dist);

  vec3 beamColor = vec3(0.0, 0.94, 1.0);
  vec3 coreColor = vec3(0.9, 0.98, 1.0);
  vec3 finalColor = mix(beamColor, coreColor, clamp(cone * 1.4, 0.0, 1.0));

  float alpha = (cone * 0.22 + dust * dustMask * 0.45) * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface CinemaProjectorCanvasProps {
  active?: boolean;
  pulseTrigger?: string | number;
}

export function CinemaProjectorCanvas({
  active = true,
  pulseTrigger,
}: CinemaProjectorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const pulseRef = useRef(0);

  useEffect(() => {
    pulseRef.current = 1.0;
  }, [pulseTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });

    if (!gl) return;

    function createShader(glCtx: WebGLRenderingContext, type: number, src: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, src);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");

    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let animId = 0;
    let startTime = performance.now();

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / window.innerWidth;
      targetMouseY = 1.0 - e.clientY / window.innerHeight;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let isVisible = document.visibilityState === "visible";
    let currentBeamOpacity = activeRef.current ? 1.0 : 0.2;

    const startLoop = () => {
      if (!animId && isVisible) {
        animId = requestAnimationFrame(render);
      }
    };

    const stopLoop = () => {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const render = (now: number) => {
      if (!isVisible) {
        animId = 0;
        return;
      }

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const targetBeamOpacity = activeRef.current ? 1.0 : 0.25;
      currentBeamOpacity += (targetBeamOpacity - currentBeamOpacity) * 0.04;

      pulseRef.current = Math.max(0, pulseRef.current - 0.02);

      const isDark = document.documentElement.dataset.theme !== "light";
      const baseIntensity = isDark ? 1.0 : 0.45;
      const finalIntensity = baseIntensity * currentBeamOpacity * (1.0 + pulseRef.current * 0.6);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - startTime) * 0.001);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uIntensity, finalIntensity);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    };

    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(posBuf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="projector-canvas pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-75 mix-blend-screen"
    />
  );
}
