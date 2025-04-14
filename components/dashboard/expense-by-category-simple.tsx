"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C", "#D0ED57"]

export default function ExpenseByCategorySimple({ period = "month" }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchCategoryExpenses()
  }, [period])

  const fetchCategoryExpenses = async () => {
    setLoading(true)
    setError(null)

    try {
      // Verificar a sessão antes de fazer requisições
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Session error:", sessionError)
        setError(sessionError)
        toast({
          title: "Erro de autenticação",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      if (!sessionData.session) {
        const authError = new Error("Sessão não encontrada")
        authError.code = "401"
        setError(authError)
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

      // Direct query to get expenses grouped by category
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          amount,
          type,
          categories:category_id (
            id,
            name,
            parent_id,
            parent:parent_id(id, name)
          )
        `)
        .eq("type", "expense")
        .gte("due_date", startDate.toISOString())
        .lte("due_date", endDate.toISOString())

      if (error) {
        // Verificar se é um erro de autenticação
        if (error.code === "PGRST301" || error.code === "401" || error.message.includes("JWT")) {
          toast({
            title: "Sessão expirada",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }
        throw error
      }

      // Process the data to group by category
      const categoryMap = new Map()

      if (data) {
        data.forEach((transaction) => {
          if (!transaction.categories) return

          // Determine if we should use parent category or current category
          let categoryId, categoryName

          if (transaction.categories.parent && transaction.categories.parent.id) {
            // Use parent category
            categoryId = transaction.categories.parent.id
            categoryName = transaction.categories.parent.name
          } else {
            // Use current category (it's already a main category)
            categoryId = transaction.categories.id
            categoryName = transaction.categories.name
          }

          const amount = Number.parseFloat(transaction.amount)

          if (categoryMap.has(categoryId)) {
            categoryMap.get(categoryId).amount += amount
          } else {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: categoryName,
              amount: amount,
            })
          }
        })
      }

      // Convert map to array and sort by amount
      const transformedData = Array.from(categoryMap.values())
        .sort((a, b) => b.amount - a.amount)
        .map((item, index) => ({
          ...item,
          color: COLORS[index % COLORS.length],
        }))

      setData(transformedData)
    } catch (error) {
      console.error("Error fetching category expenses:", error)
      setError(error)

      if (!error.code || (error.code !== "PGRST301" && error.code !== "401" && !error.message?.includes("JWT"))) {
        toast({
          title: "Erro ao carregar despesas por categoria",
          description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
          variant: "destructive",
        })
      }
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
  const mockData = [
    { name: "Alimentação", amount: 1200, color: COLORS[0] },
    { name: "Transporte", amount: 800, color: COLORS[1] },
    { name: "Moradia", amount: 2000, color: COLORS[2] },
    { name: "Lazer", amount: 500, color: COLORS[3] },
    { name: "Saúde", amount: 700, color: COLORS[4] },
  ]

  // Se houver erro de autenticação, mostra mensagem e botão para login
  if (
    error &&
    (error.code === "PGRST301" || error.code === "401" || (error.message && error.message.includes("JWT")))
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-center text-muted-foreground">Sessão expirada. Faça login novamente.</p>
        <Button size="sm" onClick={() => router.push("/login")}>
          Fazer login
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">Nenhuma despesa registrada neste período</p>
      </div>
    )
  }

  const displayData = data.length > 0 ? data : mockData

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={displayData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="amount"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
