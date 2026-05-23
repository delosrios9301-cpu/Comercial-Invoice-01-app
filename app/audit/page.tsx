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
import { 
  ArrowLeft, 
  History, 
  Filter, 
  RefreshCw, 
  FileText, 
  Users, 
  Building2, 
  FlaskConical,
  TrendingUp,
  Clock,
  Eye,
  Trash2
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

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

interface UserProfile {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  can_view_audit: boolean
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export default function AuditPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Filters
  const [selectedSede, setSelectedSede] = useState<string>("all")
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all")

  const fetchLogs = useCallback(async () => {
    let url = "/api/audit?limit=500"
    
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
  }, [selectedSede, selectedEntityType])

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
      setIsAdmin(profile?.is_admin || false)

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
  }, [supabase, router, fetchLogs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch when filters change
  useEffect(() => {
    if (hasPermission) {
      fetchLogs()
    }
  }, [selectedSede, selectedEntityType, hasPermission, fetchLogs])

  // Setup realtime subscription for new audit logs
  useEffect(() => {
    if (!hasPermission) return

    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          const newLog = payload.new as AuditLog
          
          // Check if it matches current filters
          const matchesSede = selectedSede === "all" || newLog.sede_id === selectedSede
          const matchesType = selectedEntityType === "all" || newLog.entity_type === selectedEntityType
          
          if (matchesSede && matchesType) {
            setLogs((prevLogs) => [newLog, ...prevLogs])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, hasPermission, selectedSede, selectedEntityType])

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchLogs()
    setIsRefreshing(false)
  }

  // Reset audit logs (admin only)
  const handleResetAuditLogs = async () => {
    setIsResetting(true)
    try {
      const res = await fetch("/api/audit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
      
      if (res.ok) {
        setLogs([])
        setShowResetDialog(false)
        // Log the reset action
        await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RESET",
            entity_type: "audit_logs",
            entity_name: "Historial de Auditoría",
            description: "Contador del historial detallado reiniciado",
          }),
        })
      }
    } catch (error) {
      console.error("Error resetting audit logs:", error)
    } finally {
      setIsResetting(false)
    }
  }

  // Calculate statistics
  const stats = {
    totalPDFs: logs.filter(l => l.action === "PDF_GENERATED").length,
    totalUsers: new Set(logs.map(l => l.user_id)).size,
    totalToday: logs.filter(l => {
      const today = new Date().toDateString()
      return new Date(l.created_at).toDateString() === today
    }).length,
    totalSamples: logs
      .filter(l => l.action === "PDF_GENERATED" && l.new_value)
      .reduce((acc, l) => acc + (Number(l.new_value?.total_qty) || 0), 0),
  }

  // Data for charts
  const getActivityByDay = () => {
    const last7Days: Record<string, number> = {}
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const key = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      last7Days[key] = 0
    }

    logs.forEach(log => {
      const date = new Date(log.created_at)
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff < 7) {
        const key = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
        if (last7Days[key] !== undefined) {
          last7Days[key]++
        }
      }
    })

    return Object.entries(last7Days).map(([name, value]) => ({ name, value }))
  }

  const getActivityByType = () => {
    const types: Record<string, number> = {}
    logs.forEach(log => {
      const type = getEntityTypeName(log.entity_type)
      types[type] = (types[type] || 0) + 1
    })
    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }

  const getActivityByUser = () => {
    const users: Record<string, number> = {}
    logs.forEach(log => {
      const name = log.user_name || log.user_email.split('@')[0]
      users[name] = (users[name] || 0) + 1
    })
    return Object.entries(users)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500 hover:bg-green-600">Crear</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Actualizar</Badge>
      case "DELETE":
        return <Badge className="bg-red-500 hover:bg-red-600">Eliminar</Badge>
      case "PDF_GENERATED":
        return <Badge className="bg-purple-500 hover:bg-purple-600">PDF Generado</Badge>
      case "LOGIN":
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Ingreso</Badge>
      case "LOGOUT":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Salida</Badge>
      case "RESET":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Reiniciar</Badge>
      default:
        return <Badge>{action}</Badge>
    }
  }

  const getEntityTypeName = (type: string) => {
    switch (type) {
      case "study":
        return "Estudio"
      case "sample_description":
        return "Desc. Muestra"
      case "user":
        return "Usuario"
      case "sede":
        return "Sede"
      case "invoice":
        return "Factura"
      case "audit_logs":
        return "Historial"
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
      second: "2-digit",
    })
  }

  const renderDetailValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <Badge variant="outline" className="animate-pulse bg-green-100 text-green-700 border-green-300">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            En vivo
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">PDFs Generados</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalPDFs}</p>
                </div>
                <FileText className="h-10 w-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-cyan-600">{stats.totalUsers}</p>
                </div>
                <Users className="h-10 w-10 text-cyan-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acciones Hoy</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalToday}</p>
                </div>
                <Clock className="h-10 w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Muestras</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalSamples}</p>
                </div>
                <FlaskConical className="h-10 w-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Actividad Ultimos 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getActivityByDay()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={getActivityByType()}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {getActivityByType().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios Mas Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {getActivityByUser().map((user, index) => (
                <div 
                  key={user.name} 
                  className="flex items-center gap-2 bg-muted rounded-full px-4 py-2"
                >
                  <span className="font-bold text-lg" style={{ color: COLORS[index % COLORS.length] }}>
                    #{index + 1}
                  </span>
                  <span className="font-medium">{user.name}</span>
                  <Badge variant="secondary">{user.value} acciones</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-6 w-6" />
                <CardTitle className="text-2xl">Historial Detallado</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowResetDialog(true)}
                    disabled={isResetting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reiniciar Historial
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              Registro detallado de todas las acciones - Haz clic en una fila para ver detalles
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
                    <SelectItem value="invoice">Facturas/PDF</SelectItem>
                    <SelectItem value="study">Estudios</SelectItem>
                    <SelectItem value="sample_description">Muestras</SelectItem>
                    <SelectItem value="user">Usuarios</SelectItem>
                    <SelectItem value="sede">Sedes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Fecha/Hora</TableHead>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No hay registros de cambios
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log, index) => (
                      <TableRow 
                        key={log.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${index === 0 ? "bg-green-50" : ""}`}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{log.user_name || "Sin nombre"}</div>
                            <div className="text-xs text-muted-foreground">{log.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{log.sede_name || "-"}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm">{getEntityTypeName(log.entity_type)}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm">
                          {log.entity_name || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {log.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Mostrando {logs.length} registros</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                Actualizacion en tiempo real activa
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && getActionBadge(selectedLog.action)}
                <span>{selectedLog?.entity_name || "Detalle de Accion"}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedLog && formatDate(selectedLog.created_at)}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Usuario</Label>
                    <p className="font-medium">{selectedLog.user_name || selectedLog.user_email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedLog.user_email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Sede</Label>
                    <p className="font-medium">{selectedLog.sede_name || "Sin sede"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getEntityTypeName(selectedLog.entity_type)}</p>
                  </div>
                </div>

                {selectedLog.description && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Descripcion</Label>
                    <p className="font-medium bg-muted p-3 rounded-lg">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.new_value && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Datos del Registro</Label>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      {Object.entries(selectedLog.new_value).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start border-b border-border/50 pb-2 last:border-0">
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-sm text-right max-w-[60%]">
                            {Array.isArray(value) ? (
                              <div className="space-y-1">
                                {value.map((item, i) => (
                                  <div key={i} className="text-xs bg-background p-1 rounded">
                                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              renderDetailValue(value)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.old_value && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Valor Anterior</Label>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(selectedLog.old_value, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reiniciar el historial detallado?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará todos los registros del historial de auditoría. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              ⚠️ Advertencia: Se eliminarán permanentemente todos los {logs.length} registros del historial.
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetAuditLogs}
                disabled={isResetting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isResetting ? "Reiniciando..." : "Reiniciar Historial"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
