"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Category {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  parent_name?: string
}

export default function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    parent_id: "",
  })
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("categories")
        .select(`
          *,
          parent:parent_id(name)
        `)
        .order("name")

      if (error) throw error

      // Transform data to include parent name
      const transformedData =
        data?.map((item) => ({
          ...item,
          parent_name: item.parent?.name,
        })) || []

      setCategories(transformedData)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Erro ao carregar categorias",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Mock data for initial display
  const mockCategories = [
    {
      id: "1",
      name: "Instalações",
      description: "Despesas com instalações físicas",
      parent_id: null,
      parent_name: null,
    },
    { id: "2", name: "Vendas", description: "Receitas de vendas", parent_id: null, parent_name: null },
    { id: "3", name: "Utilidades", description: "Contas de serviços", parent_id: null, parent_name: null },
    { id: "4", name: "Impostos", description: "Tributos e impostos", parent_id: null, parent_name: null },
    { id: "5", name: "Serviços", description: "Serviços contratados", parent_id: null, parent_name: null },
    { id: "6", name: "Salários", description: "Folha de pagamento", parent_id: null, parent_name: null },
    { id: "7", name: "Marketing", description: "Despesas com marketing", parent_id: null, parent_name: null },
    { id: "8", name: "Equipamentos", description: "Compra de equipamentos", parent_id: null, parent_name: null },
  ]

  const displayCategories = categories.length > 0 ? categories : mockCategories

  const filteredCategories = displayCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(search.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(search.toLowerCase())),
  )

  const handleAddCategory = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: newCategory.name,
          description: newCategory.description || null,
          parent_id: newCategory.parent_id || null,
        })
        .select()

      if (error) throw error

      toast({
        title: "Categoria adicionada",
        description: "A categoria foi adicionada com sucesso.",
      })

      setNewCategory({ name: "", description: "", parent_id: "" })
      setIsAddDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar categoria",
        description: error.message || "Ocorreu um erro ao adicionar a categoria.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = async () => {
    if (!categoryToEdit) return

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: categoryToEdit.name,
          description: categoryToEdit.description,
          parent_id: categoryToEdit.parent_id,
        })
        .eq("id", categoryToEdit.id)

      if (error) throw error

      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      })

      setIsEditDialogOpen(false)
      setCategoryToEdit(null)
      fetchCategories()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message || "Ocorreu um erro ao atualizar a categoria.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      // Check if category is in use
      const { count, error: countError } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("category_id", categoryToDelete.id)

      if (countError) throw countError

      if (count && count > 0) {
        toast({
          title: "Não é possível excluir",
          description: `Esta categoria está sendo usada em ${count} transações.`,
          variant: "destructive",
        })
        setCategoryToDelete(null)
        return
      }

      const { error } = await supabase.from("categories").delete().eq("id", categoryToDelete.id)

      if (error) throw error

      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      })

      setCategoryToDelete(null)
      fetchCategories()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message || "Ocorreu um erro ao excluir a categoria.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Buscar categorias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Categoria</DialogTitle>
              <DialogDescription>Crie uma nova categoria para organizar suas transações.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Categoria Pai</Label>
                <Select
                  value={newCategory.parent_id}
                  onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria pai (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {displayCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCategory} disabled={!newCategory.name}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria Pai</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.description || "-"}</TableCell>
                <TableCell>{category.parent_name || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCategoryToEdit(category)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(category)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"? Esta ação não pode
                            ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteCategory}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCategories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  Nenhuma categoria encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>Atualize as informações da categoria.</DialogDescription>
          </DialogHeader>
          {categoryToEdit && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={categoryToEdit.name}
                  onChange={(e) => setCategoryToEdit({ ...categoryToEdit, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={categoryToEdit.description || ""}
                  onChange={(e) => setCategoryToEdit({ ...categoryToEdit, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent">Categoria Pai</Label>
                <Select
                  value={categoryToEdit.parent_id || ""}
                  onValueChange={(value) => setCategoryToEdit({ ...categoryToEdit, parent_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria pai (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {displayCategories
                      .filter((c) => c.id !== categoryToEdit.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditCategory} disabled={!categoryToEdit?.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
