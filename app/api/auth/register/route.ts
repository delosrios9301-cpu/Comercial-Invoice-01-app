import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeId } = await request.json()

  console.log("[v0] Creating user with:", { email, fullName, sedeId })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[v0] Missing env vars")
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  // Use service role key to bypass rate limits and email confirmation
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
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

  return NextResponse.json({ success: true, user: userData.user })
}
