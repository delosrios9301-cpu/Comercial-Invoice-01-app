"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Trash2, Shield, Edit, Users } from "lucide-react"
import Link from "next/link"

interface Sede {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  can_edit: boolean
  sede_id: string
  sedes: Sede | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // New user form
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newFullName, setNewFullName] = useState("")
  const [newSedeId, setNewSedeId] = useState("")
  const [newCanEdit, setNewCanEdit] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (!profile?.is_admin) {
      router.push("/")
      return
    }

    setIsAdmin(true)
    await loadUsers()
    await loadSedes()
    setLoading(false)
  }

  async function loadUsers() {
    const response = await fetch("/api/users")
    if (response.ok) {
      const data = await response.json()
      setUsers(data.users || [])
    }
  }

  async function loadSedes() {
    const { data } = await supabase.from("sedes").select("*")
    setSedes(data || [])
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newFullName || !newSedeId) {
      setError("Todos los campos son requeridos")
      return
    }

    setSaving(true)
    setError(null)

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        sedeId: newSedeId,
        canEdit: newCanEdit,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error)
      setSaving(false)
      return
    }

    // Reset form and reload
    setNewEmail("")
    setNewPassword("")
    setNewFullName("")
    setNewSedeId("")
    setNewCanEdit(false)
    setDialogOpen(false)
    setSaving(false)
    await loadUsers()
  }

  async function updateUserPermissions(userId: string, canEdit: boolean, isAdminUser: boolean) {
    const response = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, canEdit, isAdmin: isAdminUser }),
    })

    if (response.ok) {
      await loadUsers()
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Esta seguro de eliminar este usuario?")) return

    const response = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (response.ok) {
      await loadUsers()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Gestion de Usuarios
              </h1>
              <p className="text-muted-foreground">Crear y administrar usuarios del sistema</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Ingresa los datos del nuevo usuario
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Juan Perez"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Contrasena</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sede">Sede</Label>
                  <Select value={newSedeId} onValueChange={setNewSedeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sede" />
                    </SelectTrigger>
                    <SelectContent>
                      {sedes.map((sede) => (
                        <SelectItem key={sede.id} value={sede.id}>
                          {sede.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEdit"
                    checked={newCanEdit}
                    onCheckedChange={(checked) => setNewCanEdit(checked as boolean)}
                  />
                  <Label htmlFor="canEdit" className="cursor-pointer">
                    Puede editar configuraciones (estudios, muestras)
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createUser} disabled={saving}>
                  {saving ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              Lista de todos los usuarios del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Puede Editar</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.sedes?.name || "Sin sede"}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={user.is_admin}
                        onCheckedChange={(checked) => 
                          updateUserPermissions(user.id, user.can_edit, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={user.can_edit}
                        onCheckedChange={(checked) => 
                          updateUserPermissions(user.id, checked as boolean, user.is_admin)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUser(user.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>Descripcion de los niveles de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Administrador</p>
                <p className="text-sm text-muted-foreground">
                  Acceso total: puede crear usuarios, modificar permisos, ver todas las sedes y gestionar todas las configuraciones.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Edit className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Puede Editar</p>
                <p className="text-sm text-muted-foreground">
                  Puede crear y modificar estudios, descripciones de muestras y configuraciones de su sede.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Usuario Basico</p>
                <p className="text-sm text-muted-foreground">
                  Solo puede generar facturas comerciales usando las configuraciones existentes de su sede.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
