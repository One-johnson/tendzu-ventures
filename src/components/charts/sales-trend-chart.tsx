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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SalesChartPoint {
  label: string;
  revenue: number;
  profit: number;
  units: number;
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--foreground)",
};

const periodLabels = {
  daily: "Daily Sales (7 days)",
  weekly: "Weekly Sales (8 weeks)",
  monthly: "Monthly Sales (12 months)",
} as const;

interface SalesTrendChartProps {
  data: SalesChartPoint[];
  period: "daily" | "weekly" | "monthly";
  onPeriodChange: (period: "daily" | "weekly" | "monthly") => void;
  isLoading?: boolean;
}

export function SalesTrendChart({
  data,
  period,
  onPeriodChange,
  isLoading = false,
}: SalesTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base sm:text-lg">{periodLabels[period]}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              variant={period === p ? "default" : "outline"}
              size="sm"
              className="touch-manipulation"
              onClick={() => onPeriodChange(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="relative px-2 pb-4 sm:px-6">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
          </div>
        )}
        {!isLoading && data.every((point) => point.revenue === 0 && point.profit === 0) ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No sales data for this period</p>
        ) : (
          <div className="h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: textColor, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: textColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0)),
                    name === "revenue" ? "Revenue" : "Profit",
                  ]}
                />
                <Legend
                  wrapperStyle={{ color: textColor, fontSize: 12 }}
                  formatter={(value) => (
                    <span className={cn("text-foreground capitalize")}>{value}</span>
                  )}
                />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="profit" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
