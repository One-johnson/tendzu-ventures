"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useTheme } from "next-themes";

interface DailyRevenuePoint {
  date: string;
  revenue: number;
  units: number;
}

interface StockBreakdownPoint {
  name: string;
  value: number;
  fill: string;
}

interface TopSellingPoint {
  machineName: string;
  totalQuantity: number;
  totalRevenue: number;
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--foreground)",
};

export function RevenueTrendChart({ data }: { data: DailyRevenuePoint[] }) {
  const { resolvedTheme } = useTheme();
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">7-Day Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <div className="h-[220px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: textColor, fontSize: 11 }}
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
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockBreakdownChart({ data }: { data: StockBreakdownPoint[] }) {
  const { resolvedTheme } = useTheme();
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  if (!data.length) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Stock Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">No inventory data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Stock Status</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <div className="h-[220px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ color: textColor, fontSize: 12 }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopSellingChart({ data }: { data: TopSellingPoint[] }) {
  const { resolvedTheme } = useTheme();
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  const chartData = data.slice(0, 5).map((d) => ({
    name: d.machineName.length > 18 ? `${d.machineName.slice(0, 18)}…` : d.machineName,
    units: d.totalQuantity,
    revenue: d.totalRevenue,
  }));

  if (!chartData.length) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Top Selling Machines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">No sales data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Top Selling Machines</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <div className="h-[220px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: textColor, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  name === "units" ? formatNumber(Number(value ?? 0)) : formatCurrency(Number(value ?? 0)),
                  name === "units" ? "Units Sold" : "Revenue",
                ]}
              />
              <Bar dataKey="units" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueComparisonChart({
  data,
}: {
  data: { period: string; revenue: number }[];
}) {
  const { resolvedTheme } = useTheme();
  const gridColor = resolvedTheme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">Revenue Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <div className="h-[200px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="var(--chart-3)" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
