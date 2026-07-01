"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
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
import { ResponsiveFormPanel } from "@/components/ui/responsive-form-panel";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PageLoader } from "@/components/shared/page-loader";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { FadeIn } from "@/components/motion/page-wrapper";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { searchRoutes } from "@/lib/search-routes";
import { Plus, Pencil, Trash2, Tags, Package } from "lucide-react";
import { toast } from "sonner";
import { useDeepLinkParam } from "@/hooks/use-deep-link-param";
import { useRowHighlight } from "@/hooks/use-row-highlight";

const emptyForm = {
  name: "",
  description: "",
};

export default function CategoriesPage() {
  const token = useSessionToken();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"categories"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { targetId: categoryTargetId, consumeParam: consumeCategoryParam } =
    useDeepLinkParam("category");
  const { highlightRowId, setHighlightRowId } = useRowHighlight();
  const deepLinkHandledRef = useRef<string | null>(null);

  const categories = useQuery(api.categories.list, token ? { token } : "skip") as
    | Category[]
    | undefined;

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);

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
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(row.original._id as Id<"categories">);
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
          <Button onClick={openCreate} className="w-full touch-manipulation sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </FadeIn>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your first category to organize machines in inventory."
          icon={<Tags className="h-8 w-8" />}
        />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          searchPlaceholder="Filter categories..."
          pageSize={10}
          emptyMessage="No categories match your search"
          getRowId={(row) => row._id}
          highlightRowId={highlightRowId}
          onRowClick={openEdit}
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
    </div>
  );
}
