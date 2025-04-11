"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format, isToday, isTomorrow, addDays, isWithinInterval } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Bell, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface Transaction {
  id: string
  description: string
  amount: number
  due_date: string
  status: string
  type: "income" | "expense"
}

export default function UpcomingPayments() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchUpcomingTransactions()
  }, [])

  const fetchUpcomingTransactions = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const nextWeek = addDays(today, 7)

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "pending")
        .gte("due_date", today.toISOString())
        .lte("due_date", nextWeek.toISOString())
        .order("due_date", { ascending: true })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching upcoming transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Transação atualizada",
        description: "A transação foi marcada como paga.",
      })

      // Update the local state
      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getDueDateLabel = (dueDate: string) => {
    const date = new Date(dueDate)
    if (isToday(date)) return "Hoje"
    if (isTomorrow(date)) return "Amanhã"
    return format(date, "dd 'de' MMMM", { locale: ptBR })
  }

  const getDueDateColor = (dueDate: string) => {
    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = addDays(today, 1)
    const dayAfterTomorrow = addDays(today, 2)

    if (isToday(date)) return "bg-red-500"
    if (isTomorrow(date)) return "bg-amber-500"
    if (isWithinInterval(date, { start: tomorrow, end: dayAfterTomorrow })) return "bg-amber-400"
    return "bg-blue-500"
  }

  // Mock data for initial display
  const mockTransactions = [
    {
      id: "1",
      description: "Aluguel do Escritório",
      amount: 3500,
      due_date: addDays(new Date(), 1).toISOString(),
      status: "pending",
      type: "expense" as const,
    },
    {
      id: "2",
      description: "Pagamento Cliente XYZ",
      amount: 7800,
      due_date: addDays(new Date(), 2).toISOString(),
      status: "pending",
      type: "income" as const,
    },
    {
      id: "3",
      description: "Conta de Energia",
      amount: 450,
      due_date: addDays(new Date(), 3).toISOString(),
      status: "pending",
      type: "expense" as const,
    },
  ]

  const displayTransactions = transactions.length > 0 ? transactions : mockTransactions

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Próximos Vencimentos</CardTitle>
          <CardDescription>Contas a vencer nos próximos 7 dias</CardDescription>
        </div>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-muted-foreground">Não há contas a vencer nos próximos dias</p>
            </div>
          ) : (
            displayTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Badge className={getDueDateColor(transaction.due_date)}>
                    {getDueDateLabel(transaction.due_date)}
                  </Badge>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p
                      className={`text-sm font-medium ${
                        transaction.type === "income" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(transaction.id)}>
                  Marcar como pago
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full" onClick={fetchUpcomingTransactions}>
          Atualizar
        </Button>
      </CardFooter>
    </Card>
  )
}
