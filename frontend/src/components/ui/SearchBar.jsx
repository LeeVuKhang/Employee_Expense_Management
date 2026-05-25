export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  filterValue,
  onFilterChange,
  filterOptions = [],
  filterLabel = "Filter",
}) {
  const hasFilter = filterOptions.length > 0 && onFilterChange;

  return (
    <div className="search-card">
      <div className="search-control">
        <span className="search-input-label">Search</span>
        <input
          className="search-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
        />
        {value && (
          <button
            className="search-clear-button"
            onClick={() => onChange("")}
            type="button"
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {hasFilter && (
        <label className="search-filter">
          <span className="search-filter-label">{filterLabel}</span>
          <select
            className="search-filter-select"
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
