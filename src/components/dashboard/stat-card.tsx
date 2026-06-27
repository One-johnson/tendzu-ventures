"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
  index?: number;
}

const variantStyles = {
  default: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
  loading,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card className="overflow-hidden border-border bg-card transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            {title}
          </CardTitle>
          <div className={cn("rounded-lg p-2", variantStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-xl font-bold text-foreground sm:text-2xl">{value}</div>
              {(description || trend) && (
                <p className="mt-1 text-xs text-muted-foreground">{trend ?? description}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
