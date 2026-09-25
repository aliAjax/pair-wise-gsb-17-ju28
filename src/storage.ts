import { Borehole, uid } from "./types";

const STORAGE_KEY = "hxwl-03:boreholes:v1";

/** 首次打开时的示例台账，之后完全以浏览器内保存的记录为准。 */
function seedBoreholes(): Borehole[] {
  const now = Date.now();
  return [
    {
      id: uid(),
      code: "ZK-18",
      designDepth: 22.6,
      waterLevel: 3.4,
      updatedAt: now - 1000 * 60 * 60 * 5,
      layers: [
        { id: uid(), topDepth: 0, bottomDepth: 8.2, lithology: "粉质黏土", soilColor: "黄褐", density: "可塑", blowCount: 12, note: "局部夹粉土薄层" },
        { id: uid(), topDepth: 8.2, bottomDepth: 15.0, lithology: "粉砂", soilColor: "灰", density: "中密", blowCount: 18, note: "饱和" },
        { id: uid(), topDepth: 15.0, bottomDepth: 22.6, lithology: "卵石", soilColor: "杂色", density: "密实", blowCount: 42, note: "粒径 2-8cm" },
      ],
    },
    {
      id: uid(),
      code: "ZK-21",
      designDepth: 31.2,
      waterLevel: 5.8,
      updatedAt: now - 1000 * 60 * 60 * 26,
      layers: [
        { id: uid(), topDepth: 0, bottomDepth: 4.0, lithology: "填土", soilColor: "杂", density: "松散", blowCount: null, note: "" },
        { id: uid(), topDepth: 4.0, bottomDepth: 12.5, lithology: "粉质黏土", soilColor: "褐黄", density: "可塑", blowCount: 9, note: "" },
        { id: uid(), topDepth: 12.5, bottomDepth: 31.2, lithology: "卵石", soilColor: "杂色", density: "稍密", blowCount: 25, note: "夹中粗砂，取样困难" },
      ],
    },
    {
      id: uid(),
      code: "ZK-24",
      designDepth: 18.4,
      waterLevel: 7.2,
      updatedAt: now - 1000 * 60 * 60 * 49,
      layers: [
        { id: uid(), topDepth: 0, bottomDepth: 3.0, lithology: "填土", soilColor: "杂", density: "松散", blowCount: null, note: "" },
        { id: uid(), topDepth: 3.0, bottomDepth: 9.6, lithology: "黏土", soilColor: "棕红", density: "硬塑", blowCount: 14, note: "" },
        { id: uid(), topDepth: 9.6, bottomDepth: 18.4, lithology: "强风化泥岩", soilColor: "紫红", density: "硬塑", blowCount: 38, note: "芯样完整率 62%" },
      ],
    },
  ];
}

export function loadBoreholes(): Borehole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seed = seedBoreholes();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedBoreholes();
    return parsed as Borehole[];
  } catch {
    return seedBoreholes();
  }
}

export function saveBoreholes(holes: Borehole[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holes));
  } catch {
    // 存储不可用时仅本次会话有效，不阻断编录
  }
}
