import { Borehole, fmtDepth } from "../types";

interface BoreholeListProps {
  holes: Borehole[];
  total: number;
  editingId: string | null;
  onEdit: (hole: Borehole) => void;
  onDelete: (hole: Borehole) => void;
  onExport: () => void;
}

function holeStatus(hole: Borehole): { text: string; cls: string } {
  if (hole.layers.length === 0) return { text: "未分层", cls: "status-danger" };
  const deepest = hole.layers[hole.layers.length - 1].bottomDepth;
  return deepest >= hole.designDepth
    ? { text: "编录完成", cls: "status-ok" }
    : { text: "编录中", cls: "status-watch" };
}

export default function BoreholeList({
  holes,
  total,
  editingId,
  onEdit,
  onDelete,
  onExport,
}: BoreholeListProps) {
  return (
    <section className="records panel">
      <div className="section-heading">
        <div>
          <p>钻孔台账</p>
          <h2>钻孔记录（{holes.length === total ? total : `${holes.length} / ${total}`}）</h2>
        </div>
        <button type="button" onClick={onExport}>
          导出摘要
        </button>
      </div>
      {holes.length === 0 ? (
        <p className="empty-tip">
          {total === 0 ? "还没有钻孔记录，请先在上方新建钻孔。" : "当前岩性筛选下没有匹配的钻孔。"}
        </p>
      ) : (
        <div className="record-list">
          {holes.map((hole, index) => {
            const status = holeStatus(hole);
            const deepest = hole.layers.length
              ? hole.layers[hole.layers.length - 1].bottomDepth
              : 0;
            return (
              <article
                key={hole.id}
                className={`record-card ${editingId === hole.id ? "editing" : ""}`}
              >
                <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="record-body">
                  <div className="record-title">
                    <h3>{hole.code}</h3>
                    <span className={`status-chip ${status.cls}`}>{status.text}</span>
                  </div>
                  <p className="record-meta">
                    设计孔深 {fmtDepth(hole.designDepth)}m · 地下水位 {fmtDepth(hole.waterLevel)}m
                    · {hole.layers.length} 层 · 已编录至 {fmtDepth(deepest)}m
                  </p>
                  {hole.layers.length > 0 && (
                    <div className="layer-chips">
                      {hole.layers.map((layer) => (
                        <span key={layer.id}>
                          {fmtDepth(layer.topDepth)}–{fmtDepth(layer.bottomDepth)}m{" "}
                          {layer.lithology}
                          {layer.blowCount !== null ? ` · 标贯${layer.blowCount}击` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="record-time">
                    更新于 {new Date(hole.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="record-actions">
                  <button type="button" onClick={() => onEdit(hole)}>
                    修订
                  </button>
                  <button type="button" className="danger" onClick={() => onDelete(hole)}>
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
