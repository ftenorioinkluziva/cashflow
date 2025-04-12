"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function TransactionList({ limit = 10, filter = "all" }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchTransactions()
  }, [filter, limit])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      let query = supabase.from("transactions").select("*").order("due_date", { ascending: true })

      // Apply filters
      if (filter === "upcoming") {
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)

        query = query
          .gte("due_date", today.toISOString())
          .lte("due_date", nextWeek.toISOString())
          .eq("status", "pending")
      } else if (filter === "late") {
        const today = new Date()
        query = query.lt("due_date", today.toISOString()).eq("status", "pending")
      } else if (filter === "paid") {
        query = query.eq("status", "paid")
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
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

  const getStatusText = (status) => {
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        <Button variant="link" onClick={() => router.push("/transactions/new")} className="mt-2">
          Criar nova transação
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div className="flex flex-col">
            <span className="font-medium">{transaction.description}</span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(transaction.due_date), "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${transaction.type === "income" ? "text-green-500" : "text-red-500"}`}>
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </span>
            <Badge className={getStatusColor(transaction.status)}>{getStatusText(transaction.status)}</Badge>
          </div>
        </div>
      ))}

      {transactions.length > 0 && limit && (
        <Button variant="outline" className="w-full" onClick={() => router.push("/transactions")}>
          Ver todas as transações
        </Button>
      )}
    </div>
  )
}
