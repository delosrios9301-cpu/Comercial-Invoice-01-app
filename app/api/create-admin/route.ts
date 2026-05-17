import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ 
      error: "Missing environment variables",
      details: {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey
      }
    }, { status: 500 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Get sede ID for Ave. Mexico
  const { data: sedes } = await supabaseAdmin.from("sedes").select("id").eq("name", "Ave. Mexico").single()
  const sedeId = sedes?.id

  if (!sedeId) {
    // Get any sede
    const { data: anySede } = await supabaseAdmin.from("sedes").select("id").limit(1).single()
    if (!anySede?.id) {
      return NextResponse.json({ error: "No sedes found" }, { status: 400 })
    }
  }

  const finalSedeId = sedeId || (await supabaseAdmin.from("sedes").select("id").limit(1).single()).data?.id

  // Delete existing admin user if exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingAdmin = existingUsers?.users?.find(u => u.email === "admin@miguel.com")
  
  if (existingAdmin) {
    await supabaseAdmin.auth.admin.deleteUser(existingAdmin.id)
  }

  // Create admin user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: "admin@miguel.com",
    password: "Admin123!",
    email_confirm: true,
    user_metadata: {
      full_name: "Admin",
      sede_id: finalSedeId,
    },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Set as admin in profiles
  if (userData.user) {
    await supabaseAdmin.from("profiles").upsert({
      id: userData.user.id,
      email: "admin@miguel.com",
      full_name: "Admin",
      sede_id: finalSedeId,
      is_admin: true,
    })
  }

  return NextResponse.json({ 
    success: true, 
    message: "Admin creado exitosamente. Ahora puedes iniciar sesion.",
    credentials: {
      email: "admin@miguel.com",
      password: "Admin123!"
    }
  })
}
