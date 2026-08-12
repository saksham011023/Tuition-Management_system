"use client";

import React from "react";
import {
  AreaChart,
  Area,
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

interface StudentGrowthChartProps {
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
      <p style={{ color: "var(--accent-secondary)" }}>
        {payload[0].value} students
      </p>
    </div>
  );
}

export default function StudentGrowthChart({ data }: StudentGrowthChartProps) {
  return (
    <ChartCard title="Student Growth" subtitle="Enrollment trend over 12 months">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="studentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            domain={["dataMin - 20", "dataMax + 10"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--accent-secondary)"
            strokeWidth={2.5}
            fill="url(#studentGradient)"
            dot={false}
            activeDot={{
              r: 5,
              stroke: "var(--accent-secondary)",
              strokeWidth: 2,
              fill: "var(--card-bg)",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
