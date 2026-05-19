// components/ui/SearchBar.jsx
// Reusable search input with clear button

export default function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        padding: "10px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onFocusCapture={(e) => {
        e.currentTarget.style.borderColor = "#93C5FD";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
      }}
      onBlurCapture={(e) => {
        e.currentTarget.style.borderColor = "#E5E7EB";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
      }}
    >
      <span style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 1 }}>🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          fontSize: 14,
          color: "#374151",
          backgroundColor: "transparent",
          fontFamily: "inherit",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#9CA3AF",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
