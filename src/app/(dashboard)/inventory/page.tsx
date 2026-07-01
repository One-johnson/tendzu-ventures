"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Category, MachineWithMeta } from "@/types";
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
import { ResponsiveFormPanel } from "@/components/ui/responsive-form-panel";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PageLoader } from "@/components/shared/page-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  MobileCard,
  MobileCardField,
  getCellValue,
} from "@/components/data-table/mobile-card-list";
import { BulkAddMachinesSheet } from "@/components/inventory/bulk-add-machines-sheet";
import { MachineDetailSheet } from "@/components/inventory/machine-detail-sheet";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { FadeIn } from "@/components/motion/page-wrapper";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { getStockStatusColor, getStockStatusLabel } from "@/lib/stock";
import { Plus, Search, Pencil, Trash2, Package, Ban, CheckCircle, Layers } from "lucide-react";
import { toast } from "sonner";
import { useDeepLinkParam } from "@/hooks/use-deep-link-param";
import { useRowHighlight } from "@/hooks/use-row-highlight";

const emptyForm = {
  name: "",
  categoryId: "",
  description: "",
  costPrice: "",
  sellingPrice: "",
  quantity: "",
  lowStockThreshold: "5",
  brand: "",
  model: "",
  year: "",
  isActive: true,
};

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const token = useSessionToken();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"machines"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"machines"> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedMachines, setSelectedMachines] = useState<MachineWithMeta[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [detailMachine, setDetailMachine] = useState<MachineWithMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { targetId: machineTargetId, consumeParam: consumeMachineParam } = useDeepLinkParam("machine");
  const { highlightRowId, setHighlightRowId } = useRowHighlight();
  const deepLinkHandledRef = useRef<string | null>(null);

  const handleSelectedRowsChange = useCallback((rows: MachineWithMeta[]) => {
    setSelectedMachines((prev) => {
      const prevIds = prev
        .map((row) => row._id)
        .sort()
        .join("|");
      const nextIds = rows
        .map((row) => row._id)
        .sort()
        .join("|");
      if (prevIds === nextIds) return prev;
      return rows;
    });
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    if (machineTargetId) return;
    if (q) setSearch(q);
    if (category) setCategoryFilter(category);
  }, [searchParams, machineTargetId]);

  const deepLinkMachine = useQuery(
    api.machines.getById,
    token && machineTargetId
      ? { token, id: machineTargetId as Id<"machines"> }
      : "skip"
  ) as MachineWithMeta | null | undefined;

  const categories = useQuery(api.categories.list, token ? { token } : "skip") as Category[] | undefined;
  const defaultThreshold = useQuery(
    api.settings.getDefaultLowStockThreshold,
    token ? { token } : "skip"
  ) as number | undefined;
  const machines = useQuery(
    api.machines.list,
    token
      ? {
          token,
          search: search || undefined,
          categoryId:
            categoryFilter !== "all"
              ? (categoryFilter as Id<"categories">)
              : undefined,
          stockStatus:
            statusFilter !== "all"
              ? (statusFilter as "available" | "low_stock" | "out_of_stock")
              : undefined,
        }
      : "skip"
  ) as MachineWithMeta[] | undefined;

  const createMachine = useMutation(api.machines.create);
  const updateMachine = useMutation(api.machines.update);
  const removeMachine = useMutation(api.machines.remove);
  const bulkRemoveMachines = useMutation(api.machines.bulkRemove);
  const bulkSetActive = useMutation(api.machines.bulkSetActive);
  const bulkUpdateCategory = useMutation(api.machines.bulkUpdateCategory);

  const selectedIds = useMemo(
    () => selectedMachines.map((machine) => machine._id as Id<"machines">),
    [selectedMachines]
  );

  const filteredCount = machines?.length ?? 0;

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      lowStockThreshold: String(defaultThreshold ?? 5),
    });
    setSheetOpen(true);
  };

  const openEdit = (machine: NonNullable<typeof machines>[number]) => {
    setEditingId(machine._id as Id<"machines">);
    setForm({
      name: machine.name,
      categoryId: machine.categoryId,
      description: machine.description ?? "",
      costPrice: String(machine.costPrice),
      sellingPrice: String(machine.sellingPrice),
      quantity: String(machine.quantity),
      lowStockThreshold: String(machine.lowStockThreshold),
      brand: machine.brand ?? "",
      model: machine.model ?? "",
      year: machine.year ? String(machine.year) : "",
      isActive: machine.isActive,
    });
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!machineTargetId) return;
    if (deepLinkMachine === undefined) return;
    if (deepLinkHandledRef.current === machineTargetId) return;

    deepLinkHandledRef.current = machineTargetId;

    if (!deepLinkMachine) {
      toast.error("Machine not found");
      consumeMachineParam();
      return;
    }

    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setDetailMachine(deepLinkMachine);
    setDetailOpen(true);
    setHighlightRowId(machineTargetId);
    consumeMachineParam();
  }, [machineTargetId, deepLinkMachine, consumeMachineParam, setHighlightRowId]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        token,
        name: form.name,
        categoryId: form.categoryId as Id<"categories">,
        description: form.description || undefined,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        lowStockThreshold: Number(form.lowStockThreshold),
        brand: form.brand || undefined,
        model: form.model || undefined,
        year: form.year ? Number(form.year) : undefined,
      };

      if (editingId) {
        const machine = machines?.find((m) => m._id === editingId);
        await updateMachine({
          ...payload,
          id: editingId,
          sku: machine?.sku ?? `TV-0000`,
          isActive: form.isActive,
        });
        toast.success("Machine updated successfully");
      } else {
        const result = await createMachine({
          ...payload,
          quantity: Number(form.quantity),
        });
        toast.success(`Machine added with ID ${result.customId}`);
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save machine");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    try {
      await removeMachine({ token, id: deleteId });
      toast.success("Machine deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to delete machine"));
      throw error;
    }
  };

  const handleBulkDelete = async () => {
    if (!token || selectedIds.length === 0) return;
    try {
      await bulkRemoveMachines({ token, ids: selectedIds });
      toast.success("Selected machines deleted");
      clearSelection();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to delete machines"));
      throw error;
    }
  };

  const clearSelection = () => setSelectedMachines([]);

  const runBulkAction = async (action: () => Promise<unknown>, success: string) => {
    if (!token || selectedIds.length === 0) return;
    try {
      await action();
      toast.success(success);
      clearSelection();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Bulk action failed"));
      throw error;
    }
  };

  const handleBulkActivate = (isActive: boolean) =>
    runBulkAction(
      () => bulkSetActive({ token: token!, ids: selectedIds, isActive }),
      isActive ? "Selected machines activated" : "Selected machines deactivated"
    );

  const handleBulkCategory = () => {
    if (!token || !bulkCategoryId || selectedIds.length === 0) return;
    runBulkAction(
      () =>
        bulkUpdateCategory({
          token,
          ids: selectedIds,
          categoryId: bulkCategoryId as Id<"categories">,
        }),
      "Category updated for selected machines"
    );
  };

  const categoryOptions = useMemo(() => categories ?? [], [categories]);

  const columns = useMemo<ColumnDef<MachineWithMeta>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left"
            onClick={() => {
              setDetailMachine(row.original);
              setDetailOpen(true);
            }}
          >
            <p className="font-medium text-primary hover:underline">{row.original.name}</p>
            {row.original.brand && (
              <p className="text-xs text-muted-foreground">
                {row.original.brand} {row.original.model}
              </p>
            )}
          </button>
        ),
      },
      {
        accessorKey: "customId",
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-yellow-500">
            {row.original.customId ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "sku",
        header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
      },
      {
        id: "category",
        accessorFn: (row) => row.category?.name ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Qty" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.quantity}</span>,
      },
      {
        accessorKey: "costPrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
        cell: ({ row }) => formatCurrency(row.original.costPrice),
      },
      {
        accessorKey: "sellingPrice",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
        cell: ({ row }) => formatCurrency(row.original.sellingPrice),
      },
      {
        accessorKey: "stockStatus",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStockStatusColor(row.original.stockStatus)}`}
          >
            {getStockStatusLabel(row.original.stockStatus)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation" onClick={() => openEdit(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation" onClick={() => setDeleteId(row.original._id as Id<"machines">)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!machines || !categories) return <PageLoader />;

  const machineToDelete = machines.find((machine) => machine._id === deleteId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="inventory-header">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Machine Inventory</h2>
            <p className="text-sm text-muted-foreground">{filteredCount} machines in catalog</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setBulkAddOpen(true)}
              disabled={categoryOptions.length === 0}
              className="w-full touch-manipulation sm:w-auto"
            >
              <Layers className="mr-2 h-4 w-4" />
              Bulk Add
            </Button>
            <Button onClick={openCreate} className="w-full touch-manipulation sm:w-auto" data-tour="add-machine">
              <Plus className="mr-2 h-4 w-4" />
              Add Machine
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, SKU, brand..."
            className="h-10 pl-9 touch-manipulation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-10 w-full touch-manipulation sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full touch-manipulation sm:w-44">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionsBar count={selectedMachines.length} onClear={clearSelection}>
        <Button size="sm" variant="secondary" onClick={() => handleBulkActivate(true)}>
          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
          Activate
        </Button>
        <Button size="sm" variant="secondary" onClick={() => handleBulkActivate(false)}>
          <Ban className="mr-1.5 h-3.5 w-3.5" />
          Deactivate
        </Button>
        <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Move to category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" disabled={!bulkCategoryId} onClick={handleBulkCategory}>
          Apply category
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </BulkActionsBar>

      {machines.length === 0 ? (
        <EmptyState
          title="No machines found"
          description="Add your first heavy equipment machine to start managing inventory."
          icon={<Package className="h-8 w-8" />}
        />
      ) : (
        <DataTable
          columns={columns}
          data={machines}
          searchPlaceholder="Filter table..."
          pageSize={10}
          emptyMessage="No machines match your filters"
          enableRowSelection
          getRowId={(row) => row._id}
          onSelectedRowsChange={handleSelectedRowsChange}
          highlightRowId={highlightRowId}
          mobileCard={(row) => (
            <MobileCard>
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{row.original.name}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.original._id as Id<"machines">)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <MobileCardField label="ID" value={row.original.customId ?? "—"} />
              <MobileCardField label="SKU" value={row.original.sku} />
              <MobileCardField label="Category" value={getCellValue(row, "category")} />
              <MobileCardField label="Qty" value={row.original.quantity} />
              <MobileCardField label="Price" value={formatCurrency(row.original.sellingPrice)} />
              <MobileCardField label="Status" value={getCellValue(row, "stockStatus")} />
            </MobileCard>
          )}
        />
      )}

      <ResponsiveFormPanel
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingId ? "Edit Machine" : "Add New Machine"}
        description={
          editingId
            ? "Update machine details. The custom ID cannot be changed."
            : "A unique 4-digit custom ID and SKU will be generated automatically."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.name ||
                !form.categoryId ||
                !form.costPrice ||
                !form.sellingPrice ||
                (!editingId && !form.quantity)
              }
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add Machine"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {editingId && (
            <div className="grid gap-2">
              <Label>Custom ID</Label>
              <Input
                value={machines.find((m) => m._id === editingId)?.customId ?? ""}
                readOnly
                className="bg-muted font-mono"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Machine Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Category *</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Cost Price (GHS) *</Label>
              <Input
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Selling Price (GHS) *</Label>
              <Input
                type="number"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editingId && (
              <div className="grid gap-2">
                <Label>Initial Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Low Stock Threshold *</Label>
              <Input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </ResponsiveFormPanel>

      <BulkAddMachinesSheet
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        categories={categoryOptions}
        token={token}
      />

      <MachineDetailSheet
        machine={detailMachine}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete machine?"
        description={
          <>
            {machineToDelete ? (
              <p>
                You are about to permanently delete{" "}
                <span className="font-medium text-foreground">{machineToDelete.name}</span>.
              </p>
            ) : (
              <p>You are about to permanently delete this machine.</p>
            )}
            <p>Machines with sales history cannot be deleted. This action cannot be undone.</p>
          </>
        }
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedMachines.length} machines?`}
        description={
          <>
            <p>
              You are about to delete{" "}
              <span className="font-medium text-foreground">
                {selectedMachines.length} selected machines
              </span>
              .
            </p>
            <p>Machines with sales history will be skipped. This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete selected"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
