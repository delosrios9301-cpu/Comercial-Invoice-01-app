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

  // Obtener perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      full_name,
      email,
      sede_id
    `)
    .eq("id", user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    )
  }

  // Buscar nombre de la sede real
  let finalSedeId = sede_id || profile?.sede_id || null
  let finalSedeName = sede_name || null

  // Si existe sede_id obtener nombre desde tabla sedes
  if (finalSedeId && !finalSedeName) {
    const { data: sedeData } = await supabase
      .from("sedes")
      .select("name")
      .eq("id", finalSedeId)
      .single()

    finalSedeName = sedeData?.name || "Sin sede"
  }

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      user_id: user.id,
      user_email: profile?.email || user.email,
      user_name: profile?.full_name || "Usuario",

      // Guardar sede sincronizada
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