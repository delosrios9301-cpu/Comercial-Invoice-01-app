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
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Trash2, Shield, Edit, Users, Building2, ClipboardList } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
  can_view_audit: boolean
  sedes: Sede[]
}

// Helper function to log audit
async function logAudit(data: {
  action: string
  entity_type: string
  entity_id?: string
  entity_name?: string
  sede_id?: string
  sede_name?: string
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  description?: string
}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("Error logging audit:", error)
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [originalUser, setOriginalUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // New user form
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newFullName, setNewFullName] = useState("")
  const [newSedeIds, setNewSedeIds] = useState<string[]>([])
  const [newCanEdit, setNewCanEdit] = useState(false)
  const [newCanViewAudit, setNewCanViewAudit] = useState(false)

  // Edit user form
  const [editSedeIds, setEditSedeIds] = useState<string[]>([])
  const [editCanEdit, setEditCanEdit] = useState(false)
  const [editCanViewAudit, setEditCanViewAudit] = useState(false)
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  
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

  function toggleNewSede(sedeId: string) {
    setNewSedeIds(prev => 
      prev.includes(sedeId) 
        ? prev.filter(id => id !== sedeId)
        : [...prev, sedeId]
    )
  }

  function toggleEditSede(sedeId: string) {
    setEditSedeIds(prev => 
      prev.includes(sedeId) 
        ? prev.filter(id => id !== sedeId)
        : [...prev, sedeId]
    )
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newFullName || newSedeIds.length === 0) {
      setError("Todos los campos son requeridos y debe seleccionar al menos una sede")
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
        sedeIds: newSedeIds,
        canEdit: newCanEdit,
        canViewAudit: newCanViewAudit,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error)
      setSaving(false)
      return
    }

    // Log audit
    const sedeNames = sedes.filter(s => newSedeIds.includes(s.id)).map(s => s.name).join(", ")
    await logAudit({
      action: "CREATE",
      entity_type: "user",
      entity_id: data.user?.id,
      entity_name: newFullName,
      description: `Usuario "${newFullName}" (${newEmail}) creado con acceso a: ${sedeNames}`,
      new_data: { email: newEmail, fullName: newFullName, canEdit: newCanEdit, canViewAudit: newCanViewAudit, sedes: sedeNames },
    })

    // Reset form and reload
    setNewEmail("")
    setNewPassword("")
    setNewFullName("")
    setNewSedeIds([])
    setNewCanEdit(false)
    setNewCanViewAudit(false)
    setDialogOpen(false)
    setSaving(false)
    await loadUsers()
  }

  function openEditDialog(user: User) {
    setOriginalUser({ ...user })
    setEditingUser(user)
    setEditSedeIds(user.sedes?.map(s => s.id) || [])
    setEditCanEdit(user.can_edit)
    setEditCanViewAudit(user.can_view_audit || false)
    setEditIsAdmin(user.is_admin)
    setEditDialogOpen(true)
  }

  async function updateUser() {
    if (!editingUser || !originalUser) return

    setSaving(true)

    const response = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId: editingUser.id, 
        canEdit: editCanEdit, 
        canViewAudit: editCanViewAudit,
        isAdmin: editIsAdmin,
        sedeIds: editSedeIds
      }),
    })

    if (response.ok) {
      // Log audit
      const oldSedeNames = originalUser.sedes?.map(s => s.name).join(", ") || "Ninguna"
      const newSedeNames = sedes.filter(s => editSedeIds.includes(s.id)).map(s => s.name).join(", ")
      
      await logAudit({
        action: "UPDATE",
        entity_type: "user",
        entity_id: editingUser.id,
        entity_name: editingUser.full_name,
        description: `Permisos de usuario "${editingUser.full_name}" actualizados`,
        old_data: { 
          isAdmin: originalUser.is_admin, 
          canEdit: originalUser.can_edit, 
          canViewAudit: originalUser.can_view_audit,
          sedes: oldSedeNames 
        },
        new_data: { 
          isAdmin: editIsAdmin, 
          canEdit: editCanEdit, 
          canViewAudit: editCanViewAudit,
          sedes: newSedeNames 
        },
      })

      setEditDialogOpen(false)
      setEditingUser(null)
      setOriginalUser(null)
      await loadUsers()
    }
    setSaving(false)
  }

  async function deleteUser(user: User) {
    if (!confirm("Esta seguro de eliminar este usuario?")) return

    const response = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })

    if (response.ok) {
      // Log audit
      await logAudit({
        action: "DELETE",
        entity_type: "user",
        entity_id: user.id,
        entity_name: user.full_name,
        description: `Usuario "${user.full_name}" (${user.email}) eliminado`,
        old_data: { email: user.email, fullName: user.full_name, isAdmin: user.is_admin, canEdit: user.can_edit },
      })

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
            <DialogContent className="max-w-md">
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
                  <Label>Sedes Asignadas</Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {sedes.map((sede) => (
                      <div key={sede.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-sede-${sede.id}`}
                          checked={newSedeIds.includes(sede.id)}
                          onCheckedChange={() => toggleNewSede(sede.id)}
                        />
                        <Label htmlFor={`new-sede-${sede.id}`} className="cursor-pointer text-sm">
                          {sede.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecciona una o mas sedes para este usuario
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label>Permisos</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canEdit"
                      checked={newCanEdit}
                      onCheckedChange={(checked) => setNewCanEdit(checked as boolean)}
                    />
                    <Label htmlFor="canEdit" className="cursor-pointer">
                      Puede editar configuraciones
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canViewAudit"
                      checked={newCanViewAudit}
                      onCheckedChange={(checked) => setNewCanViewAudit(checked as boolean)}
                    />
                    <Label htmlFor="canViewAudit" className="cursor-pointer">
                      Puede ver auditoria
                    </Label>
                  </div>
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
                  <TableHead>Sedes</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Editar</TableHead>
                  <TableHead className="text-center">Auditoria</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.sedes && user.sedes.length > 0 ? (
                          user.sedes.map((sede) => (
                            <Badge key={sede.id} variant="secondary" className="text-xs">
                              {sede.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin sede</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.is_admin ? (
                        <Badge className="bg-purple-100 text-purple-700">Si</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.can_edit ? (
                        <Badge className="bg-blue-100 text-blue-700">Si</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.can_view_audit ? (
                        <Badge className="bg-green-100 text-green-700">Si</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUser(user)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                {editingUser?.full_name} ({editingUser?.email})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Sedes Asignadas</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {sedes.map((sede) => (
                    <div key={sede.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-sede-${sede.id}`}
                        checked={editSedeIds.includes(sede.id)}
                        onCheckedChange={() => toggleEditSede(sede.id)}
                      />
                      <Label htmlFor={`edit-sede-${sede.id}`} className="cursor-pointer text-sm">
                        {sede.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Permisos</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editIsAdmin"
                    checked={editIsAdmin}
                    onCheckedChange={(checked) => setEditIsAdmin(checked as boolean)}
                  />
                  <Label htmlFor="editIsAdmin" className="cursor-pointer">
                    Administrador (acceso total)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editCanEdit"
                    checked={editCanEdit}
                    onCheckedChange={(checked) => setEditCanEdit(checked as boolean)}
                  />
                  <Label htmlFor="editCanEdit" className="cursor-pointer">
                    Puede editar configuraciones
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editCanViewAudit"
                    checked={editCanViewAudit}
                    onCheckedChange={(checked) => setEditCanViewAudit(checked as boolean)}
                  />
                  <Label htmlFor="editCanViewAudit" className="cursor-pointer">
                    Puede ver auditoria
                  </Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateUser} disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  Puede crear y modificar estudios, descripciones de muestras y configuraciones de sus sedes asignadas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <ClipboardList className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Ver Auditoria</p>
                <p className="text-sm text-muted-foreground">
                  Puede ver el registro de auditoria con todos los cambios realizados en el sistema.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Building2 className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Multiples Sedes</p>
                <p className="text-sm text-muted-foreground">
                  Un usuario puede tener acceso a una o mas sedes. Solo vera los estudios y configuraciones de las sedes asignadas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Usuario Basico</p>
                <p className="text-sm text-muted-foreground">
                  Solo puede generar facturas comerciales usando las configuraciones existentes de sus sedes asignadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
