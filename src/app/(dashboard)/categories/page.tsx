"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { ColumnDef } from "@tanstack/react-table";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Category } from "@/types";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveFormPanel } from "@/components/ui/responsive-form-panel";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PageLoader } from "@/components/shared/page-loader";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MobileCard, MobileCardField } from "@/components/data-table/mobile-card-list";
import { FadeIn } from "@/components/motion/page-wrapper";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { searchRoutes } from "@/lib/search-routes";
import { LayoutGrid, Plus, Pencil, Search, Table2, Trash2, Tags, Package } from "lucide-react";
import { toast } from "sonner";
import { useDeepLinkParam } from "@/hooks/use-deep-link-param";
import { useRowHighlight } from "@/hooks/use-row-highlight";

const emptyForm = {
  name: "",
  description: "",
};

type ViewMode = "table" | "cards";

function CategoryCard({
  category,
  selected,
  highlighted,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  category: Category;
  selected: boolean;
  highlighted?: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: Id<"categories">) => void;
}) {
  return (
    <Card
      data-row-id={category._id}
      className={cn(
        "flex flex-col",
        selected && "border-primary ring-1 ring-primary/30",
        highlighted && "ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-background"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(category._id)}
            aria-label={`Select ${category.name}`}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{category.name}</CardTitle>
            {category.description ? (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 pb-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{category.machineCount ?? 0}</span> machines
        </p>
        <p>Created {formatDate(category.createdAt)}</p>
      </CardContent>
      <div className="flex gap-2 border-t border-border px-6 pb-6 pt-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(category)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 hover:text-red-600 dark:text-red-400"
          onClick={() => onDelete(category._id as Id<"categories">)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </Card>
  );
}

export default function CategoriesPage() {
  const token = useSessionToken();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"categories"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { targetId: categoryTargetId, consumeParam: consumeCategoryParam } =
    useDeepLinkParam("category");
  const { highlightRowId, setHighlightRowId } = useRowHighlight();
  const deepLinkHandledRef = useRef<string | null>(null);

  const handleSelectedRowsChange = useCallback((rows: Category[]) => {
    setSelectedCategories((prev) => {
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

  const categories = useQuery(api.categories.list, token ? { token } : "skip") as
    | Category[]
    | undefined;

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);
  const bulkRemoveCategories = useMutation(api.categories.bulkRemove);

  const selectedIds = useMemo(() => {
    if (viewMode === "cards") {
      return Array.from(selectedCardIds) as Id<"categories">[];
    }
    return selectedCategories.map((category) => category._id as Id<"categories">);
  }, [viewMode, selectedCardIds, selectedCategories]);

  const selectionCount = selectedIds.length;

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
    );
  }, [categories, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category._id as Id<"categories">);
    setForm({
      name: category.name,
      description: category.description ?? "",
    });
    setSheetOpen(true);
  };

  useEffect(() => {
    if (!categoryTargetId || !categories) return;
    if (deepLinkHandledRef.current === categoryTargetId) return;

    const category = categories.find((item) => item._id === categoryTargetId);
    deepLinkHandledRef.current = categoryTargetId;

    if (!category) {
      toast.error("Category not found");
      consumeCategoryParam();
      return;
    }

    setSearch(category.name);
    openEdit(category);
    setHighlightRowId(categoryTargetId);
    consumeCategoryParam();

    window.setTimeout(() => {
      document
        .querySelector(`[data-row-id="${categoryTargetId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [categoryTargetId, categories, consumeCategoryParam, setHighlightRowId]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory({
          token,
          id: editingId,
          name: form.name,
          description: form.description || undefined,
        });
        toast.success("Category updated");
      } else {
        await createCategory({
          token,
          name: form.name,
          description: form.description || undefined,
        });
        toast.success("Category created");
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    try {
      await removeCategory({ token, id: deleteId });
      toast.success("Category deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to delete category"));
      throw error;
    }
  };

  const clearSelection = () => {
    setSelectedCategories([]);
    setSelectedCardIds(new Set());
  };

  const toggleCardSelection = (id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCards = () => {
    if (selectedCardIds.size === filteredCategories.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCategories.map((category) => category._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!token || selectedIds.length === 0) return;
    try {
      const result = await bulkRemoveCategories({ token, ids: selectedIds });
      toast.success(
        result.skipped > 0
          ? `Deleted ${result.deleted} categories (${result.skipped} skipped)`
          : `Deleted ${result.deleted} categories`
      );
      clearSelection();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to delete categories"));
      throw error;
    }
  };

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="text-xs text-muted-foreground">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "machineCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Machines" />,
        cell: ({ row }) => row.original.machineCount ?? 0,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setDeleteId(row.original._id as Id<"categories">)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    []
  );

  if (!categories) return <PageLoader />;

  const categoryToDelete = categories.find((category) => category._id === deleteId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          data-tour="categories-header"
        >
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Categories</h2>
            <p className="text-sm text-muted-foreground">
              Set up equipment categories before adding machines to inventory.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-lg border border-border p-1">
              <Button
                type="button"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 flex-1 gap-1.5 sm:flex-none"
                onClick={() => {
                  setViewMode("table");
                  clearSelection();
                }}
              >
                <Table2 className="h-4 w-4" />
                Table
              </Button>
              <Button
                type="button"
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 flex-1 gap-1.5 sm:flex-none"
                onClick={() => {
                  setViewMode("cards");
                  clearSelection();
                }}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </Button>
            </div>
            <Button onClick={openCreate} className="w-full touch-manipulation sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>
      </FadeIn>

      <BulkActionsBar count={selectionCount} onClear={clearSelection}>
        <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete selected
        </Button>
      </BulkActionsBar>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your first category to organize machines in inventory."
          icon={<Tags className="h-8 w-8" />}
        />
      ) : viewMode === "cards" ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="h-10 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredCategories.length > 0 && (
            <div className="flex items-center gap-3">
              <Checkbox
                checked={
                  filteredCategories.length > 0 &&
                  selectedCardIds.size === filteredCategories.length
                }
                onCheckedChange={toggleAllCards}
                aria-label="Select all categories"
              />
              <span className="text-sm text-muted-foreground">
                {selectedCardIds.size} selected
              </span>
            </div>
          )}
          {filteredCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No categories match your search.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category._id}
                  category={category}
                  selected={selectedCardIds.has(category._id)}
                  highlighted={highlightRowId === category._id}
                  onToggleSelect={toggleCardSelection}
                  onEdit={openEdit}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          searchPlaceholder="Filter categories..."
          pageSize={10}
          emptyMessage="No categories match your search"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteId(row.original._id as Id<"categories">)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {row.original.description && (
                <MobileCardField label="Description" value={row.original.description} />
              )}
              <MobileCardField label="Machines" value={row.original.machineCount ?? 0} />
              <MobileCardField label="Created" value={formatDate(row.original.createdAt)} />
            </MobileCard>
          )}
        />
      )}

      <ResponsiveFormPanel
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingId ? "Edit Category" : "Add Category"}
        description="Categories group machines in inventory, sales, and reports."
        className="sm:max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Excavator"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-description">Description (optional)</Label>
            <Textarea
              id="category-description"
              placeholder="Brief description of this category"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {editingId ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href={searchRoutes.categoryMachines(editingId)}>
                <Package className="mr-2 h-4 w-4" />
                View machines in this category
              </Link>
            </Button>
          ) : null}
        </div>
      </ResponsiveFormPanel>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete category?"
        description={
          <>
            {categoryToDelete ? (
              <p>
                You are about to permanently delete{" "}
                <span className="font-medium text-foreground">{categoryToDelete.name}</span>.
              </p>
            ) : (
              <p>You are about to permanently delete this category.</p>
            )}
            <p>Categories with assigned machines cannot be deleted. This action cannot be undone.</p>
          </>
        }
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectionCount} categories?`}
        description={
          <>
            <p>
              You are about to delete{" "}
              <span className="font-medium text-foreground">
                {selectionCount} selected categories
              </span>
              .
            </p>
            <p>Categories with assigned machines will be skipped. This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete selected"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
