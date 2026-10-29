import type { ForwardRefExoticComponent, RefAttributes, CSSProperties } from 'react';

export interface BookPage { title: string; body: string }

export interface SophiaMetrics {
  gl: { renderer: string; vendor: string; software: boolean; version: string };
  timings: { downloadMs?: number; verifyMs?: number; decodeMs?: number; uploadMs?: number; firstFrameMs?: number; readyMs?: number };
  fps: { fps: number | null; avgMs: number | null; p95Ms: number | null; p99Ms: number | null };
  memory: { jsHeapMB: number | null; estGpuTotalMB: number | null; estGpuTexturesMB: number | null };
  renderer: { calls: number; triangles: number; textures: number; geometries: number };
  quality: { tier: string; level: number; pixelRatio?: number; dpr?: number; governor: boolean };
  model?: { bytes: number; sha256: string | null; integrityOk: boolean | null };
  idle?: boolean;
  [k: string]: unknown;
}

export interface SophiaPresentationHandle {
  pause(): void;
  resume(): void;
  resetCamera(): void;
  setEffects(on: boolean): void;
  openBook(): void;
  closeBook(): void;
  getMetrics(): SophiaMetrics | null;
  readonly engine: unknown;
}

export interface SophiaPresentationProps {
  /** URL do GLB original (use o arquivo byte a byte, sem recomprimir). */
  modelUrl: string;
  /** Máscara da constelação (PNG gerado por tools/build_constellation_mask.py). Padrão: embutida no módulo. */
  maskUrl?: string;
  /** Âncoras (JSON gerado pela ferramenta). Padrão: embutidas. */
  anchors?: unknown;
  /** Imagem exibida durante o carregamento e quando não há WebGL. */
  posterUrl?: string | null;
  /** Se informado, o módulo confere o SHA-256 do GLB antes de usá-lo. */
  expectedSha256?: string | null;
  expectedBytes?: number;
  bookPages?: BookPage[];
  labels?: Record<string, unknown>;
  quality?: 'auto' | 'high' | 'medium' | 'low';
  governor?: boolean;
  /** 'always' ou 'ctrl' (a roda só amplia com Ctrl; em artigos com rolagem). */
  wheelZoom?: 'always' | 'ctrl';
  enablePan?: boolean;
  /** 'auto' ativa a trava de rolagem em telas de toque. */
  touchGuard?: 'auto' | boolean;
  defaultPaused?: boolean;
  defaultEffects?: boolean;
  effectIntensity?: number;
  showControls?: boolean;
  showHotspots?: boolean;
  showStats?: boolean;
  debug?: boolean;
  continuous?: boolean;
  className?: string;
  style?: CSSProperties;
  onReady?(info: unknown): void;
  onMetrics?(m: SophiaMetrics): void;
  onError?(e: Error): void;
  onBookToggle?(open: boolean): void;
}

export const SophiaPresentation: ForwardRefExoticComponent<SophiaPresentationProps & RefAttributes<SophiaPresentationHandle>>;
export class SophiaEngine {
  constructor(container: HTMLElement, options?: Record<string, unknown>);
  /** Resolve `true` quando pronto, `false` se foi descartado antes; rejeita só em falha real. */
  start(): Promise<boolean>;
  dispose(): void;
  registerHotspot(el: HTMLElement, kind: 'book' | 'constellation', opts?: { focusFallback?: () => HTMLElement | null | undefined }): () => void;
  setSafeArea(area: { left?: number; right?: number; top?: number; bottom?: number }): void;
  [k: string]: any;
}
export const DEFAULT_LABELS: Record<string, any>;
export const DEFAULT_BOOK_PAGES: BookPage[];
export const ORIGINAL_GLB_SHA256: string;
export const ORIGINAL_GLB_BYTES: number;
