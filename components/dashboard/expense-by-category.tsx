"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface CategoryExpense {
  id: string
  name: string
  amount: number
  color: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C", "#D0ED57"]

export default function ExpenseByCategory() {
  const [data, setData] = useState<CategoryExpense[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchCategoryExpenses()
  }, [])

  const fetchCategoryExpenses = async () => {
    setLoading(true)
    try {
      // Get current month's start and end dates
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      // Direct query to get expenses grouped by category
      const { data, error } = await supabase
        .from("transactions")
        .select(`
        amount,
        type,
        categories:category_id (
          id,
          name
        )
      `)
        .eq("type", "expense")
        .gte("due_date", startOfMonth.toISOString())
        .lte("due_date", endOfMonth.toISOString())

      if (error) throw error

      // Process the data to group by category
      const categoryMap = new Map()
      ;(data || []).forEach((transaction) => {
        if (!transaction.categories) return

        const categoryId = transaction.categories.id
        const categoryName = transaction.categories.name
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
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Distribuição de despesas do mês atual</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Distribuição de despesas do mês atual</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <p className="text-muted-foreground">Nenhuma despesa registrada neste mês</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por Categoria</CardTitle>
        <CardDescription>Distribuição de despesas do mês atual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
