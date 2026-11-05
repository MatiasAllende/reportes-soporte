"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekSnapshot } from "@/lib/types";

export function TechniciansChart({
  week,
  names,
}: {
  week: WeekSnapshot;
  names: Record<string, string>;
}) {
  const data = week.byTechnician.map((row) => ({
    name: (names[row.id] ?? row.id).split(" ")[0],
    Resueltos: row.resolved,
    Abiertos: row.open,
  }));

  return (
    <div className="animate-rise delay-2 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={6} barCategoryGap="28%">
          <CartesianGrid stroke="rgba(10,10,10,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#1a1a1a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#1a1a1a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(22,163,74,0.08)" }}
            contentStyle={{
              border: "1px solid rgba(10,10,10,0.12)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
          <Legend />
          <Bar dataKey="Resueltos" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Abiertos" fill="#111111" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
