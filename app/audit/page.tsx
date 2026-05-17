"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Eye, RefreshCw } from "lucide-react"

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  user_name: string
  sede_id: string
  sede_name: string
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  description: string
  created_at: string
}

interface Sede {
  id: string
  name: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string
}

export default function AuditPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  
  // Filters
  const [entityType, setEntityType] = useState<string>("all")
  const [sedeId, setSedeId] = useState<string>("all")
  const [userId, setUserId] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  
  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", limit.toString())
      params.set("offset", (page * limit).toString())
      
      if (entityType && entityType !== "all") params.set("entity_type", entityType)
      if (sedeId && sedeId !== "all") params.set("sede_id", sedeId)
      if (userId && userId !== "all") params.set("user_id", userId)
      if (startDate) params.set("start_date", startDate)
      if (endDate) params.set("end_date", endDate)

      const response = await fetch(`/api/audit?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      } else {
        if (response.status === 403) {
          router.push("/")
        }
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }, [page, entityType, sedeId, userId, startDate, endDate, router])

  const fetchFiltersData = useCallback(async () => {
    // Fetch sedes for filter
    const { data: sedesData } = await supabase.from("sedes").select("id, name")
    if (sedesData) setSedes(sedesData)

    // Fetch users for filter
    const { data: usersData } = await supabase.from("profiles").select("id, email, full_name")
    if (usersData) setUsers(usersData)
  }, [supabase])

  useEffect(() => {
    fetchFiltersData()
  }, [fetchFiltersData])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Crear</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-500">Editar</Badge>
      case "DELETE":
        return <Badge className="bg-red-500">Eliminar</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "study": return "Estudio"
      case "sample_description": return "Descripcion de Muestra"
      case "user": return "Usuario"
      case "sede": return "Sede"
      default: return type
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Registro de Auditoria</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Filtra los registros de auditoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Tipo de Entidad</Label>
                <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="study">Estudios</SelectItem>
                    <SelectItem value="sample_description">Muestras</SelectItem>
                    <SelectItem value="user">Usuarios</SelectItem>
                    <SelectItem value="sede">Sedes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sede</Label>
                <Select value={sedeId} onValueChange={(v) => { setSedeId(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {sedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>{sede.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Usuario</Label>
                <Select value={userId} onValueChange={(v) => { setUserId(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay registros de auditoria
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Accion</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Entidad</TableHead>
                        <TableHead>Sede</TableHead>
                        <TableHead className="text-right">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{log.user_name}</span>
                              <span className="text-xs text-muted-foreground">{log.user_email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>{getEntityTypeName(log.entity_type)}</TableCell>
                          <TableCell>{log.entity_name || "-"}</TableCell>
                          <TableCell>{log.sede_name || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Registro</DialogTitle>
              <DialogDescription>
                Informacion completa del cambio realizado
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Fecha</Label>
                    <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Accion</Label>
                    <p>{getActionBadge(selectedLog.action)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Usuario</Label>
                    <p className="font-medium">{selectedLog.user_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sede</Label>
                    <p className="font-medium">{selectedLog.sede_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo de Entidad</Label>
                    <p className="font-medium">{getEntityTypeName(selectedLog.entity_type)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nombre de Entidad</Label>
                    <p className="font-medium">{selectedLog.entity_name || "N/A"}</p>
                  </div>
                </div>

                {selectedLog.description && (
                  <div>
                    <Label className="text-muted-foreground">Descripcion</Label>
                    <p className="font-medium">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.old_data && (
                  <div>
                    <Label className="text-muted-foreground">Datos Anteriores</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <Label className="text-muted-foreground">Datos Nuevos</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
