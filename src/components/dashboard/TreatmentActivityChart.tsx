"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { weeklyTreatmentData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function TreatmentActivityChart() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-adaline-ink)]/85">Activité des Traitements</h3>
          <p className="text-xs text-[var(--color-adaline-ink)]/40 mt-0.5">Traitements cette semaine</p>
        </div>
      </div>

      <div className="h-[240px]">
        {ready && <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={weeklyTreatmentData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(20,35,18,0.9)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}
            />
            <Bar dataKey="treatments" name="Traitements" fill="rgba(232,168,56,0.6)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>}
      </div>
    </div>
  );
}
