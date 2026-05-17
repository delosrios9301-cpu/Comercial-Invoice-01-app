"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, Edit2, Building2 } from "lucide-react"

interface Sede {
  id: string
  name: string
  address: string
  created_at: string
}

export default function SedesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [editingSede, setEditingSede] = useState<Sede | null>(null)
  const [newSede, setNewSede] = useState({ name: "", address: "" })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check if admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single()

      if (!profile?.is_admin) {
        router.push("/")
        return
      }

      // Fetch sedes
      const response = await fetch("/api/sedes")
      if (response.ok) {
        const data = await response.json()
        setSedes(data)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddSede = async () => {
    if (!newSede.name || !newSede.address) return
    
    setSaving(true)
    try {
      const response = await fetch("/api/sedes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSede),
      })

      if (response.ok) {
        const data = await response.json()
        setSedes([...sedes, data])
        setNewSede({ name: "", address: "" })
        setShowNewDialog(false)
      }
    } catch (error) {
      console.error("Error creating sede:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSede = async () => {
    if (!editingSede || !editingSede.name || !editingSede.address) return
    
    setSaving(true)
    try {
      const response = await fetch("/api/sedes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSede),
      })

      if (response.ok) {
        const data = await response.json()
        setSedes(sedes.map(s => s.id === data.id ? data : s))
        setEditingSede(null)
      }
    } catch (error) {
      console.error("Error updating sede:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSede = async (id: string) => {
    if (!confirm("Estas seguro de eliminar esta sede?")) return
    
    try {
      const response = await fetch(`/api/sedes?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSedes(sedes.filter(s => s.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || "Error al eliminar sede")
      }
    } catch (error) {
      console.error("Error deleting sede:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  Gestion de Sedes
                </CardTitle>
                <CardDescription>
                  Administra las sedes o ubicaciones del sistema
                </CardDescription>
              </div>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Nueva Sede
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sedes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No hay sedes registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  sedes.map((sede) => (
                    <TableRow key={sede.id}>
                      <TableCell className="font-medium">{sede.name}</TableCell>
                      <TableCell className="whitespace-pre-line text-sm">{sede.address}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingSede(sede)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteSede(sede.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* New Sede Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Sede</DialogTitle>
              <DialogDescription>
                Agrega una nueva sede o ubicacion al sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newSede.name}
                  onChange={(e) => setNewSede({ ...newSede, name: e.target.value })}
                  placeholder="Ej: Ave. Mexico"
                />
              </div>
              <div>
                <Label htmlFor="address">Direccion</Label>
                <Textarea
                  id="address"
                  value={newSede.address}
                  onChange={(e) => setNewSede({ ...newSede, address: e.target.value })}
                  placeholder="Direccion completa de la sede"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddSede} disabled={saving || !newSede.name || !newSede.address}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sede Dialog */}
        <Dialog open={!!editingSede} onOpenChange={(open) => !open && setEditingSede(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Sede</DialogTitle>
              <DialogDescription>
                Modifica los datos de la sede
              </DialogDescription>
            </DialogHeader>
            {editingSede && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={editingSede.name}
                    onChange={(e) => setEditingSede({ ...editingSede, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address">Direccion</Label>
                  <Textarea
                    id="edit-address"
                    value={editingSede.address}
                    onChange={(e) => setEditingSede({ ...editingSede, address: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSede(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateSede} disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
