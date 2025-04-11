"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface Transaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  due_date: string
  status: "pending" | "paid" | "late" | "canceled"
}

interface TransactionListProps {
  limit?: number
  filter?: "all" | "upcoming" | "late" | "paid"
}

export default function TransactionList({ limit = 10, filter = "all" }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
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

    fetchTransactions()
  }, [supabase, limit, filter])

  // Mock data for initial display
  const mockTransactions = [
    {
      id: "1",
      description: "Aluguel do Escritório",
      amount: 3500,
      type: "expense",
      due_date: "2023-05-10T00:00:00.000Z",
      status: "pending",
    },
    {
      id: "2",
      description: "Pagamento Cliente XYZ",
      amount: 7800,
      type: "income",
      due_date: "2023-05-15T00:00:00.000Z",
      status: "pending",
    },
    {
      id: "3",
      description: "Conta de Energia",
      amount: 450,
      type: "expense",
      due_date: "2023-05-20T00:00:00.000Z",
      status: "pending",
    },
    {
      id: "4",
      description: "Impostos Mensais",
      amount: 1200,
      type: "expense",
      due_date: "2023-05-25T00:00:00.000Z",
      status: "pending",
    },
    {
      id: "5",
      description: "Assinatura Software",
      amount: 299,
      type: "expense",
      due_date: "2023-05-28T00:00:00.000Z",
      status: "pending",
    },
  ] as Transaction[]

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const displayTransactions = transactions.length > 0 ? transactions : mockTransactions

  return (
    <div className="space-y-4">
      {displayTransactions.map((transaction) => (
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

      {displayTransactions.length === 0 && (
        <div className="text-center py-6">
          <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      )}

      {displayTransactions.length > 0 && limit && (
        <Button variant="outline" className="w-full">
          Ver todas as transações
        </Button>
      )}
    </div>
  )
}
