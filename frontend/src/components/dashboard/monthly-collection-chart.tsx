"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartCard from "./chart-card";

interface DataPoint {
  label: string;
  value: number;
}

interface MonthlyCollectionChartProps {
  data: DataPoint[];
}

/* Custom tooltip */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <p style={{ color: "var(--accent-primary)" }}>
        ₹{payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default function MonthlyCollectionChart({
  data,
}: MonthlyCollectionChartProps) {
  return (
    <ChartCard title="Monthly Collection" subtitle="Revenue trend over 12 months">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--card-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              `₹${(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--chart-area-fill)" }} />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
