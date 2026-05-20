import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeIds, canEdit, canViewAudit } = await request.json()

  // First verify the requester is an admin
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 })
  }

  // Use admin client to create user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Update profile with can_edit and can_view_audit permissions
  if (newUser.user) {
    await supabaseAdmin
      .update({
  can_edit: canEdit,
  can_view_audit: canViewAudit,
  sede_id: sedeIds && sedeIds.length > 0 ? sedeIds[0] : null,
})
      .update({ can_edit: canEdit, can_view_audit: canViewAudit })
      .eq("id", newUser.user.id)

    // Insert user_sedes relationships
    if (sedeIds && sedeIds.length > 0) {
      const userSedesData = sedeIds.map((sedeId: string) => ({
        user_id: newUser.user!.id,
        sede_id: sedeId,
      }))
      
      await supabaseAdmin
        .from("user_sedes")
        .insert(userSedesData)
    }
  }

  return NextResponse.json({ success: true, user: newUser.user })
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Get all users with their profiles
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      is_admin,
      can_edit,
      can_view_audit
    `)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get user_sedes for each user
  const { data: userSedes } = await supabaseAdmin
    .from("user_sedes")
    .select(`
      user_id,
      sede_id,
      sedes (
        id,
        name
      )
    `)

  // Map sedes to users
  const usersWithSedes = profiles?.map(p => ({
    ...p,
    sedes: userSedes?.filter(us => us.user_id === p.id).map(us => us.sedes) || []
  }))

  return NextResponse.json({ users: usersWithSedes })
}

export async function PUT(request: Request) {
  const { userId, canEdit, isAdmin, canViewAudit, sedeIds } = await request.json()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
   .update({
  can_edit: canEdit,
  is_admin: isAdmin,
  can_view_audit: canViewAudit,

  // Guardar sede principal del usuario
  sede_id:
    sedeIds && sedeIds.length > 0
      ? sedeIds[0]
      : null,
})
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ can_edit: canEdit, is_admin: isAdmin, can_view_audit: canViewAudit })
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update user_sedes if provided
  if (sedeIds !== undefined) {
    // Delete existing
    await supabaseAdmin
      .from("user_sedes")
      .delete()
      .eq("user_id", userId)

    // Insert new
    if (sedeIds.length > 0) {
      const userSedesData = sedeIds.map((sedeId: string) => ({
        user_id: userId,
        sede_id: sedeId,
      }))
      
      await supabaseAdmin
        .from("user_sedes")
        .insert(userSedesData)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { userId } = await request.json()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (user.id === userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
