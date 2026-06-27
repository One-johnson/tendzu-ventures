export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GH").format(value);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatDateOnly(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

export function toInputDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

export function fromInputDate(value: string): number {
  return new Date(`${value}T12:00:00`).getTime();
}
