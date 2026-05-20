import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (sedeId) {
    query = query.eq("sede_id", sedeId)
  }

  if (entityType) {
    query = query.eq("entity_type", entityType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sincronizar datos para frontend
  const transformedData = (data || []).map((log) => ({
    ...log,
    old_value: log.old_data,
    new_value: log.new_data,

    // Garantizar sede sincronizada
    sede_id: log.sede_id || null,
    sede_name:
      log.sede_name ||
      log.new_data?.sede_name ||
      log.old_data?.sede_name ||
      "Sin sede",
  }))

  return NextResponse.json(transformedData)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  // Obtener perfil completo del usuario
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      full_name,
      email,
      sede_id,
      sede_name
    `)
    .eq("id", user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    )
  }

  // Priorizar sede enviada manualmente
  // si no existe usar la del perfil
  const finalSedeId = sede_id || profile?.sede_id || null

  const finalSedeName =
    sede_name ||
    profile?.sede_name ||
    new_value?.sede_name ||
    old_value?.sede_name ||
    "Sin sede"

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      user_email: profile?.email || user.email,
      user_name: profile?.full_name || "Usuario",

      // Sede sincronizada automáticamente
      sede_id: finalSedeId,
      sede_name: finalSedeName,

      action,
      entity_type,
      entity_id,
      entity_name,

      old_data: old_value || null,
      new_data: new_value || null,

      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}