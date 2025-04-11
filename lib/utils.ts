import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: Date | string): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-BR")
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "bg-green-500 hover:bg-green-600"
    case "pending":
      return "bg-amber-500 hover:bg-amber-600"
    case "late":
      return "bg-red-500 hover:bg-red-600"
    case "canceled":
      return "bg-gray-500 hover:bg-gray-600"
    default:
      return "bg-gray-500 hover:bg-gray-600"
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case "paid":
      return "Pago"
    case "pending":
      return "Pendente"
    case "late":
      return "Atrasado"
    case "canceled":
      return "Cancelado"
    default:
      return status
  }
}
