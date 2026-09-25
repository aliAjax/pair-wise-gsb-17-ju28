import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  Borehole,
  BoreholeDraft,
  Issue,
  LITHOLOGY_FILTERS,
  draftFromBorehole,
  emptyDraft,
  fmtDepth,
} from "./types";
import { loadBoreholes, saveBoreholes } from "./storage";
import { validateDraft } from "./validation";
import FilterPanel from "./components/FilterPanel";
import BoreholeForm from "./components/BoreholeForm";
import BoreholeList from "./components/BoreholeList";

const project = {
  id: "hxwl-03",
  port: 5103,
  title: "岩土钻孔编录",
  subtitle: "钻孔分层、标贯与地下水位的现场记录面板",
  users: ["岩土工程师", "现场编录员", "项目负责人"],
};

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [boreholes, setBoreholes] = useState<Borehole[]>(() => loadBoreholes());
  const [draft, setDraft] = useState<BoreholeDraft>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const formRef = useRef<HTMLElement>(null);

  useEffect(() => {
    saveBoreholes(boreholes);
  }, [boreholes]);

  const metrics = useMemo(() => {
    const layers = boreholes.flatMap((h) => h.layers);
    const blows = layers.map((l) => l.blowCount).filter((n): n is number => n !== null);
    const totalDepth = boreholes.reduce((sum, h) => sum + h.designDepth, 0);
    const minWater = boreholes.length ? Math.min(...boreholes.map((h) => h.waterLevel)) : null;
    return [
      { label: "累计孔深", value: boreholes.length ? `${fmtDepth(totalDepth)} m` : "—" },
      { label: "地层数量", value: String(layers.length) },
      { label: "最高标贯", value: blows.length ? `${Math.max(...blows)} 击` : "—" },
      { label: "地下水位", value: minWater !== null ? `最浅 ${fmtDepth(minWater)} m` : "—" },
    ];
  }, [boreholes]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const filter of LITHOLOGY_FILTERS) {
      counts[filter] = boreholes.filter((h) =>
        h.layers.some((l) => l.lithology.includes(filter))
      ).length;
    }
    return counts;
  }, [boreholes]);

  const visible = useMemo(
    () =>
      activeFilters.length === 0
        ? boreholes
        : boreholes.filter((h) =>
            h.layers.some((l) => activeFilters.some((f) => l.lithology.includes(f)))
          ),
    [boreholes, activeFilters]
  );

  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setIssues([]);
  };

  const handleDraftChange = (next: BoreholeDraft) => {
    setDraft(next);
    // 已有报错时随修改实时复验，让用户看到问题被逐条消除
    if (issues.length > 0) {
      setIssues(validateDraft(next, boreholes, editingId).issues);
    }
  };

  const handleSave = () => {
    const result = validateDraft(draft, boreholes, editingId);
    if (!result.borehole) {
      // 校验未通过：在保存处指出问题数据，表单内容原样保留
      setIssues(result.issues);
      return;
    }
    const saved = result.borehole;
    setBoreholes((prev) =>
      editingId ? prev.map((h) => (h.id === editingId ? saved : h)) : [saved, ...prev]
    );
    resetForm();
  };

  const handleEdit = (hole: Borehole) => {
    setEditingId(hole.id);
    setDraft(draftFromBorehole(hole));
    setIssues([]);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = (hole: Borehole) => {
    if (!window.confirm(`删除钻孔 ${hole.code} 及其 ${hole.layers.length} 条分层？`)) return;
    setBoreholes((prev) => prev.filter((h) => h.id !== hole.id));
    if (editingId === hole.id) resetForm();
  };

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), count: boreholes.length, boreholes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hxwl-03-钻孔编录-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFilter = (filter: string) =>
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );

  const editingCode = editingId
    ? boreholes.find((h) => h.id === editingId)?.code ?? null
    : null;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            {project.id} · port {project.port}
          </p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>当前台账</span>
          <strong>{boreholes.length} 个钻孔</strong>
          <span>数据保存在本浏览器，重新打开不丢失</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} index={index} />
        ))}
      </section>

      <section className="workspace">
        <FilterPanel
          users={project.users}
          filters={LITHOLOGY_FILTERS}
          active={activeFilters}
          counts={filterCounts}
          onToggle={toggleFilter}
          onClear={() => setActiveFilters([])}
        />

        <section className="panel" ref={formRef}>
          <div className="section-heading">
            <div>
              <p>岩土工程</p>
              <h2>{editingCode ? `修订钻孔 ${editingCode}` : "新建钻孔"}</h2>
            </div>
          </div>
          <BoreholeForm
            draft={draft}
            issues={issues}
            editingCode={editingCode}
            onDraftChange={handleDraftChange}
            onSave={handleSave}
            onCancel={resetForm}
          />
        </section>
      </section>

      <BoreholeList
        holes={visible}
        total={boreholes.length}
        editingId={editingId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
      />
    </main>
  );
}

export default App;
