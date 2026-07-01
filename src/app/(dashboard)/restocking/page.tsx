"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Category, MachineWithMeta, RestockingRecord } from "@/types";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/page-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  MobileCard,
  MobileCardField,
  getCellValue,
} from "@/components/data-table/mobile-card-list";
import { FadeIn } from "@/components/motion/page-wrapper";
import { formatDate } from "@/lib/format";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

export default function RestockingPage() {
  const token = useSessionToken();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [machineId, setMachineId] = useState("");
  const [quantityAdded, setQuantityAdded] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const machines = useQuery(api.machines.list, token ? { token } : "skip") as MachineWithMeta[] | undefined;
  const categories = useQuery(api.categories.list, token ? { token } : "skip") as Category[] | undefined;
  const history = useQuery(api.restocking.list, token ? { token, limit: 50 } : "skip") as RestockingRecord[] | undefined;
  const restock = useMutation(api.restocking.create);

  const filteredMachines = useMemo(() => {
    if (!machines) return [];
    if (categoryId === "all") return machines;
    return machines.filter((machine) => machine.categoryId === categoryId);
  }, [machines, categoryId]);

  const machineOptions = useMemo(
    () =>
      filteredMachines.map((machine) => ({
        value: machine._id,
        label: `${machine.name} (Current: ${machine.quantity})`,
        keywords: [machine.name, machine.sku, machine.customId, machine.category?.name]
          .filter(Boolean)
          .join(" "),
      })),
    [filteredMachines]
  );

  const selectedMachine = machines?.find((m) => m._id === machineId);

  const resetForm = () => {
    setCategoryId("all");
    setMachineId("");
    setQuantityAdded("");
    setNotes("");
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    if (!machineId) return;
    const machine = machines?.find((m) => m._id === machineId);
    if (machine && value !== "all" && machine.categoryId !== value) {
      setMachineId("");
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const columns = useMemo<ColumnDef<RestockingRecord>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: "machineName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
        cell: ({ row }) => <span className="font-medium">{row.original.machineName}</span>,
      },
      {
        accessorKey: "previousQuantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Previous" />,
      },
      {
        accessorKey: "quantityAdded",
        header: "Added",
        cell: ({ row }) => <Badge variant="success">+{row.original.quantityAdded}</Badge>,
      },
      {
        accessorKey: "newQuantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="New Stock" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.newQuantity}</span>,
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <span className="max-w-xs truncate text-sm text-muted-foreground">
            {row.original.notes ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const handleSubmit = async () => {
    if (!token || !machineId || !quantityAdded) return;
    setSaving(true);
    try {
      const result = await restock({
        token,
        machineId: machineId as Id<"machines">,
        quantityAdded: Number(quantityAdded),
        notes: notes || undefined,
      });
      toast.success(
        `Restocked successfully. Stock updated from ${result.previousQuantity} to ${result.newQuantity}.`
      );
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restocking failed");
    } finally {
      setSaving(false);
    }
  };

  if (!machines || !categories || !history) return <PageLoader />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="restocking-form">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Stock Restocking</h2>
            <p className="text-sm text-muted-foreground">Record new stock arrivals and track history</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full touch-manipulation sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Record Restock
          </Button>
        </div>
      </FadeIn>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Restocking History</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {history.length === 0 ? (
            <EmptyState
              title="No restocking records"
              description="Record your first stock arrival to begin tracking restocking history."
              icon={<Truck className="h-8 w-8" />}
            />
          ) : (
            <DataTable
              columns={columns}
              data={history}
              searchPlaceholder="Search machines, notes..."
              pageSize={10}
              emptyMessage="No restocking records"
              mobileCard={(row) => (
                <MobileCard>
                  <MobileCardField label="Machine" value={row.original.machineName} />
                  <MobileCardField label="Added" value={getCellValue(row, "quantityAdded")} />
                  <MobileCardField label="New Stock" value={row.original.newQuantity} />
                  <MobileCardField label="Date" value={getCellValue(row, "createdAt")} />
                  {row.original.notes && (
                    <MobileCardField label="Notes" value={row.original.notes} />
                  )}
                </MobileCard>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Stock Restocking</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-10 touch-manipulation">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Select Machine *</Label>
              <Combobox
                options={machineOptions}
                value={machineId}
                onValueChange={setMachineId}
                placeholder={
                  filteredMachines.length === 0
                    ? "No machines in this category"
                    : "Search and choose a machine"
                }
                searchPlaceholder="Search by name, SKU, or ID..."
                emptyText="No machines match your search."
                disabled={filteredMachines.length === 0}
              />
            </div>
            {selectedMachine && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>
                  Current stock: <strong>{selectedMachine.quantity}</strong> units
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Quantity to Add *</Label>
              <Input
                type="number"
                min="1"
                className="h-10 touch-manipulation"
                value={quantityAdded}
                onChange={(e) => setQuantityAdded(e.target.value)}
              />
            </div>
            {selectedMachine && quantityAdded && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                New stock will be:{" "}
                <strong>
                  {selectedMachine.quantity + Number(quantityAdded || 0)} units
                </strong>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Supplier details, delivery notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} className="w-full touch-manipulation sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !machineId || !quantityAdded || Number(quantityAdded) <= 0}
              className="w-full touch-manipulation sm:w-auto"
            >
              {saving ? "Saving..." : "Record Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
