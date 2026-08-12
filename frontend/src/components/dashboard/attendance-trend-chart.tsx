"use client";

import React from "react";
import {
  LineChart,
  Line,
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
  secondary?: number | null;
}

interface AttendanceTrendChartProps {
  data: DataPoint[];
}

/* Custom tooltip */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
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
      <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          style={{
            color:
              p.dataKey === "value"
                ? "var(--accent-success)"
                : "var(--accent-danger)",
          }}
        >
          {p.dataKey === "value" ? "Present" : "Absent"}: {p.value}%
        </p>
      ))}
    </div>
  );
}

export default function AttendanceTrendChart({
  data,
}: AttendanceTrendChartProps) {
  return (
    <ChartCard title="Attendance Trend" subtitle="Daily attendance over 30 days">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
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
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            domain={[75, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent-success)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              stroke: "var(--accent-success)",
              strokeWidth: 2,
              fill: "var(--card-bg)",
            }}
            name="Present"
          />
          <Line
            type="monotone"
            dataKey="secondary"
            stroke="var(--accent-danger)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{
              r: 3,
              stroke: "var(--accent-danger)",
              strokeWidth: 2,
              fill: "var(--card-bg)",
            }}
            name="Absent"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
