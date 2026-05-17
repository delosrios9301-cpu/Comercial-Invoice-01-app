import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeId } = await request.json()

  // Use service role key to bypass RLS and create user properly
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Create user with admin API
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      sede_id: sedeId
    }
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // Set user as admin in profiles
  if (userData.user) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", userData.user.id)

    if (profileError) {
      console.log("Profile update error:", profileError)
    }
  }

  return NextResponse.json({ success: true, user: userData.user })
}
