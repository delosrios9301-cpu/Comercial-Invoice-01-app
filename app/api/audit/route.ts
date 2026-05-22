import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Verificar permisos
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, can_view_audit")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin && !profile?.can_view_audit) {
    return NextResponse.json(
      { error: "No tienes permiso para ver el historial" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)

  const sedeId = searchParams.get("sede_id")
  const entityType = searchParams.get("entity_type")
  const limit = parseInt(searchParams.get("limit") || "100")

  // Consulta con relaciones
  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        user_sedes (
          sede_id,
          sedes (
            id,
            name
          )
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  // Filtro por sede
  if (sedeId) {
    query = query.eq("sede_id", sedeId)
  }

  // Filtro por tipo de entidad
  if (entityType) {
    query = query.eq("entity_type", entityType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Transformar datos
  const transformedData =
    data?.map((log: any) => {
      const userSede = log.profiles?.user_sedes?.[0]

      return {
        ...log,
        // Compatibilidad frontend
        old_value: log.old_data || log.old_value,
        new_value: log.new_data || log.new_value,
        // Usuario
        user_name:
          log.user_name ||
          log.profiles?.full_name ||
          log.profiles?.email ||
          "Usuario",
        // Sede
        sede_id: log.sede_id || userSede?.sedes?.id || null,
        sede_name: log.sede_name || userSede?.sedes?.name || "Sin sede",
      }
    }) || []

  return NextResponse.json(transformedData)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()

  const {
    sede_id,
    sede_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    old_value,
    new_value,
    description,
  } = body

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      full_name,
      email,
      user_sedes (
        sede_id,
        sedes (
          id,
          name
        )
      )
    `)
    .eq("id", user.id)
    .single()

  const userSede = profile?.user_sedes?.[0]

  // Insertar log
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      user_email: profile?.email || user.email,
      user_name: profile?.full_name || user.email,
      sede_id: sede_id || (userSede?.sedes as any)?.id || null,
      sede_name: sede_name || (userSede?.sedes as any)?.name || "Sin sede",
      action,
      entity_type,
      entity_id,
      entity_name,
      old_data: old_value,
      new_data: new_value,
      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Solo admin puede reiniciar el historial
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Solo el administrador puede reiniciar el historial" },
      { status: 403 }
    )
  }

  // Obtener perfil completo para el log
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  // Contar registros antes de eliminar
  const { count: totalRecords } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })

  // Eliminar todos los registros de audit_logs
  const { error: deleteError } = await supabase
    .from("audit_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000") // Truco para eliminar todos

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  // Registrar la accion de reinicio como nuevo primer registro
  const { error: logError } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      user_email: fullProfile?.email || user.email,
      user_name: fullProfile?.full_name || user.email,
      sede_id: null,
      sede_name: "Sistema",
      action: "RESET",
      entity_type: "audit_log",
      entity_id: null,
      entity_name: "Historial de Cambios",
      old_data: { total_records: totalRecords },
      new_data: { total_records: 0 },
      description: `Historial reiniciado. Se eliminaron ${totalRecords || 0} registros.`,
    })

  if (logError) {
    console.error("Error logging reset action:", logError)
  }

  return NextResponse.json({ 
    success: true, 
    message: `Historial reiniciado. Se eliminaron ${totalRecords || 0} registros.` 
  })
}
