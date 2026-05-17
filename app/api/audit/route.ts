import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - List audit logs
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
    return NextResponse.json({ error: "No tienes permiso para ver los registros de auditoria" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get("entity_type")
  const sedeId = searchParams.get("sede_id")
  const userId = searchParams.get("user_id")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = parseInt(searchParams.get("offset") || "0")

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) {
    query = query.eq("entity_type", entityType)
  }
  if (sedeId) {
    query = query.eq("sede_id", sedeId)
  }
  if (userId) {
    query = query.eq("user_id", userId)
  }
  if (startDate) {
    query = query.gte("created_at", startDate)
  }
  if (endDate) {
    query = query.lte("created_at", endDate)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data, total: count })
}

// POST - Create audit log entry
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { action, entity_type, entity_id, entity_name, sede_id, sede_name, old_data, new_data, description } = body

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      user_email: profile?.email || user.email,
      user_name: profile?.full_name || "Usuario",
      sede_id,
      sede_name,
      action,
      entity_type,
      entity_id,
      entity_name,
      old_data,
      new_data,
      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
