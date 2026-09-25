interface FilterPanelProps {
  users: string[];
  filters: string[];
  active: string[];
  counts: Record<string, number>;
  onToggle: (filter: string) => void;
  onClear: () => void;
}

export default function FilterPanel({
  users,
  filters,
  active,
  counts,
  onToggle,
  onClear,
}: FilterPanelProps) {
  return (
    <aside className="panel narrow">
      <h2>角色</h2>
      <div className="chips">
        {users.map((user) => (
          <span key={user}>{user}</span>
        ))}
      </div>
      <h2>岩性筛选</h2>
      <div className="chips muted">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={active.includes(filter) ? "active" : ""}
            onClick={() => onToggle(filter)}
          >
            {filter}
            <span className="chip-count">{counts[filter] ?? 0}</span>
          </button>
        ))}
      </div>
      {active.length > 0 ? (
        <button type="button" className="clear-filter" onClick={onClear}>
          清除筛选（{active.join("、")}）
        </button>
      ) : (
        <p className="filter-note">点击岩性可同步收窄钻孔列表</p>
      )}
    </aside>
  );
}
