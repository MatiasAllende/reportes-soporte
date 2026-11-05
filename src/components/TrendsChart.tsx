"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekSnapshot } from "@/lib/types";

export function TrendsChart({ weeks }: { weeks: WeekSnapshot[] }) {
  const data = weeks.map((week) => ({
    name: week.id.replace(/^\d{4}-/, ""),
    Creados: week.created,
    Resueltos: week.resolved,
    Backlog: week.open,
  }));

  return (
    <div className="animate-rise delay-1 h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            contentStyle={{
              border: "1px solid rgba(10,10,10,0.12)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Creados"
            stroke="#111111"
            strokeWidth={2.5}
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="Resueltos"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="Backlog"
            stroke="#a16207"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
