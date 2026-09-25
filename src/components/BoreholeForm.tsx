import {
  BoreholeDraft,
  Issue,
  LITHOLOGY_SUGGESTIONS,
  LayerDraft,
  emptyLayerDraft,
  fmtDepth,
  layerTops,
} from "../types";

interface BoreholeFormProps {
  draft: BoreholeDraft;
  issues: Issue[];
  editingCode: string | null;
  onDraftChange: (draft: BoreholeDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function BoreholeForm({
  draft,
  issues,
  editingCode,
  onDraftChange,
  onSave,
  onCancel,
}: BoreholeFormProps) {
  const tops = layerTops(draft.layers);
  const issueFor = (field: string) => issues.find((i) => i.field === field)?.message ?? null;
  const layerIssues = (id: string) => issues.filter((i) => i.field.startsWith(`layer:${id}:`));

  const patch = (p: Partial<BoreholeDraft>) => onDraftChange({ ...draft, ...p });
  const patchLayer = (id: string, p: Partial<LayerDraft>) =>
    patch({ layers: draft.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const addLayer = () => patch({ layers: [...draft.layers, emptyLayerDraft()] });
  const removeLayer = (id: string) => patch({ layers: draft.layers.filter((l) => l.id !== id) });
  const removeIncomplete = () =>
    patch({
      layers: draft.layers.filter((l) => l.lithology.trim() !== "" && l.bottomDepth.trim() !== ""),
    });

  return (
    <div className="borehole-form">
      <div className="form-grid">
        <label className={issueFor("code") ? "invalid" : ""}>
          <span>钻孔编号 *</span>
          <input
            value={draft.code}
            placeholder="如 ZK-25"
            onChange={(e) => patch({ code: e.target.value })}
          />
          {issueFor("code") && <em className="field-error">{issueFor("code")}</em>}
        </label>
        <label className={issueFor("designDepth") ? "invalid" : ""}>
          <span>设计孔深（m）*</span>
          <input
            inputMode="decimal"
            value={draft.designDepth}
            placeholder="如 25.0"
            onChange={(e) => patch({ designDepth: e.target.value })}
          />
          {issueFor("designDepth") && <em className="field-error">{issueFor("designDepth")}</em>}
        </label>
        <label className={issueFor("waterLevel") ? "invalid" : ""}>
          <span>地下水位埋深（m）*</span>
          <input
            inputMode="decimal"
            value={draft.waterLevel}
            placeholder="如 3.4"
            onChange={(e) => patch({ waterLevel: e.target.value })}
          />
          {issueFor("waterLevel") && <em className="field-error">{issueFor("waterLevel")}</em>}
        </label>
      </div>

      <div className="layer-toolbar">
        <div>
          <h3>分层编录</h3>
          <p>按深度从浅到深添加，层顶自动接住上一层层底，末层层底不得越过设计孔深。</p>
        </div>
        <div className="layer-toolbar-actions">
          <button type="button" onClick={addLayer}>
            + 添加分层
          </button>
          <button type="button" onClick={removeIncomplete} disabled={draft.layers.length === 0}>
            移除未完成分层
          </button>
        </div>
      </div>

      {draft.layers.length === 0 ? (
        <p className="empty-tip">尚未添加分层，点击「+ 添加分层」开始编录；也可先保存钻孔稍后补录。</p>
      ) : (
        <div className="layer-list">
          {draft.layers.map((layer, index) => {
            const errs = layerIssues(layer.id);
            return (
              <div className={`layer-card ${errs.length ? "has-error" : ""}`} key={layer.id}>
                <div className="layer-head">
                  <strong>第 {index + 1} 层</strong>
                  <span className="layer-top">层顶 {fmtDepth(tops[index])}m（接上一层层底）</span>
                  <button type="button" className="link-danger" onClick={() => removeLayer(layer.id)}>
                    移除
                  </button>
                </div>
                <div className="layer-grid">
                  <label className={issueFor(`layer:${layer.id}:bottomDepth`) ? "invalid" : ""}>
                    <span>层底深度（m）*</span>
                    <input
                      inputMode="decimal"
                      value={layer.bottomDepth}
                      placeholder={`大于 ${fmtDepth(tops[index])}`}
                      onChange={(e) => patchLayer(layer.id, { bottomDepth: e.target.value })}
                    />
                  </label>
                  <label className={issueFor(`layer:${layer.id}:lithology`) ? "invalid" : ""}>
                    <span>岩性描述 *</span>
                    <input
                      list="lithology-options"
                      value={layer.lithology}
                      placeholder="如 粉质黏土"
                      onChange={(e) => patchLayer(layer.id, { lithology: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>土色</span>
                    <input
                      value={layer.soilColor}
                      placeholder="如 黄褐色"
                      onChange={(e) => patchLayer(layer.id, { soilColor: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>密实度 / 状态</span>
                    <input
                      value={layer.density}
                      placeholder="如 中密 / 可塑"
                      onChange={(e) => patchLayer(layer.id, { density: e.target.value })}
                    />
                  </label>
                  <label className={issueFor(`layer:${layer.id}:blowCount`) ? "invalid" : ""}>
                    <span>标贯击数</span>
                    <input
                      inputMode="numeric"
                      value={layer.blowCount}
                      placeholder="如 12"
                      onChange={(e) => patchLayer(layer.id, { blowCount: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>备注</span>
                    <input
                      value={layer.note}
                      placeholder="夹层、取样情况等"
                      onChange={(e) => patchLayer(layer.id, { note: e.target.value })}
                    />
                  </label>
                </div>
                {errs.length > 0 && (
                  <ul className="layer-errors">
                    {errs.map((e, k) => (
                      <li key={k}>{e.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <datalist id="lithology-options">
        {LITHOLOGY_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {issues.length > 0 && (
        <div className="form-errors" role="alert">
          <strong>保存前请修正以下 {issues.length} 条数据：</strong>
          <ul>
            {issues.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="primary-action" onClick={onSave}>
          {editingCode ? "保存修订" : "保存钻孔"}
        </button>
        <button type="button" onClick={onCancel}>
          {editingCode ? "取消修订" : "清空表单"}
        </button>
      </div>
    </div>
  );
}
