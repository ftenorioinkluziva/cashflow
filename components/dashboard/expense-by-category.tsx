"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils"

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

      // Query to get expenses grouped by category
      const { data, error } = await supabase.rpc("get_expenses_by_category", {
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      })

      if (error) throw error

      // Transform data and assign colors
      const transformedData = (data || []).map((item, index) => ({
        id: item.category_id,
        name: item.category_name,
        amount: Number.parseFloat(item.total_amount),
        color: COLORS[index % COLORS.length],
      }))

      setData(transformedData)
    } catch (error) {
      console.error("Error fetching category expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for initial display
  const mockData = [
    { id: "1", name: "Instalações", amount: 3500, color: COLORS[0] },
    { id: "2", name: "Serviços", amount: 2800, color: COLORS[1] },
    { id: "3", name: "Impostos", amount: 1200, color: COLORS[2] },
    { id: "4", name: "Utilidades", amount: 950, color: COLORS[3] },
    { id: "5", name: "Outros", amount: 1500, color: COLORS[4] },
  ]

  const displayData = data.length > 0 ? data : mockData

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
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
