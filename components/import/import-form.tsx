"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { read, utils } from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { UploadIcon as FileUpload, FileCheck, AlertTriangle, Table, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

interface MappingField {
  sourceField: string
  targetField: string
}

interface PreviewData {
  [key: string]: any
}

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<MappingField[]>([])
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const targetFields = [
    { id: "description", name: "Descrição" },
    { id: "amount", name: "Valor" },
    { id: "type", name: "Tipo (Receita/Despesa)" },
    { id: "category", name: "Categoria" },
    { id: "due_date", name: "Data de Vencimento" },
    { id: "payment_date", name: "Data de Pagamento" },
    { id: "status", name: "Status" },
    { id: "payment_method", name: "Método de Pagamento" },
    { id: "notes", name: "Observações" },
    { id: "department", name: "Departamento" },
  ]

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const selectedFile = e.target.files[0]
    setFile(selectedFile)

    try {
      setLoading(true)
      const data = await readExcelFile(selectedFile)
      const headers = Object.keys(data[0])
      setHeaders(headers)

      // Create initial mapping suggestion
      const initialMapping = headers.map((header) => {
        // Try to find a matching target field
        const matchingTarget = targetFields.find((target) => header.toLowerCase().includes(target.id.toLowerCase()))

        return {
          sourceField: header,
          targetField: matchingTarget ? matchingTarget.id : "",
        }
      })

      setMapping(initialMapping)
      setPreviewData(data.slice(0, 5)) // First 5 rows for preview
      setStep(2)
    } catch (error) {
      console.error("Error reading file:", error)
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo. Verifique o formato.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = utils.sheet_to_json(worksheet)
          resolve(json)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = (error) => reject(error)
      reader.readAsBinaryString(file)
    })
  }

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setMapping(mapping.map((item) => (item.sourceField === sourceField ? { ...item, targetField } : item)))
  }

  const handlePreview = () => {
    setStep(3)
  }

  const handleImport = async () => {
    setLoading(true)
    setProgress(0)

    try {
      const data = await readExcelFile(file!)
      const total = data.length
      let processed = 0
      let successful = 0

      // Process in batches to show progress
      const batchSize = 20
      for (let i = 0; i < total; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const transformedBatch = batch.map((row) => {
          const transformedRow: any = {}

          mapping.forEach((map) => {
            if (map.targetField && row[map.sourceField] !== undefined) {
              let value = row[map.sourceField]

              // Handle specific field transformations
              if (map.targetField === "amount") {
                value = Number.parseFloat(value)
              } else if (map.targetField === "due_date" || map.targetField === "payment_date") {
                // Try to parse date
                if (value) {
                  try {
                    const date = new Date(value)
                    value = date.toISOString()
                  } catch (e) {
                    value = null
                  }
                } else {
                  value = null
                }
              }

              transformedRow[map.targetField] = value
            }
          })

          return transformedRow
        })

        // Insert batch into database
        const { error } = await supabase.from("transactions").insert(transformedBatch)

        if (!error) {
          successful += batch.length
        }

        processed += batch.length
        setProgress(Math.round((processed / total) * 100))
      }

      toast({
        title: "Importação concluída",
        description: `${successful} de ${total} registros importados com sucesso.`,
      })

      router.push("/transactions")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message || "Ocorreu um erro durante a importação.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importação de Dados</CardTitle>
        <CardDescription>Importe seus dados financeiros de planilhas Excel ou CSV.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" disabled={step !== 1}>
              1. Upload
            </TabsTrigger>
            <TabsTrigger value="mapping" disabled={step < 2}>
              2. Mapeamento
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={step < 3}>
              3. Revisão e Importação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <FileUpload className="w-12 h-12 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">Arraste e solte seu arquivo aqui</h3>
              <p className="text-sm text-muted-foreground mb-4">Ou clique para selecionar um arquivo</p>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="max-w-sm" />
              <p className="mt-2 text-xs text-muted-foreground">
                Formatos suportados: Excel (.xlsx, .xls) e CSV (.csv)
              </p>
            </div>

            {file && (
              <div className="flex items-center p-4 mt-4 bg-muted rounded-lg">
                <FileCheck className="w-6 h-6 mr-2 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mapping" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-muted rounded-lg">
                <AlertTriangle className="w-6 h-6 mr-2 text-amber-500" />
                <p className="text-sm">
                  Mapeie as colunas da sua planilha para os campos do sistema. Isso ajudará a importar os dados
                  corretamente.
                </p>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left">Coluna na Planilha</th>
                      <th className="p-3 text-left">Campo no Sistema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.sourceField}</td>
                        <td className="p-3">
                          <Select
                            value={item.targetField}
                            onValueChange={(value) => handleMappingChange(item.sourceField, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione um campo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">Ignorar</SelectItem>
                              {targetFields.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePreview} disabled={loading}>
                  Avançar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-muted rounded-lg">
                <AlertTriangle className="w-6 h-6 mr-2 text-amber-500" />
                <p className="text-sm">Revise os dados antes de importar. Esta é uma prévia das primeiras 5 linhas.</p>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <thead>
                    <tr className="bg-muted">
                      {mapping
                        .filter((item) => item.targetField)
                        .map((item, index) => (
                          <th key={index} className="p-3 text-left">
                            {targetFields.find((f) => f.id === item.targetField)?.name || item.targetField}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {mapping
                          .filter((item) => item.targetField)
                          .map((item, colIndex) => (
                            <td key={colIndex} className="p-3">
                              {row[item.sourceField]?.toString() || "-"}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">Importando... {progress}%</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                  Voltar
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? "Importando..." : "Importar Dados"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
