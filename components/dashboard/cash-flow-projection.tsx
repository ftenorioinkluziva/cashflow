"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCurrency } from "@/lib/utils"

interface ProjectionData {
  date: string
  income: number
  expense: number
  balance: number
}

export default function CashFlowProjection() {
  const [data, setData] = useState<ProjectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProjectionData()
  }, [days])

  // Replace the fetchProjectionData function with this implementation that doesn't rely on the stored procedure

  const fetchProjectionData = async () => {
    setLoading(true)
    try {
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("status", "paid")

      if (balanceError) throw balanceError

      // Calculate current balance
      let currentBalance = 0
      ;(balanceData || []).forEach((transaction) => {
        const amount = Number.parseFloat(transaction.amount)
        if (transaction.type === "income") {
          currentBalance += amount
        } else {
          currentBalance -= amount
        }
      })

      // Get upcoming transactions for projection
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + days)

      const { data: upcomingData, error: upcomingError } = await supabase
        .from("transactions")
        .select("amount, type, due_date")
        .eq("status", "pending")
        .gte("due_date", today.toISOString())
        .lte("due_date", endDate.toISOString())
        .order("due_date", { ascending: true })

      if (upcomingError) throw upcomingError

      // Generate projection data
      const projectionData: ProjectionData[] = []
      let runningBalance = currentBalance

      // Create a map of dates to transactions
      const transactionsByDate = new Map()
      ;(upcomingData || []).forEach((transaction) => {
        const date = new Date(transaction.due_date).toISOString().split("T")[0]
        if (!transactionsByDate.has(date)) {
          transactionsByDate.set(date, { income: 0, expense: 0 })
        }

        const amount = Number.parseFloat(transaction.amount)
        if (transaction.type === "income") {
          transactionsByDate.get(date).income += amount
        } else {
          transactionsByDate.get(date).expense += amount
        }
      })

      // Generate data for each day
      for (let i = 0; i <= days; i++) {
        const date = new Date()
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split("T")[0]

        const dayData = transactionsByDate.get(dateStr) || { income: 0, expense: 0 }

        runningBalance += dayData.income - dayData.expense

        projectionData.push({
          date: dateStr,
          income: dayData.income,
          expense: dayData.expense,
          balance: runningBalance,
        })
      }

      setData(projectionData)
    } catch (error) {
      console.error("Error fetching projection data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for initial display
  const mockData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)

    // Generate some random data
    const income = Math.random() * 1000
    const expense = Math.random() * 800
    const prevBalance = i > 0 ? mockData?.[i - 1]?.balance || 10000 : 10000
    const balance = prevBalance + income - expense

    return {
      date: format(date, "yyyy-MM-dd"),
      income,
      expense,
      balance,
    }
  })

  const displayData = data.length > 0 ? data : mockData

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, "dd/MM", { locale: ptBR })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{format(new Date(label), "dd 'de' MMMM", { locale: ptBR })}</p>
          <p className="text-sm text-green-500">Receitas: {formatCurrency(payload[0].payload.income)}</p>
          <p className="text-sm text-red-500">Despesas: {formatCurrency(payload[0].payload.expense)}</p>
          <p className="text-sm font-semibold mt-1">Saldo: {formatCurrency(payload[0].payload.balance)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Projeção de Fluxo de Caixa</CardTitle>
          <CardDescription>Projeção de saldo para os próximos dias</CardDescription>
        </div>
        <Tabs defaultValue="30" value={days.toString()} onValueChange={(value) => setDays(Number.parseInt(value))}>
          <TabsList>
            <TabsTrigger value="15">15 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
            <TabsTrigger value="60">60 dias</TabsTrigger>
            <TabsTrigger value="90">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} interval={Math.floor(displayData.length / 10)} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
