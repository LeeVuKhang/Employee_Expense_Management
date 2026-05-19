// components/ui/StatCard.jsx
// Generic summary stat card used in the dashboard header

export default function StatCard({ label, value, color, bg, labelColor }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        padding: "24px 24px",
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
          fontSize: 14,
          color: labelColor || "#6B7280",
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "-0.5px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
