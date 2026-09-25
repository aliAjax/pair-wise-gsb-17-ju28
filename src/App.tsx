import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const STORAGE_KEY = "hxwl-03:boreholes:v1";

const LITHOLOGY_FILTERS = ["黏土", "粉砂", "卵石", "强风化"];
const EPS = 1e-9;

interface Layer {
  id: string;
  bottom: string;
  lithology: string;
  color: string;
  spt: string;
  note: string;
}

interface Borehole {
  id: string;
  code: string;
  designDepth: number;
  waterDepth: number | null;
  layers: Layer[];
  updatedAt: number;
}

interface BoreholeDraft {
  code: string;
  designDepth: string;
  waterDepth: string;
  layers: Layer[];
}

interface FieldErrors {
  code?: string;
  designDepth?: string;
  waterDepth?: string;
  layers?: Record<string, { bottom?: string; lithology?: string; spt?: string }>;
}

const project = {
  id: "hxwl-03",
  port: 5103,
  title: "岩土钻孔编录",
  subtitle: "钻孔分层、标贯与地下水位的现场记录面板",
  users: ["岩土工程师", "现场编录员", "项目负责人"],
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeLayer(partial: Partial<Layer> = {}): Layer {
  return {
    id: uid(),
    bottom: "",
    lithology: "",
    color: "",
    spt: "",
    note: "",
    ...partial,
  };
}

function seedBoreholes(): Borehole[] {
  return [
    {
      id: uid(),
      code: "ZK-18",
      designDepth: 22.6,
      waterDepth: 3.4,
      updatedAt: Date.now() - 1000 * 60 * 42,
      layers: [
        makeLayer({ bottom: "2.2", lithology: "黏土", color: "黄褐色", spt: "8", note: "可塑，干强度中等" }),
        makeLayer({ bottom: "6.8", lithology: "粉质黏土", color: "灰黄色", spt: "12", note: "中密，水位以下夹粉砂" }),
        makeLayer({ bottom: "15.4", lithology: "粉砂", color: "灰色", spt: "24", note: "稍密～中密，颗粒均匀" }),
        makeLayer({ bottom: "22.6", lithology: "卵石", color: "杂色", spt: "31", note: "中密，夹中粗砂，取样困难" }),
      ],
    },
    {
      id: uid(),
      code: "ZK-21",
      designDepth: 31.2,
      waterDepth: 5.1,
      updatedAt: Date.now() - 1000 * 60 * 28,
      layers: [
        makeLayer({ bottom: "3.0", lithology: "黏土", color: "褐黄色", spt: "9", note: "硬塑" }),
        makeLayer({ bottom: "9.6", lithology: "粉砂", color: "青灰色", spt: "17", note: "稍密，含云母" }),
        makeLayer({ bottom: "18.8", lithology: "卵石", color: "杂色", spt: "", note: "中密，钻进进尺较慢，继续钻进中" }),
      ],
    },
    {
      id: uid(),
      code: "ZK-24",
      designDepth: 18.4,
      waterDepth: 4.2,
      updatedAt: Date.now() - 1000 * 60 * 9,
      layers: [
        makeLayer({ bottom: "1.6", lithology: "黏土", color: "红褐色", spt: "11", note: "可塑～硬塑" }),
        makeLayer({ bottom: "18.4", lithology: "强风化泥岩", color: "棕红色", spt: "", note: "芯样完整率62%" }),
      ],
    },
  ];
}

function loadBoreholes(): Borehole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = seedBoreholes();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Borehole =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Borehole).id === "string" &&
        typeof (item as Borehole).code === "string" &&
        typeof (item as Borehole).designDepth === "number",
    );
  } catch {
    return [];
  }
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatDepth(value: number | null): string {
  if (value === null) return "未量测";
  return `${Number.isInteger(value) ? value.toFixed(1) : String(value)}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isComplete(borehole: Borehole): boolean {
  const last = borehole.layers[borehole.layers.length - 1];
  return last !== undefined && Number(last.bottom) === borehole.designDepth;
}

export function emptyDraft(): BoreholeDraft {
  return { code: "", designDepth: "", waterDepth: "", layers: [makeLayer()] };
}

function draftFromBorehole(borehole: Borehole): BoreholeDraft {
  return {
    code: borehole.code,
    designDepth: String(borehole.designDepth),
    waterDepth: borehole.waterDepth === null ? "" : String(borehole.waterDepth),
    layers: borehole.layers.map((layer) => ({ ...layer })),
  };
}

function layerTopAt(layers: Layer[], index: number): number | null {
  if (index === 0) return 0;
  return parseNumber(layers[index - 1].bottom);
}

export function validateDraft(draft: BoreholeDraft, selfId: string | null, boreholes: Borehole[]): FieldErrors {
  const errors: FieldErrors = { layers: {} };
  const layerErrors = errors.layers!;

  const code = draft.code.trim();
  if (!code) {
    errors.code = "请填写钻孔编号";
  } else if (
    boreholes.some((b) => b.id !== selfId && b.code.trim().toLowerCase() === code.toLowerCase())
  ) {
    errors.code = `编号 ${code} 已存在，请使用其他编号`;
  }

  const depth = parseNumber(draft.designDepth);
  if (depth === null) {
    errors.designDepth = "请填写设计孔深";
  } else if (depth <= 0) {
    errors.designDepth = "设计孔深必须大于 0";
  }

  const water = parseNumber(draft.waterDepth);
  if (draft.waterDepth.trim() !== "" && water === null) {
    errors.waterDepth = "地下水位需填写数字";
  } else if (water !== null && water < 0) {
    errors.waterDepth = "地下水位埋深不能为负";
  } else if (water !== null && depth !== null && water > depth + EPS) {
    errors.waterDepth = `地下水位 ${water}m 与孔深冲突：超过设计孔深 ${depth}m`;
  }

  // 沿自地表连续的有效层链求已编录深度，遇断点即停止
  let chainedBottom = 0;
  let chainBroken = false;
  draft.layers.forEach((layer, index) => {
    const layerError: { bottom?: string; lithology?: string; spt?: string } = {};
    const top = layerTopAt(draft.layers, index);
    const bottom = parseNumber(layer.bottom);

    if (layer.bottom.trim() === "") {
      layerError.bottom = "请填写层底深度";
    } else if (bottom === null) {
      layerError.bottom = "层底深度需填写数字";
    } else {
      if (top === null) {
        layerError.bottom = `上一层（第 ${index} 层）层底未填，本层层顶无法接续`;
      } else if (bottom <= top) {
        layerError.bottom = `层底深度需大于本层层顶 ${top}m（当前 ${bottom}m）`;
      }
      if (depth !== null && bottom > depth + EPS) {
        layerError.bottom = `末层深度 ${bottom}m 越过设计孔深 ${depth}m，请加深孔深或修改层底`;
      }
    }

    if (!layer.lithology.trim()) {
      layerError.lithology = "请填写岩性描述";
    }

    if (layer.spt.trim() !== "") {
      const n = Number(layer.spt);
      if (!Number.isInteger(n) || n < 0) {
        layerError.spt = "标贯击数需为非负整数";
      }
    }

    if (layerError.bottom || layerError.lithology || layerError.spt) {
      layerErrors[layer.id] = layerError;
    }
    if (
      !chainBroken &&
      !layerError.bottom &&
      top !== null &&
      bottom !== null &&
      bottom > top
    ) {
      chainedBottom = bottom;
    } else if (!chainBroken && layerError.bottom) {
      chainBroken = true;
    }
  });

  // 水位与分层深度冲突：水位不能落在尚未编录的井段
  if (!errors.waterDepth && water !== null) {
    const lastBottom = chainedBottom > 0 ? chainedBottom : null;
    if (lastBottom === null) {
      errors.waterDepth = `地下水位 ${water}m 与分层深度冲突：尚无有效分层深度，请先补齐分层`;
    } else if (water > lastBottom + EPS) {
      errors.waterDepth = `地下水位 ${water}m 与分层深度冲突：分层只编录到 ${lastBottom}m，水位不能位于未编录井段`;
      const lastLayer = draft.layers[draft.layers.length - 1];
      const existing = layerErrors[lastLayer.id] ?? {};
      if (!existing.bottom) {
        existing.bottom = `水位冲突：本层为当前末层（层底 ${lastBottom}m），地下水位 ${water}m 已超出该深度，请继续补分层或修订水位`;
        layerErrors[lastLayer.id] = existing;
      }
    }
  }

  if (Object.keys(layerErrors).length === 0) {
    delete errors.layers;
  }
  return errors;
}

function hasAnyError(errors: FieldErrors): boolean {
  return (
    !!errors.code ||
    !!errors.designDepth ||
    !!errors.waterDepth ||
    (!!errors.layers && Object.keys(errors.layers).length > 0)
  );
}

function flattenErrors(errors: FieldErrors): string[] {
  return [
    errors.code,
    errors.designDepth,
    errors.waterDepth,
    ...(errors.layers
      ? Object.values(errors.layers).flatMap((e) => [e.bottom, e.lithology, e.spt])
      : []),
  ].filter((v): v is string => !!v);
}

const statusColors = ["status-ok", "status-watch", "status-danger", "status-ok"];

function MetricCard({ label, value, hint, index }: { label: string; value: string; hint: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [boreholes, setBoreholes] = useState<Borehole[]>(() => loadBoreholes());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BoreholeDraft | null>(null);
  const [errors, setErrors] = useState<FieldErrors | null>(null);
  const [hint, setHint] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boreholes));
    } catch {
      /* 浏览器存储不可用时仅保留在内存中 */
    }
  }, [boreholes]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const metrics = useMemo(() => {
    const totalDepth = boreholes.reduce((sum, b) => sum + b.designDepth, 0);
    const layerCount = boreholes.reduce((sum, b) => sum + b.layers.length, 0);
    let maxSpt: number | null = null;
    boreholes.forEach((b) =>
      b.layers.forEach((layer) => {
        const n = Number(layer.spt);
        if (Number.isInteger(n) && n >= 0 && (maxSpt === null || n > maxSpt)) {
          maxSpt = n;
        }
      }),
    );
    const waters = boreholes.map((b) => b.waterDepth).filter((v): v is number => v !== null);
    const shallowest = waters.length ? Math.min(...waters) : null;
    return { totalDepth, layerCount, maxSpt, shallowest };
  }, [boreholes]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    LITHOLOGY_FILTERS.forEach((keyword) => {
      counts[keyword] = boreholes.filter((b) => b.layers.some((l) => l.lithology.includes(keyword))).length;
    });
    return counts;
  }, [boreholes]);

  const filteredBoreholes = useMemo(() => {
    const list = [...boreholes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (activeFilters.length === 0) return list;
    return list.filter((b) =>
      activeFilters.some((keyword) => b.layers.some((l) => l.lithology.includes(keyword))),
    );
  }, [boreholes, activeFilters]);

  const completedCount = useMemo(() => boreholes.filter(isComplete).length, [boreholes]);

  function resetFeedback() {
    setErrors(null);
    setHint("");
  }

  function openNew() {
    setEditingId(null);
    setDraft(emptyDraft());
    resetFeedback();
  }

  function openEdit(borehole: Borehole) {
    setEditingId(borehole.id);
    setDraft(draftFromBorehole(borehole));
    resetFeedback();
  }

  function cancelForm() {
    setDraft(null);
    setEditingId(null);
    resetFeedback();
  }

  function patchDraft(patch: Partial<BoreholeDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    resetFeedback();
  }

  function patchLayer(layerId: string, patch: Partial<Layer>) {
    setDraft((prev) =>
      prev
        ? { ...prev, layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) }
        : prev,
    );
    resetFeedback();
  }

  function addLayer() {
    if (!draft) return;
    const last = draft.layers[draft.layers.length - 1];
    const lastBottom = last ? parseNumber(last.bottom) : null;
    if (lastBottom === null) {
      setHint("请先把最后一层的层底深度填写为有效数字，才能在其下方接续新层");
      return;
    }
    setDraft({ ...draft, layers: [...draft.layers, makeLayer()] });
    setErrors(null);
    setHint("");
  }

  function removeLayer(layerId: string) {
    if (!draft) return;
    if (draft.layers.length === 1) {
      setDraft({ ...draft, layers: [makeLayer()] });
    } else {
      setDraft({ ...draft, layers: draft.layers.filter((l) => l.id !== layerId) });
    }
    resetFeedback();
  }

  function saveDraft() {
    if (!draft) return;
    const result = validateDraft(draft, editingId, boreholes);
    if (hasAnyError(result)) {
      // 在保存处指出哪条数据有问题，表单原样保留
      setErrors(result);
      setHint("");
      return;
    }

    const waterRaw = draft.waterDepth.trim();
    const depth = parseNumber(draft.designDepth)!;
    const saved: Borehole = {
      id: editingId ?? uid(),
      code: draft.code.trim(),
      designDepth: depth,
      waterDepth: waterRaw === "" ? null : parseNumber(waterRaw),
      layers: draft.layers.map((l) => ({
        id: l.id,
        bottom: String(parseNumber(l.bottom)),
        lithology: l.lithology.trim(),
        color: l.color.trim(),
        spt: l.spt.trim(),
        note: l.note.trim(),
      })),
      updatedAt: Date.now(),
    };

    setBoreholes((prev) => {
      if (editingId) return prev.map((b) => (b.id === editingId ? saved : b));
      return [...prev, saved];
    });
    const reached = Number(saved.layers[saved.layers.length - 1].bottom);
    setNotice(
      (editingId ? `钻孔 ${saved.code} 的修订已保存` : `钻孔 ${saved.code} 已建立`) +
        (reached < depth ? "（分层未到底，标记为未完成）" : ""),
    );
    setDraft(null);
    setEditingId(null);
    resetFeedback();
  }

  function removeBorehole(borehole: Borehole) {
    if (!window.confirm(`确定移除钻孔 ${borehole.code} 的全部编录记录？此操作不可恢复。`)) return;
    setBoreholes((prev) => prev.filter((b) => b.id !== borehole.id));
    if (editingId === borehole.id) cancelForm();
    setNotice(`钻孔 ${borehole.code} 已移除`);
  }

  function toggleFilter(keyword: string) {
    setActiveFilters((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword],
    );
  }

  const editingBorehole = editingId ? boreholes.find((b) => b.id === editingId) : null;
  const flatErrors = errors ? flattenErrors(errors) : [];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · 端口 {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>现场角色</span>
          <strong>{project.users.join(" / ")}</strong>
          <span>记录保存在本机浏览器（localStorage），重新打开仍可找到</span>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="累计孔深"
          value={`${metrics.totalDepth.toFixed(1)}m`}
          hint={`${boreholes.length} 个钻孔合计`}
          index={0}
        />
        <MetricCard label="地层数量" value={String(metrics.layerCount)} hint="全部钻孔分层合计" index={1} />
        <MetricCard
          label="最高标贯"
          value={metrics.maxSpt === null ? "—" : `${metrics.maxSpt}击`}
          hint="分层标贯击数最大值"
          index={2}
        />
        <MetricCard
          label="地下水位"
          value={formatDepth(metrics.shallowest)}
          hint="已量测钻孔的最浅水位"
          index={3}
        />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>岩性筛选</h2>
          <div className="chips filter-chips">
            {LITHOLOGY_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilters.includes(filter) ? "chip-active" : ""}
                onClick={() => toggleFilter(filter)}
              >
                {filter}
                <em>{filterCounts[filter]}</em>
              </button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <button type="button" className="clear-filter" onClick={() => setActiveFilters([])}>
              清除筛选（当前 {filteredBoreholes.length}/{boreholes.length} 孔）
            </button>
          )}
          <p className="side-note">勾选后，右侧钻孔列表同步收窄为含该岩性分层的钻孔；多选为“任一匹配”。</p>

          <h2>完成情况</h2>
          <ul className="side-stats">
            <li>
              <span>已完成（分层到底）</span>
              <strong>{completedCount}</strong>
            </li>
            <li>
              <span>未完成（分层未到底）</span>
              <strong>{boreholes.length - completedCount}</strong>
            </li>
          </ul>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>{draft ? (editingId ? "修订钻孔" : "新建钻孔") : "编录面板"}</p>
              <h2>
                {draft ? (editingId ? `修订 · ${editingBorehole?.code ?? ""}` : "新建钻孔编录") : "钻孔记录"}
              </h2>
            </div>
            {!draft && (
              <button type="button" className="primary-action" onClick={openNew}>
                ＋ 新建钻孔
              </button>
            )}
          </div>

          {!draft && (
            <div className="record-list">
              {boreholes.length === 0 && (
                <div className="empty-tip">还没有钻孔记录，点击右上角「新建钻孔」开始编录。</div>
              )}
              {boreholes.length > 0 && filteredBoreholes.length === 0 && (
                <div className="empty-tip">当前岩性筛选下没有匹配的钻孔，可在左侧清除筛选。</div>
              )}
              {filteredBoreholes.map((borehole) => {
                const complete = isComplete(borehole);
                const reached = borehole.layers.length
                  ? Number(borehole.layers[borehole.layers.length - 1].bottom)
                  : 0;
                return (
                  <article key={borehole.id} className={`record-card ${complete ? "" : "record-open"}`}>
                    <div className="record-index">
                      {borehole.code.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || "ZK"}
                    </div>
                    <div className="record-main">
                      <div className="record-title">
                        <h3>{borehole.code}</h3>
                        <span className={`badge ${complete ? "badge-ok" : "badge-warn"}`}>
                          {complete ? "已完成" : "未完成"}
                        </span>
                      </div>
                      <p>
                        设计孔深 {borehole.designDepth}m · 地下水位 {formatDepth(borehole.waterDepth)} ·{" "}
                        {borehole.layers.length} 个分层
                        {!complete && `（已编录至 ${reached}m）`} · 更新于 {formatTime(borehole.updatedAt)}
                      </p>
                      <ol className="layer-strip">
                        {borehole.layers.map((layer, index) => {
                          const top = index === 0 ? 0 : Number(borehole.layers[index - 1].bottom);
                          const bottom = Number(layer.bottom);
                          return (
                            <li key={layer.id}>
                              <strong>{layer.lithology}</strong>
                              <span>
                                {top}～{layer.bottom}m
                              </span>
                              {layer.spt !== "" && <em> 标贯{layer.spt}击</em>}
                              {borehole.waterDepth !== null &&
                                borehole.waterDepth > top &&
                                borehole.waterDepth <= bottom && <i className="water-mark">水位</i>}
                            </li>
                          );
                        })}
                      </ol>
                      <div className="record-actions">
                        <button type="button" onClick={() => openEdit(borehole)}>
                          修订
                        </button>
                        <button type="button" className="danger-button" onClick={() => removeBorehole(borehole)}>
                          移除
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {draft && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveDraft();
              }}
            >
              <div className="field-grid">
                <label className={errors?.code ? "field-error" : ""}>
                  <span>钻孔编号 *</span>
                  <input
                    value={draft.code}
                    placeholder="如 ZK-25"
                    onChange={(e) => patchDraft({ code: e.target.value })}
                  />
                </label>
                <label className={errors?.designDepth ? "field-error" : ""}>
                  <span>设计孔深 (m) *</span>
                  <input
                    inputMode="decimal"
                    value={draft.designDepth}
                    placeholder="如 20.0"
                    onChange={(e) => patchDraft({ designDepth: e.target.value })}
                  />
                </label>
                <label className={errors?.waterDepth ? "field-error" : ""}>
                  <span>地下水位埋深 (m)，未量测可留空</span>
                  <input
                    inputMode="decimal"
                    value={draft.waterDepth}
                    placeholder="如 3.4"
                    onChange={(e) => patchDraft({ waterDepth: e.target.value })}
                  />
                </label>
              </div>

              <div className="layer-editor-head">
                <h3>分层编录（按深度由浅到深）</h3>
                <button type="button" onClick={addLayer}>
                  ＋ 向下添加一层
                </button>
              </div>
              <p className="form-hint">
                每层只需填写层底深度：本层层顶自动接住上一层层底（第 1 层自 0m 起）；末层深度不能越过设计孔深。
              </p>

              <div className="layer-editor-list">
                {draft.layers.map((layer, index) => {
                  const top = layerTopAt(draft.layers, index);
                  const layerError = errors?.layers?.[layer.id];
                  const water = parseNumber(draft.waterDepth);
                  const bottom = parseNumber(layer.bottom);
                  const waterInLayer =
                    water !== null &&
                    top !== null &&
                    bottom !== null &&
                    !errors?.waterDepth &&
                    water > top &&
                    water <= bottom;
                  return (
                    <fieldset
                      key={layer.id}
                      className={`layer-row ${layerError ? "layer-row-error" : ""} ${
                        waterInLayer ? "layer-water" : ""
                      }`}
                    >
                      <legend>
                        第 {index + 1} 层 · 层顶 {top === null ? "待上层层底" : `${top}m`}
                      </legend>
                      <div className="layer-fields">
                        <label className={layerError?.bottom ? "field-error" : ""}>
                          <span>层底深度 (m) *</span>
                          <input
                            inputMode="decimal"
                            value={layer.bottom}
                            placeholder={`须大于 ${top === null ? "上层层底" : top}m`}
                            onChange={(e) => patchLayer(layer.id, { bottom: e.target.value })}
                          />
                        </label>
                        <label className={layerError?.lithology ? "field-error" : ""}>
                          <span>岩性描述 *</span>
                          <input
                            list="lithology-options"
                            value={layer.lithology}
                            placeholder="如 粉质黏土 / 卵石 / 强风化泥岩"
                            onChange={(e) => patchLayer(layer.id, { lithology: e.target.value })}
                          />
                        </label>
                        <label>
                          <span>土色</span>
                          <input
                            value={layer.color}
                            placeholder="如 灰黄色"
                            onChange={(e) => patchLayer(layer.id, { color: e.target.value })}
                          />
                        </label>
                        <label className={layerError?.spt ? "field-error" : ""}>
                          <span>标贯击数</span>
                          <input
                            inputMode="numeric"
                            value={layer.spt}
                            placeholder="非负整数，可留空"
                            onChange={(e) => patchLayer(layer.id, { spt: e.target.value })}
                          />
                        </label>
                        <label className="layer-note">
                          <span>备注</span>
                          <input
                            value={layer.note}
                            placeholder="密实度、夹杂物、取芯情况等"
                            onChange={(e) => patchLayer(layer.id, { note: e.target.value })}
                          />
                        </label>
                        <button
                          type="button"
                          className="layer-remove"
                          title="移除该分层"
                          onClick={() => removeLayer(layer.id)}
                        >
                          移除分层
                        </button>
                      </div>
                      {waterInLayer && <p className="water-inline">地下水位 {water}m 位于本层</p>}
                    </fieldset>
                  );
                })}
              </div>
              <datalist id="lithology-options">
                {LITHOLOGY_FILTERS.map((name) => (
                  <option key={name} value={name} />
                ))}
                <option value="粉质黏土" />
                <option value="强风化泥岩" />
              </datalist>

              {flatErrors.length > 0 && (
                <div className="save-issues save-issues-error" role="alert">
                  <p className="issues-title">保存失败：以下数据有问题，请按条修订后重新保存（表单已保留）</p>
                  <ul>
                    {flatErrors.map((message) => (
                      <li key={message}>✕ {message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hint && (
                <div className="save-issues save-issues-warn" role="status">
                  <p className="issues-title">⚠ {hint}</p>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="primary-action">
                  {editingId ? "保存修订" : "保存钻孔"}
                </button>
                <button type="button" onClick={cancelForm}>
                  放弃
                </button>
                <span className="save-hint">校验未通过时表单会保留，并在本处指出具体问题数据。</span>
              </div>
            </form>
          )}
        </section>
      </section>

      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

export default App;
