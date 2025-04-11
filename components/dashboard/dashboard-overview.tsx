"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import TransactionList from "@/components/transactions/transaction-list"
import UpcomingPayments from "@/components/dashboard/upcoming-payments"
import ExpenseByCategory from "@/components/dashboard/expense-by-category"
import { formatCurrency } from "@/lib/utils"

export default function DashboardOverview() {
  const [summary, setSummary] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    pendingCount: 0,
  })
  const [chartData, setChartData] = useState([])
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        // Fetch summary data
        const { data: summaryData, error: summaryError } = await supabase.rpc("get_financial_summary", {
          period_type: period,
        })

        if (summaryError) throw summaryError

        if (summaryData) {
          setSummary({
            balance: summaryData.balance || 0,
            income: summaryData.income || 0,
            expense: summaryData.expense || 0,
            pendingCount: summaryData.pending_count || 0,
          })
        }

        // Fetch chart data
        const { data: chartData, error: chartError } = await supabase.rpc("get_financial_chart_data", {
          period_type: period,
        })

        if (chartError) throw chartError

        if (chartData) {
          setChartData(chartData)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [period, supabase])

  // Mock data for initial display
  const mockChartData = [
    { name: "Jan", income: 4000, expense: 2400 },
    { name: "Fev", income: 3000, expense: 1398 },
    { name: "Mar", income: 2000, expense: 9800 },
    { name: "Abr", income: 2780, expense: 3908 },
    { name: "Mai", income: 1890, expense: 4800 },
    { name: "Jun", income: 2390, expense: 3800 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
        <Tabs defaultValue="month" value={period} onValueChange={setPeriod} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="quarter">Trimestre</TabsTrigger>
            <TabsTrigger value="year">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.balance)}</div>
            <p className="text-xs text-muted-foreground">Saldo consolidado de todas as contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</div>
            <p className="text-xs text-muted-foreground">Total de receitas no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(summary.expense)}</div>
            <p className="text-xs text-muted-foreground">Total de despesas no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Contas a vencer nos próximos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
            <CardDescription>Comparativo de receitas e despesas no período</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData.length > 0 ? chartData : mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="income" name="Receitas" fill="#10b981" />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <UpcomingPayments />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ExpenseByCategory />
        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>Transações mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionList limit={5} filter="all" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
