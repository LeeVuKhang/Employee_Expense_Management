// components/ui/StatCard.jsx
// Generic summary stat card used in the dashboard header

export default function StatCard({ label, value, color, bg }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        padding: "16px 20px",
        borderRadius: 12,
        backgroundColor: bg,
        border: `1px solid ${color}33`,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#6B7280",
          marginTop: 3,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
