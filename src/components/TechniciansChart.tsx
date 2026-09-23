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
import { technicianName } from "@/lib/data";
import type { WeekSnapshot } from "@/lib/types";

export function TechniciansChart({ week }: { week: WeekSnapshot }) {
  const data = week.byTechnician.map((row) => ({
    name: technicianName(row.id).split(" ")[0],
    Resueltos: row.resolved,
    Abiertos: row.open,
  }));

  return (
    <div className="animate-rise delay-2 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={6} barCategoryGap="28%">
          <CartesianGrid stroke="rgba(12,27,42,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#243447", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#243447", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,118,110,0.06)" }}
            contentStyle={{
              border: "1px solid rgba(12,27,42,0.1)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
          <Legend />
          <Bar dataKey="Resueltos" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Abiertos" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
