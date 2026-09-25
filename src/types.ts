export interface Layer {
  id: string;
  topDepth: number;
  bottomDepth: number;
  lithology: string;
  soilColor: string;
  density: string;
  blowCount: number | null;
  note: string;
}

export interface Borehole {
  id: string;
  code: string;
  designDepth: number;
  waterLevel: number;
  layers: Layer[];
  updatedAt: number;
}

export interface LayerDraft {
  id: string;
  bottomDepth: string;
  lithology: string;
  soilColor: string;
  density: string;
  blowCount: string;
  note: string;
}

export interface BoreholeDraft {
  code: string;
  designDepth: string;
  waterLevel: string;
  layers: LayerDraft[];
}

export interface Issue {
  field: string;
  message: string;
}

export const LITHOLOGY_FILTERS = ["黏土", "粉砂", "卵石", "强风化"];

export const LITHOLOGY_SUGGESTIONS = [
  "填土",
  "黏土",
  "粉质黏土",
  "淤泥质土",
  "粉砂",
  "细砂",
  "中粗砂",
  "卵石",
  "强风化泥岩",
  "中风化岩",
];

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyLayerDraft(): LayerDraft {
  return {
    id: uid(),
    bottomDepth: "",
    lithology: "",
    soilColor: "",
    density: "",
    blowCount: "",
    note: "",
  };
}

export function emptyDraft(): BoreholeDraft {
  return { code: "", designDepth: "", waterLevel: "", layers: [] };
}

export function draftFromBorehole(hole: Borehole): BoreholeDraft {
  return {
    code: hole.code,
    designDepth: String(hole.designDepth),
    waterLevel: String(hole.waterLevel),
    layers: hole.layers.map((layer) => ({
      id: layer.id,
      bottomDepth: String(layer.bottomDepth),
      lithology: layer.lithology,
      soilColor: layer.soilColor,
      density: layer.density,
      blowCount: layer.blowCount === null ? "" : String(layer.blowCount),
      note: layer.note,
    })),
  };
}

/** 层顶依次接住上一层层底；上一层底无效时沿用其层顶，保证链条不断。 */
export function layerTops(layers: LayerDraft[]): number[] {
  const tops: number[] = [];
  let top = 0;
  for (const layer of layers) {
    tops.push(top);
    const bottom = Number(layer.bottomDepth.trim());
    if (layer.bottomDepth.trim() !== "" && Number.isFinite(bottom) && bottom > top) {
      top = bottom;
    }
  }
  return tops;
}

export function fmtDepth(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
