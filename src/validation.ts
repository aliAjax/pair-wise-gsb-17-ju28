import { Borehole, BoreholeDraft, Issue, Layer, uid } from "./types";

export interface ValidationResult {
  issues: Issue[];
  borehole: Borehole | null;
}

function parseNum(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * 校验编录表单。任何一条数据有问题都返回带定位的 Issue，
 * 由表单在保存处逐条指出并保留已填内容。
 */
export function validateDraft(
  draft: BoreholeDraft,
  existing: Borehole[],
  editingId: string | null
): ValidationResult {
  const issues: Issue[] = [];

  const code = draft.code.trim();
  if (!code) {
    issues.push({ field: "code", message: "钻孔编号不能为空" });
  } else if (existing.some((h) => h.code === code && h.id !== editingId)) {
    issues.push({ field: "code", message: `钻孔编号「${code}」已存在，可改为修订该孔` });
  }

  const designDepth = parseNum(draft.designDepth);
  if (designDepth === null || designDepth <= 0) {
    issues.push({ field: "designDepth", message: "设计孔深需为大于 0 的数值（m）" });
  }

  const waterLevel = parseNum(draft.waterLevel);
  if (waterLevel === null || waterLevel < 0) {
    issues.push({ field: "waterLevel", message: "地下水位需为不小于 0 的数值（埋深，m）" });
  } else if (designDepth !== null && designDepth > 0 && waterLevel > designDepth) {
    issues.push({
      field: "waterLevel",
      message: `地下水位 ${waterLevel}m 深于设计孔深 ${designDepth}m，两者冲突`,
    });
  }

  const layers: Layer[] = [];
  let top = 0;
  draft.layers.forEach((ld, index) => {
    const label = `第 ${index + 1} 层`;
    const bottom = parseNum(ld.bottomDepth);
    if (bottom === null) {
      issues.push({
        field: `layer:${ld.id}:bottomDepth`,
        message: `${label}：层底深度未填写或不是数值`,
      });
    } else if (bottom <= top) {
      issues.push({
        field: `layer:${ld.id}:bottomDepth`,
        message: `${label}：层底 ${bottom}m 未大于层顶 ${top}m，分层须由浅到深`,
      });
    }
    if (!ld.lithology.trim()) {
      issues.push({ field: `layer:${ld.id}:lithology`, message: `${label}：岩性描述未填写` });
    }
    let blowCount: number | null = null;
    if (ld.blowCount.trim() !== "") {
      const n = parseNum(ld.blowCount);
      if (n === null || n < 0) {
        issues.push({
          field: `layer:${ld.id}:blowCount`,
          message: `${label}：标贯击数需为不小于 0 的数值`,
        });
      } else {
        blowCount = n;
      }
    }
    const validBottom = bottom !== null && bottom > top;
    layers.push({
      id: ld.id,
      topDepth: top,
      bottomDepth: validBottom ? bottom : top,
      lithology: ld.lithology.trim(),
      soilColor: ld.soilColor.trim(),
      density: ld.density.trim(),
      blowCount,
      note: ld.note.trim(),
    });
    if (validBottom) top = bottom;
  });

  if (layers.length > 0 && designDepth !== null && designDepth > 0) {
    const last = layers[layers.length - 1];
    if (last.bottomDepth > designDepth) {
      issues.push({
        field: `layer:${last.id}:bottomDepth`,
        message: `末层（第 ${layers.length} 层）层底 ${last.bottomDepth}m 越过设计孔深 ${designDepth}m`,
      });
    }
  }

  if (layers.length > 0 && waterLevel !== null && waterLevel >= 0) {
    const deepest = layers[layers.length - 1].bottomDepth;
    if (waterLevel > deepest) {
      issues.push({
        field: "waterLevel",
        message: `地下水位 ${waterLevel}m 深于末层层底 ${deepest}m，与分层深度冲突，请核对水位或补充分层`,
      });
    }
  }

  if (issues.length > 0) {
    return { issues, borehole: null };
  }

  return {
    issues,
    borehole: {
      id: editingId ?? uid(),
      code,
      designDepth: designDepth as number,
      waterLevel: waterLevel as number,
      layers,
      updatedAt: Date.now(),
    },
  };
}
