"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, FileDown, FileUp, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface Transaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  category_id: string
  category_name?: string
  due_date: string
  payment_date: string | null
  status: "pending" | "paid" | "late" | "canceled"
  payment_method: string | null
}

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        // Calculate range for pagination
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        // Build query
        let query = supabase
          .from("transactions")
          .select(
            `
            *,
            categories(name)
          `,
            { count: "exact" },
          )
          .order("due_date", { ascending: false })
          .range(from, to)

        // Apply filters
        if (search) {
          query = query.ilike("description", `%${search}%`)
        }

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter)
        }

        if (typeFilter !== "all") {
          query = query.eq("type", typeFilter)
        }

        const { data, count, error } = await query

        if (error) throw error

        // Transform data to include category name
        const transformedData =
          data?.map((item) => ({
            ...item,
            category_name: item.categories?.name,
          })) || []

        setTransactions(transformedData)
        setTotalPages(Math.ceil((count || 0) / pageSize))
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [supabase, page, pageSize, search, statusFilter, typeFilter])

  // Mock data for initial display
  const mockTransactions = [
    {
      id: "1",
      description: "Aluguel do Escritório",
      amount: 3500,
      type: "expense",
      category_id: "1",
      category_name: "Instalações",
      due_date: "2023-05-10T00:00:00.000Z",
      payment_date: null,
      status: "pending",
      payment_method: "Transferência",
    },
    {
      id: "2",
      description: "Pagamento Cliente XYZ",
      amount: 7800,
      type: "income",
      category_id: "2",
      category_name: "Vendas",
      due_date: "2023-05-15T00:00:00.000Z",
      payment_date: null,
      status: "pending",
      payment_method: "Boleto",
    },
    {
      id: "3",
      description: "Conta de Energia",
      amount: 450,
      type: "expense",
      category_id: "3",
      category_name: "Utilidades",
      due_date: "2023-05-20T00:00:00.000Z",
      payment_date: null,
      status: "pending",
      payment_method: "Débito Automático",
    },
    {
      id: "4",
      description: "Impostos Mensais",
      amount: 1200,
      type: "expense",
      category_id: "4",
      category_name: "Impostos",
      due_date: "2023-05-25T00:00:00.000Z",
      payment_date: null,
      status: "pending",
      payment_method: "DARF",
    },
    {
      id: "5",
      description: "Assinatura Software",
      amount: 299,
      type: "expense",
      category_id: "5",
      category_name: "Serviços",
      due_date: "2023-05-28T00:00:00.000Z",
      payment_date: null,
      status: "pending",
      payment_method: "Cartão de Crédito",
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

  const handleAddTransaction = () => {
    router.push("/transactions/new")
  }

  const handleExport = () => {
    // Implement export functionality
    console.log("Export transactions")
  }

  const handleImport = () => {
    router.push("/import")
  }

  const displayTransactions = transactions.length > 0 ? transactions : mockTransactions

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="late">Atrasado</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <FileUp className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={handleAddTransaction}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Método</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTransactions.map((transaction) => (
              <TableRow key={transaction.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="font-medium">{transaction.description}</TableCell>
                <TableCell>{transaction.category_name || "Sem categoria"}</TableCell>
                <TableCell>{format(new Date(transaction.due_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                <TableCell className={transaction.type === "income" ? "text-green-500" : "text-red-500"}>
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(transaction.status)}>{getStatusText(transaction.status)}</Badge>
                </TableCell>
                <TableCell>{transaction.payment_method || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Mostrando {displayTransactions.length} de {pageSize * totalPages} resultados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPage(page - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
