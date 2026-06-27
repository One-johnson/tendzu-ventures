"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MachineWithMeta } from "@/types";
import { useAuth, useSessionToken } from "@/components/providers/auth-provider";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/page-loader";
import { formatCurrency } from "@/lib/format";
import { toInputDate, fromInputDate } from "@/lib/format";
import { Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function SalesPage() {
  const token = useSessionToken();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [salesperson, setSalesperson] = useState(user?.name ?? "");
  const [saleDate, setSaleDate] = useState(toInputDate(Date.now()));
  const [saving, setSaving] = useState(false);

  const machines = useQuery(api.machines.list, token ? { token } : "skip") as MachineWithMeta[] | undefined;
  const createSale = useMutation(api.sales.create);

  const selectedMachine = machines?.find((m) => m._id === machineId);
  const totalAmount = selectedMachine
    ? selectedMachine.sellingPrice * Number(quantity || 0)
    : 0;
  const exceedsStock =
    selectedMachine && Number(quantity) > selectedMachine.quantity;

  const availableMachines = machines?.filter((m) => m.isActive && m.quantity > 0) ?? [];

  const handleSubmit = async () => {
    if (!token || !machineId || !quantity || !salesperson) return;
    if (exceedsStock) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    setSaving(true);
    try {
      const result = await createSale({
        token,
        machineId: machineId as Id<"machines">,
        quantity: Number(quantity),
        salesperson,
        saleDate: fromInputDate(saleDate),
      });
      toast.success(
        `Sale recorded! Invoice: ${result.invoiceNumber} — ${formatCurrency(result.totalAmount)}`
      );
      setDialogOpen(false);
      setMachineId("");
      setQuantity("1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sale failed");
    } finally {
      setSaving(false);
    }
  };

  if (!machines) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Management</h2>
          <p className="text-slate-500">Record machine sales and generate invoices</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Sale
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Available for Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{availableMachines.length}</p>
            <p className="text-xs text-slate-500">machines in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(
                machines.reduce((sum, m) => sum + m.quantity * m.sellingPrice, 0)
              )}
            </p>
            <p className="text-xs text-slate-500">at selling price</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Low / Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {machines.filter((m) => m.stockStatus !== "available").length}
            </p>
            <p className="text-xs text-slate-500">needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Quick Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-500">
            Click &quot;Record Sale&quot; to create a new sale. Invoice numbers are
            generated automatically and stock is reduced upon completion.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Select Machine *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a machine" />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map((machine) => (
                    <SelectItem key={machine._id} value={machine._id}>
                      {machine.name} — {formatCurrency(machine.sellingPrice)} (
                      {machine.quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {exceedsStock && (
                  <p className="text-xs text-red-500">
                    Exceeds available stock ({selectedMachine?.quantity})
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Sale Date *</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Salesperson *</Label>
              <Input
                value={salesperson}
                onChange={(e) => setSalesperson(e.target.value)}
              />
            </div>
            {selectedMachine && (
              <div className="rounded-lg bg-orange-50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Unit Price:</span>
                  <span>{formatCurrency(selectedMachine.sellingPrice)}</span>
                </div>
                <div className="mt-2 flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-orange-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                saving ||
                !machineId ||
                !quantity ||
                !salesperson ||
                Number(quantity) <= 0 ||
                exceedsStock
              }
            >
              {saving ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
