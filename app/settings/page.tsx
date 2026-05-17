"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Study {
  id: string
  sede_id: string
  name: string
  protocol: string
  shipper_address: string
  consignee_address: string | null
}

interface SampleDescription {
  id: string
  sede_id: string
  description: string
}

interface Sede {
  id: string
  name: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  sede_id: string
  is_admin: boolean
  can_edit: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userSedes, setUserSedes] = useState<Sede[]>([])
  const [selectedSedeId, setSelectedSedeId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  
  // Studies state
  const [studies, setStudies] = useState<Study[]>([])
  const [editingStudy, setEditingStudy] = useState<Study | null>(null)
  const [newStudy, setNewStudy] = useState({ name: "", protocol: "", shipper_address: "", consignee_address: "" })
  const [showNewStudy, setShowNewStudy] = useState(false)
  
  // Sample descriptions state
  const [sampleDescriptions, setSampleDescriptions] = useState<SampleDescription[]>([])
  const [editingSample, setEditingSample] = useState<SampleDescription | null>(null)
  const [newSampleDesc, setNewSampleDesc] = useState("")
  const [showNewSample, setShowNewSample] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (profile) {
        setUser(profile)

        // Get user's assigned sedes
        const { data: userSedesData } = await supabase
          .from("user_sedes")
          .select("sede_id, sedes(id, name)")
          .eq("user_id", authUser.id)

        const sedes = userSedesData?.map(us => us.sedes as unknown as Sede).filter(Boolean) || []
        setUserSedes(sedes)

        // Set default selected sede
        if (sedes.length > 0) {
          setSelectedSedeId(sedes[0].id)
        }

        // For admin, fetch all data; for regular users, we'll fetch based on selected sede
        if (profile.is_admin) {
          const [studiesRes, samplesRes] = await Promise.all([
            supabase.from("studies").select("*"),
            supabase.from("sample_descriptions").select("*"),
          ])
          if (studiesRes.data) setStudies(studiesRes.data)
          if (samplesRes.data) setSampleDescriptions(samplesRes.data)
        } else if (sedes.length > 0) {
          const sedeIds = sedes.map(s => s.id)
          const [studiesRes, samplesRes] = await Promise.all([
            supabase.from("studies").select("*").in("sede_id", sedeIds),
            supabase.from("sample_descriptions").select("*").in("sede_id", sedeIds),
          ])
          if (studiesRes.data) setStudies(studiesRes.data)
          if (samplesRes.data) setSampleDescriptions(samplesRes.data)
        }
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

  const canModify = user?.is_admin || user?.can_edit

  // Function to log audit changes
  const logAudit = async (
    action: string, 
    entityType: string, 
    entityId: string | null, 
    entityName: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    description?: string
  ) => {
    const sedeId = selectedSedeId || userSedes[0]?.id
    const sedeName = userSedes.find(s => s.id === sedeId)?.name

    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sede_id: sedeId,
          sede_name: sedeName,
          action,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          old_value: oldValue,
          new_value: newValue,
          description,
        }),
      })
    } catch (error) {
      console.error("Error logging audit:", error)
    }
  }

  // Study CRUD operations
  const handleAddStudy = async () => {
    if (!user || !newStudy.name || !newStudy.protocol || !newStudy.shipper_address) return
    
    const sedeId = selectedSedeId || userSedes[0]?.id
    if (!sedeId) return

    const { data, error } = await supabase
      .from("studies")
      .insert({
        sede_id: sedeId,
        name: newStudy.name,
        protocol: newStudy.protocol,
        shipper_address: newStudy.shipper_address,
        consignee_address: newStudy.consignee_address || null,
      })
      .select()
      .single()

    if (!error && data) {
      setStudies([...studies, data])
      await logAudit("CREATE", "study", data.id, data.name, undefined, {
        name: data.name,
        protocol: data.protocol,
        shipper_address: data.shipper_address,
        consignee_address: data.consignee_address,
      }, `Estudio "${data.name}" creado`)
      setNewStudy({ name: "", protocol: "", shipper_address: "", consignee_address: "" })
      setShowNewStudy(false)
    }
  }

  const handleUpdateStudy = async () => {
    if (!editingStudy) return

    const originalStudy = studies.find(s => s.id === editingStudy.id)

    const { error } = await supabase
      .from("studies")
      .update({
        name: editingStudy.name,
        protocol: editingStudy.protocol,
        shipper_address: editingStudy.shipper_address,
        consignee_address: editingStudy.consignee_address,
      })
      .eq("id", editingStudy.id)

    if (!error) {
      setStudies(studies.map(s => s.id === editingStudy.id ? editingStudy : s))
      await logAudit("UPDATE", "study", editingStudy.id, editingStudy.name, 
        originalStudy ? {
          name: originalStudy.name,
          protocol: originalStudy.protocol,
          shipper_address: originalStudy.shipper_address,
          consignee_address: originalStudy.consignee_address,
        } : undefined,
        {
          name: editingStudy.name,
          protocol: editingStudy.protocol,
          shipper_address: editingStudy.shipper_address,
          consignee_address: editingStudy.consignee_address,
        }, 
        `Estudio "${editingStudy.name}" actualizado`
      )
      setEditingStudy(null)
    }
  }

  const handleDeleteStudy = async (id: string) => {
    const studyToDelete = studies.find(s => s.id === id)
    const { error } = await supabase.from("studies").delete().eq("id", id)
    if (!error) {
      setStudies(studies.filter(s => s.id !== id))
      if (studyToDelete) {
        await logAudit("DELETE", "study", id, studyToDelete.name, {
          name: studyToDelete.name,
          protocol: studyToDelete.protocol,
          shipper_address: studyToDelete.shipper_address,
          consignee_address: studyToDelete.consignee_address,
        }, undefined, `Estudio "${studyToDelete.name}" eliminado`)
      }
    }
  }

  // Sample description CRUD operations
  const handleAddSample = async () => {
    if (!user || !newSampleDesc.trim()) return
    
    const sedeId = selectedSedeId || userSedes[0]?.id
    if (!sedeId) return

    const { data, error } = await supabase
      .from("sample_descriptions")
      .insert({
        sede_id: sedeId,
        description: newSampleDesc.trim().toUpperCase(),
      })
      .select()
      .single()

    if (!error && data) {
      setSampleDescriptions([...sampleDescriptions, data])
      await logAudit("CREATE", "sample_description", data.id, data.description, undefined, {
        description: data.description,
      }, `Descripcion de muestra "${data.description}" creada`)
      setNewSampleDesc("")
      setShowNewSample(false)
    }
  }

  const handleUpdateSample = async () => {
    if (!editingSample) return

    const originalSample = sampleDescriptions.find(s => s.id === editingSample.id)

    const { error } = await supabase
      .from("sample_descriptions")
      .update({
        description: editingSample.description.toUpperCase(),
      })
      .eq("id", editingSample.id)

    if (!error) {
      setSampleDescriptions(sampleDescriptions.map(s => 
        s.id === editingSample.id ? { ...s, description: editingSample.description.toUpperCase() } : s
      ))
      await logAudit("UPDATE", "sample_description", editingSample.id, editingSample.description,
        originalSample ? { description: originalSample.description } : undefined,
        { description: editingSample.description.toUpperCase() },
        `Descripcion de muestra actualizada de "${originalSample?.description}" a "${editingSample.description.toUpperCase()}"`
      )
      setEditingSample(null)
    }
  }

  const handleDeleteSample = async (id: string) => {
    const sampleToDelete = sampleDescriptions.find(s => s.id === id)
    const { error } = await supabase.from("sample_descriptions").delete().eq("id", id)
    if (!error) {
      setSampleDescriptions(sampleDescriptions.filter(s => s.id !== id))
      if (sampleToDelete) {
        await logAudit("DELETE", "sample_description", id, sampleToDelete.description, 
          { description: sampleToDelete.description }, 
          undefined, 
          `Descripcion de muestra "${sampleToDelete.description}" eliminada`
        )
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver al formulario
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Configuracion</CardTitle>
            <CardDescription>
              Gestiona los estudios y descripciones de muestras
            </CardDescription>
            
            {/* Sede Selector */}
            {userSedes.length > 1 && (
              <div className="mt-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Sede para nuevos registros:</Label>
                <Select value={selectedSedeId} onValueChange={setSelectedSedeId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {userSedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="studies">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="studies">Estudios</TabsTrigger>
                <TabsTrigger value="samples">Muestras</TabsTrigger>
              </TabsList>

              {/* Studies Tab */}
              <TabsContent value="studies" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Estudios</h3>
                  {canModify && (
                    <Button size="sm" onClick={() => setShowNewStudy(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Agregar Estudio
                    </Button>
                  )}
                </div>

                {showNewStudy && (
                  <Card className="p-4 bg-muted/50">
                    <div className="space-y-3">
                      <div>
                        <Label>Nombre del estudio</Label>
                        <Input
                          placeholder="Nombre del estudio"
                          value={newStudy.name}
                          onChange={(e) => setNewStudy({ ...newStudy, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Protocolo</Label>
                        <Input
                          placeholder="Protocolo"
                          value={newStudy.protocol}
                          onChange={(e) => setNewStudy({ ...newStudy, protocol: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Direccion del Shipper</Label>
                        <Textarea
                          placeholder="Direccion del Shipper"
                          value={newStudy.shipper_address}
                          onChange={(e) => setNewStudy({ ...newStudy, shipper_address: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label>Direccion del Consignee</Label>
                        <Textarea
                          placeholder="Direccion del Consignee"
                          value={newStudy.consignee_address}
                          onChange={(e) => setNewStudy({ ...newStudy, consignee_address: e.target.value })}
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddStudy}>
                          <Save className="mr-1 h-4 w-4" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setShowNewStudy(false)
                          setNewStudy({ name: "", protocol: "", shipper_address: "", consignee_address: "" })
                        }}>
                          <X className="mr-1 h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-3">
                  {studies.map((study) => (
                    <Card key={study.id} className="p-4">
                      {editingStudy?.id === study.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label>Nombre del estudio</Label>
                            <Input
                              value={editingStudy.name}
                              onChange={(e) => setEditingStudy({ ...editingStudy, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Protocolo</Label>
                            <Input
                              value={editingStudy.protocol}
                              onChange={(e) => setEditingStudy({ ...editingStudy, protocol: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Direccion del Shipper</Label>
                            <Textarea
                              value={editingStudy.shipper_address}
                              onChange={(e) => setEditingStudy({ ...editingStudy, shipper_address: e.target.value })}
                              className="min-h-[100px]"
                            />
                          </div>
                          <div>
                            <Label>Direccion del Consignee</Label>
                            <Textarea
                              value={editingStudy.consignee_address || ""}
                              onChange={(e) => setEditingStudy({ ...editingStudy, consignee_address: e.target.value })}
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateStudy}>
                              <Save className="mr-1 h-4 w-4" />
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingStudy(null)}>
                              <X className="mr-1 h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <p className="font-semibold">{study.name}</p>
                            <p className="text-sm text-muted-foreground">{study.protocol}</p>
                            <div className="grid gap-2 mt-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Shipper:</p>
                                <p className="text-xs whitespace-pre-line">{study.shipper_address}</p>
                              </div>
                              {study.consignee_address && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Consignee:</p>
                                  <p className="text-xs whitespace-pre-line">{study.consignee_address}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {canModify && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => setEditingStudy(study)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteStudy(study.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                  {studies.length === 0 && !showNewStudy && (
                    <p className="text-center text-muted-foreground py-8">No hay estudios configurados</p>
                  )}
                </div>
              </TabsContent>

              {/* Sample Descriptions Tab */}
              <TabsContent value="samples" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Descripciones de Muestras</h3>
                  {canModify && (
                    <Button size="sm" onClick={() => setShowNewSample(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Agregar Descripcion
                    </Button>
                  )}
                </div>

                {showNewSample && (
                  <Card className="p-4 bg-muted/50">
                    <div className="space-y-3">
                      <Input
                        placeholder="Descripcion de muestra (ej: HUMAN BLOOD, NASAL SWAB)"
                        value={newSampleDesc}
                        onChange={(e) => setNewSampleDesc(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nota: Las muestras que contengan &quot;NASAL&quot;, &quot;SWAB&quot; o &quot;HISOPADO&quot; en el nombre multiplicaran la cantidad por 3 en el calculo de ML/gm
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddSample}>
                          <Save className="mr-1 h-4 w-4" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setShowNewSample(false)
                          setNewSampleDesc("")
                        }}>
                          <X className="mr-1 h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-2">
                  {sampleDescriptions.map((sample) => (
                    <Card key={sample.id} className="p-3">
                      {editingSample?.id === sample.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingSample.description}
                            onChange={(e) => setEditingSample({ ...editingSample, description: e.target.value })}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={handleUpdateSample}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSample(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{sample.description}</span>
                            {(sample.description.toLowerCase().includes("nasal") || 
                              sample.description.toLowerCase().includes("swab") ||
                              sample.description.toLowerCase().includes("hisopado")) && (
                              <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                x3 ML/gm
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {canModify && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => setEditingSample(sample)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteSample(sample.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                  {sampleDescriptions.length === 0 && !showNewSample && (
                    <p className="text-center text-muted-foreground py-8">No hay descripciones de muestras configuradas</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
