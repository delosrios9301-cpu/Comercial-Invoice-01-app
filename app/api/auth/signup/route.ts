import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeId } = await request.json()

  // Use service role key to create user without email confirmation
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Create user with admin API (bypasses email confirmation)
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: fullName,
      sede_id: sedeId,
    },
  })

  if (createError) {
    console.error("[v0] Error creating user:", createError)
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Update profile with is_admin = false for regular users
  if (userData.user) {
    await supabaseAdmin.from("profiles").update({ 
      is_admin: false,
      sede_id: sedeId 
    }).eq("id", userData.user.id)
  }

  return NextResponse.json({ 
    success: true, 
    message: "Usuario creado exitosamente",
    userId: userData.user?.id 
  })
}
