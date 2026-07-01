"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveFormPanel } from "@/components/ui/responsive-form-panel";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type BulkRow = {
  key: string;
  name: string;
  brand: string;
  model: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
  year: string;
};

function createRow(): BulkRow {
  return {
    key: crypto.randomUUID(),
    name: "",
    brand: "",
    model: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "1",
    year: "",
  };
}

interface BulkAddMachinesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  token: string | null;
}

export function BulkAddMachinesSheet({
  open,
  onOpenChange,
  categories,
  token,
}: BulkAddMachinesSheetProps) {
  const bulkCreate = useMutation(api.machines.bulkCreate);
  const [categoryId, setCategoryId] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [rows, setRows] = useState<BulkRow[]>([createRow(), createRow(), createRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryId((current) => current || categories[0]?._id || "");
    setLowStockThreshold("5");
    setRows([createRow(), createRow(), createRow()]);
  }, [open, categories]);

  const updateRow = (key: string, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    if (rows.length >= 25) {
      toast.error("Maximum 25 machines per bulk add");
      return;
    }
    setRows((prev) => [...prev, createRow()]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const validRows = rows.filter(
    (row) =>
      row.name.trim() &&
      row.costPrice !== "" &&
      row.sellingPrice !== "" &&
      row.quantity !== ""
  );

  const canSave =
    !!token &&
    !!categoryId &&
    validRows.length > 0 &&
    validRows.every(
      (row) =>
        !Number.isNaN(Number(row.costPrice)) &&
        !Number.isNaN(Number(row.sellingPrice)) &&
        !Number.isNaN(Number(row.quantity)) &&
        Number(row.quantity) >= 0
    );

  const handleSave = async () => {
    if (!token || !canSave) return;

    setSaving(true);
    try {
      const result = await bulkCreate({
        token,
        categoryId: categoryId as Id<"categories">,
        lowStockThreshold: Number(lowStockThreshold || "5"),
        machines: validRows.map((row) => ({
          name: row.name.trim(),
          costPrice: Number(row.costPrice),
          sellingPrice: Number(row.sellingPrice),
          quantity: Number(row.quantity),
          brand: row.brand.trim() || undefined,
          model: row.model.trim() || undefined,
          year: row.year ? Number(row.year) : undefined,
        })),
      });

      toast.success(`Added ${result.count} machines`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to add machines"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveFormPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Add Machines"
      description="Add multiple machines under one category. Each row gets its own custom ID and SKU."
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Adding..." : `Add ${validRows.length} machine${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Low stock threshold (all rows)</Label>
            <Input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Machines to add</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="rounded-lg border border-border bg-muted/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Machine {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="e.g. CAT 320 Excavator"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input
                        value={row.brand}
                        onChange={(e) => updateRow(row.key, { brand: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input
                        value={row.model}
                        onChange={(e) => updateRow(row.key, { model: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Cost (GHS) *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={row.costPrice}
                        onChange={(e) => updateRow(row.key, { costPrice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (GHS) *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={row.sellingPrice}
                        onChange={(e) => updateRow(row.key, { sellingPrice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qty *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={row.year}
                        onChange={(e) => updateRow(row.key, { year: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Only rows with name, cost, price, and quantity will be created. Up to 25 machines per
            batch.
          </p>
        </div>
      </div>
    </ResponsiveFormPanel>
  );
}
