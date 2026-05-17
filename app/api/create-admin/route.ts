import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeId } = await request.json()

  console.log("[v0] Creating admin user with:", { email, fullName, sedeId })
  console.log("[v0] SUPABASE_URL exists:", !!process.env.SUPABASE_URL)
  console.log("[v0] SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  // Use service role key to bypass rate limits and email confirmation
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Create user with Admin API (bypasses rate limits and confirms email automatically)
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      sede_id: sedeId
    }
  })

  console.log("[v0] Admin createUser response:", { userData, userError })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // Update the profile to set as admin
  if (userData.user) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", userData.user.id)

    console.log("[v0] Profile update result:", { profileError })
  }

  return NextResponse.json({ success: true, user: userData.user })
}
