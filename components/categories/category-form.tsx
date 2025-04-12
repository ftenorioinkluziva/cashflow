"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface Category {
  id: string
  name: string
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  description: z.string().optional(),
  parent_id: z.string().optional(),
})

export default function CategoryForm({ categoryId }: { categoryId?: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingInitialData, setLoadingInitialData] = useState(!!categoryId)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: "",
    },
  })

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const { data, error } = await supabase.from("categories").select("id, name").order("name")

        if (error) throw error
        setCategories(data || [])
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Erro ao carregar categorias",
          description: "Não foi possível carregar as categorias.",
          variant: "destructive",
        })
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [supabase, toast])

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!categoryId) return

      setLoadingInitialData(true)
      try {
        const { data, error } = await supabase.from("categories").select("*").eq("id", categoryId).single()

        if (error) throw error
        if (data) {
          form.reset({
            name: data.name,
            description: data.description || "",
            parent_id: data.parent_id || "",
          })
        }
      } catch (error) {
        console.error("Error fetching category:", error)
        toast({
          title: "Erro ao carregar categoria",
          description: "Não foi possível carregar os dados da categoria.",
          variant: "destructive",
        })
      } finally {
        setLoadingInitialData(false)
      }
    }

    fetchCategoryData()
  }, [categoryId, form, supabase, toast])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      if (categoryId) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: values.name,
            description: values.description || null,
            parent_id: values.parent_id || null,
          })
          .eq("id", categoryId)

        if (error) throw error

        toast({
          title: "Categoria atualizada",
          description: "A categoria foi atualizada com sucesso.",
        })
      } else {
        // Create new category
        const { error } = await supabase.from("categories").insert({
          name: values.name,
          description: values.description || null,
          parent_id: values.parent_id || null,
        })

        if (error) throw error

        toast({
          title: "Categoria criada",
          description: "A categoria foi criada com sucesso.",
        })
      }

      router.push("/categories")
      router.refresh()
    } catch (error: any) {
      toast({
        title: categoryId ? "Erro ao atualizar categoria" : "Erro ao criar categoria",
        description: error.message || "Ocorreu um erro ao processar a categoria.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingInitialData) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da categoria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da categoria"
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria Pai</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        {loadingCategories ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Carregando categorias...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Selecione uma categoria pai (opcional)" />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {categories
                        .filter((c) => c.id !== categoryId) // Prevent selecting self as parent
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Opcional. Selecione uma categoria pai para criar uma hierarquia.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {categoryId ? "Atualizando..." : "Criando..."}
                  </>
                ) : categoryId ? (
                  "Atualizar"
                ) : (
                  "Criar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
