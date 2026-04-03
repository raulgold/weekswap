import type { ComponentType } from "react";
import { Star } from "lucide-react";
import { C, S } from "../uiStyles";

export function StarRating({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          fill={i < n ? C.gold : "transparent"}
          color={i < n ? C.gold : C.subtle}
        />
      ))}
    </div>
  );
}

export function Badge({
  label,
  color = C.accent,
  bg,
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      style={{
        ...S.badge,
        color,
        background: bg || color + "22",
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

export function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color = C.gold,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ ...S.card, display: "flex", gap: 16, alignItems: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color + "22",
          border: `1px solid ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}
