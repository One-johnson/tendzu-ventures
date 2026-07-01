"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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
import { FadeIn } from "@/components/motion/page-wrapper";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { getStockStatusColor, getStockStatusLabel } from "@/lib/stock";
import { Plus, Search, Pencil, Trash2, Package, Layers } from "lucide-react";
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
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [detailMachine, setDetailMachine] = useState<MachineWithMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { targetId: machineTargetId, consumeParam: consumeMachineParam } = useDeepLinkParam("machine");
  const { highlightRowId, setHighlightRowId } = useRowHighlight();
  const deepLinkHandledRef = useRef<string | null>(null);

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

  const filteredCount = machines?.length ?? 0;

  const openDetail = (machine: MachineWithMeta) => {
    setDetailMachine(machine);
    setDetailOpen(true);
  };

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

  const parseOptionalNumber = (value: string, fallback: number) => {
    if (value.trim() === "") return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        const machine = machines?.find((m) => m._id === editingId);
        await updateMachine({
          token,
          id: editingId,
          name: form.name,
          categoryId: form.categoryId as Id<"categories">,
          description: form.description || undefined,
          costPrice: Number(form.costPrice),
          sellingPrice: Number(form.sellingPrice),
          lowStockThreshold: Number(form.lowStockThreshold),
          brand: form.brand || undefined,
          model: form.model || undefined,
          year: form.year ? Number(form.year) : undefined,
          sku: machine?.sku ?? `TV-0000`,
          isActive: form.isActive,
        });
        toast.success("Machine updated successfully");
      } else {
        const categoryId = (form.categoryId || categories?.[0]?._id) as Id<"categories"> | undefined;
        if (!categoryId) {
          toast.error("Create a category before adding machines");
          return;
        }

        const result = await createMachine({
          token,
          name: form.name.trim() || "Untitled Machine",
          categoryId,
          description: form.description.trim() || undefined,
          costPrice: parseOptionalNumber(form.costPrice, 0),
          sellingPrice: parseOptionalNumber(form.sellingPrice, 0),
          quantity: parseOptionalNumber(form.quantity, 0),
          lowStockThreshold: parseOptionalNumber(form.lowStockThreshold, defaultThreshold ?? 5),
          brand: form.brand.trim() || undefined,
          model: form.model.trim() || undefined,
          year: form.year ? Number(form.year) : undefined,
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

  const categoryOptions = useMemo(() => categories ?? [], [categories]);

  const columns = useMemo<ColumnDef<MachineWithMeta>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machine" />,
        cell: ({ row }) => (
          <div className="text-left">
            <p className="font-medium text-foreground">{row.original.name}</p>
            {row.original.brand && (
              <p className="text-xs text-muted-foreground">
                {row.original.brand} {row.original.model}
              </p>
            )}
          </div>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(row.original._id as Id<"machines">);
              }}
            >
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
          getRowId={(row) => row._id}
          highlightRowId={highlightRowId}
          onRowClick={openDetail}
          mobileCard={(row) => (
            <MobileCard onClick={() => openDetail(row.original)}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{row.original.name}</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(row.original);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(row.original._id as Id<"machines">);
                    }}
                  >
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
                (!!editingId &&
                  (!form.name ||
                    !form.categoryId ||
                    !form.costPrice ||
                    !form.sellingPrice))
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
            <Label>{editingId ? "Machine Name *" : "Machine Name"}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>{editingId ? "Category *" : "Category"}</Label>
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
              <Label>{editingId ? "Cost Price (GHS) *" : "Cost Price (GHS)"}</Label>
              <Input
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>{editingId ? "Selling Price (GHS) *" : "Selling Price (GHS)"}</Label>
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
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>{editingId ? "Low Stock Threshold *" : "Low Stock Threshold"}</Label>
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
    </div>
  );
}
