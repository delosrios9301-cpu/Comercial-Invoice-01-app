import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user can view audit logs
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, can_view_audit")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin && !profile?.can_view_audit) {
    return NextResponse.json({ error: "No tienes permiso para ver el historial" }, { status: 403 })
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

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    action,
    entity_type,
    entity_id,
    entity_name,
    old_value,
    new_value,
    description,
  } = body

  // Get user profile for name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  // Get user's sede
  const { data: userSede } = await supabase
    .from("user_sedes")
    .select(`
      sede_id,
      sedes (
        id,
        name
      )
    `)
    .eq("user_id", user.id)
    .single()

  const sedeId = userSede?.sede_id || null
  const sedeName = (userSede?.sedes as { name?: string })?.name || null

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      sede_id: sedeId,
      sede_name: sedeName,
      user_id: user.id,
      user_email: profile?.email || user.email,
      user_name: profile?.full_name,
      action,
      entity_type,
      entity_id,
      entity_name,
      old_value,
      new_value,
      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
