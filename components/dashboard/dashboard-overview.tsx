"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import TransactionList from "@/components/transactions/transaction-list"
import ExpenseByCategorySimple from "@/components/dashboard/expense-by-category-simple"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

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
  const [error, setError] = useState(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Verificar a sessão do usuário ao carregar o componente
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth error:", error.message)
          toast({
            title: "Erro de autenticação",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        if (!data.session) {
          router.push("/login")
          return
        }

        // Se a sessão estiver válida, busca os dados
        fetchDashboardData()
      } catch (err) {
        console.error("Session check error:", err)
        router.push("/login")
      }
    }

    checkSession()
  }, [period, router])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Verificar novamente a sessão antes de fazer requisições
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push("/login")
        return
      }

      // Calculate date range based on period
      let startDate, endDate
      const today = new Date()

      switch (period) {
        case "week":
          startDate = new Date(today)
          startDate.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6) // End of week (Saturday)
          break
        case "month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        case "quarter":
          const quarter = Math.floor(today.getMonth() / 3)
          startDate = new Date(today.getFullYear(), quarter * 3, 1)
          endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0)
          break
        case "year":
          startDate = new Date(today.getFullYear(), 0, 1)
          endDate = new Date(today.getFullYear(), 11, 31)
          break
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      }

      // Fetch all transactions for calculations
      const { data: allTransactions, error: transactionsError } = await supabase.from("transactions").select("*")

      if (transactionsError) {
        // Verificar se é um erro de autenticação
        if (
          transactionsError.code === "PGRST301" ||
          transactionsError.code === "401" ||
          transactionsError.message.includes("JWT")
        ) {
          toast({
            title: "Sessão expirada",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }
        throw transactionsError
      }

      // Calculate summary data
      let balance = 0
      let periodIncome = 0
      let periodExpense = 0
      let pendingCount = 0

      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      if (allTransactions) {
        allTransactions.forEach((transaction) => {
          const amount = Number.parseFloat(transaction.amount)
          const transactionDate = new Date(transaction.due_date)

          // Calculate balance from all paid transactions
          if (transaction.status === "paid") {
            if (transaction.type === "income") {
              balance += amount
            } else {
              balance -= amount
            }
          }

          // Calculate period income/expense
          if (transactionDate >= startDate && transactionDate <= endDate) {
            if (transaction.type === "income") {
              periodIncome += amount
            } else {
              periodExpense += amount
            }
          }

          // Count pending transactions for next 7 days
          if (transaction.status === "pending" && transactionDate >= today && transactionDate <= nextWeek) {
            pendingCount++
          }
        })
      }

      setSummary({
        balance,
        income: periodIncome,
        expense: periodExpense,
        pendingCount,
      })

      // Generate chart data
      const newChartData = []

      // Determine interval and format based on period
      let format
      switch (period) {
        case "week":
          // Para semana, agrupamos por dia
          for (let i = 0; i <= 6; i++) {
            const date = new Date(startDate)
            date.setDate(startDate.getDate() + i)
            const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()]

            newChartData.push({
              name: dayName,
              income: 0,
              expense: 0,
              date: new Date(date),
            })
          }
          break
        case "month":
          // Para mês, agrupamos por semana
          for (let i = 1; i <= 5; i++) {
            newChartData.push({
              name: `Sem ${i}`,
              income: 0,
              expense: 0,
              weekNum: i,
            })
          }
          break
        case "quarter":
        case "year":
          // Para trimestre e ano, agrupamos por mês
          const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
          const startMonth = startDate.getMonth()
          const endMonth = endDate.getMonth()
          const startYear = startDate.getFullYear()
          const endYear = endDate.getFullYear()

          // Cria um objeto para cada mês no intervalo
          for (let year = startYear; year <= endYear; year++) {
            const monthStart = year === startYear ? startMonth : 0
            const monthEnd = year === endYear ? endMonth : 11

            for (let month = monthStart; month <= monthEnd; month++) {
              newChartData.push({
                name: monthNames[month],
                income: 0,
                expense: 0,
                month: month,
                year: year,
                key: `${year}-${month}`,
              })
            }
          }
          break
        default:
          // Padrão é agrupar por semana
          for (let i = 1; i <= 5; i++) {
            newChartData.push({
              name: `Sem ${i}`,
              income: 0,
              expense: 0,
              weekNum: i,
            })
          }
      }

      // Agora, vamos preencher os dados para cada intervalo
      if (allTransactions) {
        allTransactions.forEach((transaction) => {
          const transactionDate = new Date(transaction.due_date)

          // Verifica se a transação está dentro do período selecionado
          if (transactionDate >= startDate && transactionDate <= endDate) {
            const amount = Number.parseFloat(transaction.amount)

            // Encontra o índice correto com base no período
            let index = -1

            if (period === "week") {
              // Para semana, índice é o dia da semana (0-6)
              const dayDiff = Math.floor((transactionDate - startDate) / (1000 * 60 * 60 * 24))
              index = Math.min(dayDiff, 6)
            } else if (period === "month") {
              // Para mês, índice é a semana do mês (1-5)
              const weekNum = Math.ceil(transactionDate.getDate() / 7)
              index = newChartData.findIndex((item) => item.weekNum === weekNum)
            } else if (period === "quarter" || period === "year") {
              // Para trimestre e ano, índice é baseado no mês e ano
              const key = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`
              index = newChartData.findIndex((item) => item.key === key)
            }

            // Adiciona o valor ao período correto
            if (index >= 0 && index < newChartData.length) {
              if (transaction.type === "income") {
                newChartData[index].income += amount
              } else {
                newChartData[index].expense += amount
              }
            }
          }
        })
      }

      setChartData(newChartData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError(error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Mock data for initial display
  const mockChartData = [
    { name: "Jan", income: 4000, expense: 2400 },
    { name: "Fev", income: 3000, expense: 1398 },
    { name: "Mar", income: 2000, expense: 9800 },
    { name: "Abr", income: 2780, expense: 3908 },
    { name: "Mai", income: 1890, expense: 4800 },
    { name: "Jun", income: 2390, expense: 3800 },
  ]

  // Se houver erro de autenticação, mostra mensagem e botão para login
  if (
    error &&
    (error.code === "PGRST301" || error.code === "401" || (error.message && error.message.includes("JWT")))
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-amber-500" />
        <h2 className="text-2xl font-bold">Sessão expirada</h2>
        <p className="text-muted-foreground">Sua sessão expirou ou você não está autenticado.</p>
        <button
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          onClick={() => router.push("/login")}
        >
          Fazer login
        </button>
      </div>
    )
  }

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

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
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
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.length > 0 ? chartData : mockChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="income" name="Receitas" fill="#10b981" />
                      <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Próximos Vencimentos</CardTitle>
                <CardDescription>Contas a vencer nos próximos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionList limit={5} filter="upcoming" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>
                  Distribuição de despesas por categoria principal no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ExpenseByCategorySimple period={period} />
              </CardContent>
            </Card>
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
        </>
      )}
    </div>
  )
}
