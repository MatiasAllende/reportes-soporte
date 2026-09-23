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
import { demoData } from "@/lib/data";

export function TrendsChart() {
  const data = demoData.weeks.map((week) => ({
    name: week.id.replace("2026-", ""),
    Creados: week.created,
    Resueltos: week.resolved,
    Backlog: week.open,
  }));

  return (
    <div className="animate-rise delay-1 h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            contentStyle={{
              border: "1px solid rgba(12,27,42,0.1)",
              borderRadius: 8,
              background: "#fff",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Creados"
            stroke="#243447"
            strokeWidth={2.5}
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="Resueltos"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="Backlog"
            stroke="#c2410c"
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
