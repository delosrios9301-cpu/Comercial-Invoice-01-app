"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, History, Filter } from "lucide-react"
import Link from "next/link"

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  user_name: string | null
  sede_id: string | null
  sede_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  description: string | null
  created_at: string
}

interface Sede {
  id: string
  name: string
}

export default function AuditPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  
  // Filters
  const [selectedSede, setSelectedSede] = useState<string>("all")
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all")

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check permissions
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, can_view_audit")
        .eq("id", user.id)
        .single()

      if (!profile?.is_admin && !profile?.can_view_audit) {
        setHasPermission(false)
        setLoading(false)
        return
      }

      setHasPermission(true)

      // Fetch sedes for filter
      const { data: sedesData } = await supabase.from("sedes").select("id, name")
      if (sedesData) setSedes(sedesData)

      // Fetch audit logs
      await fetchLogs()
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  const fetchLogs = async () => {
    let url = "/api/audit?limit=200"
    
    if (selectedSede !== "all") {
      url += `&sede_id=${selectedSede}`
    }
    
    if (selectedEntityType !== "all") {
      url += `&entity_type=${selectedEntityType}`
    }

    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setLogs(data)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (hasPermission) {
      fetchLogs()
    }
  }, [selectedSede, selectedEntityType, hasPermission])

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Crear</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-500">Actualizar</Badge>
      case "DELETE":
        return <Badge className="bg-red-500">Eliminar</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "study":
        return "Estudio"
      case "sample_description":
        return "Descripcion de Muestra"
      case "user":
        return "Usuario"
      case "sede":
        return "Sede"
      default:
        return type
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permiso para ver el historial de cambios
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/">
              <Button>Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6" />
              <CardTitle className="text-2xl">Historial de Cambios</CardTitle>
            </div>
            <CardDescription>
              Registro de todas las modificaciones realizadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label>Filtros:</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sede:</Label>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sedes</SelectItem>
                    {sedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Tipo:</Label>
                <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="study">Estudios</SelectItem>
                    <SelectItem value="sample_description">Muestras</SelectItem>
                    <SelectItem value="user">Usuarios</SelectItem>
                    <SelectItem value="sede">Sedes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Sede</TableHead>
                    <TableHead>Accion</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Elemento</TableHead>
                    <TableHead>Descripcion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay registros de cambios
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user_name || "Sin nombre"}</div>
                            <div className="text-xs text-muted-foreground">{log.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{log.sede_name || "-"}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>{getEntityTypeName(log.entity_type)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {log.entity_name || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {logs.length} registros
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
