import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, sedeId } = await request.json()

  const supabase = await createClient()

  // Create user with signUp
  const { data: userData, error: userError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        sede_id: sedeId
      }
    }
  })

  console.log("[v0] SignUp response:", { userData, userError })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // Update the profile to set as admin
  if (userData.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", userData.user.id)

    console.log("[v0] Profile update result:", { profileError })
  }

  return NextResponse.json({ success: true, user: userData.user })
}
