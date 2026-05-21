import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Verificar permisos
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, can_view_audit")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin && !profile?.can_view_audit) {
    return NextResponse.json(
      { error: "No tienes permiso para ver el historial" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)

  const sedeId = searchParams.get("sede_id")
  const entityType = searchParams.get("entity_type")
  const limit = parseInt(
    searchParams.get("limit") || "100"
  )

  // Consulta con relaciones
  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        user_sedes (
          sede_id,
          sedes (
            id,
            name
          )
        )
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit)

  // Filtro por sede
  if (sedeId) {
    query = query.eq("sede_id", sedeId)
  }

  // Filtro por tipo de entidad
  if (entityType) {
    query = query.eq("entity_type", entityType)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

fix-merge-conflicts
  // Transformar datos
  const transformedData =
    data?.map((log: any) => {
      const userSede =
        log.profiles?.user_sedes?.[0]

      return {
        ...log,

        // Compatibilidad frontend
        old_value: log.old_data,
        new_value: log.new_data,

        // Usuario
        user_name:
          log.user_name ||
          log.profiles?.full_name ||
          log.profiles?.email ||
          "Usuario",

        // Sede
        sede_id:
          log.sede_id ||
          userSede?.sedes?.id ||
          null,

        sede_name:
          log.sede_name ||
          userSede?.sedes?.name ||
          "Sin sede",
      }
    }) || []

  return NextResponse.json(transformedData)

  return NextResponse.json(data)
 main
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // Usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()
fix-merge-conflicts

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

  const {
  action,
  entity_type,
  entity_id,
  entity_name,
  old_value,
  new_value,
  description,
} = body
main

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      full_name,
      email,
      user_sedes (
        sede_id,
        sedes (
          id,
          name
        )
      )
    `)
    .eq("id", user.id)
    .single()

  const userSede =
    profile?.user_sedes?.[0]

  // Insertar log
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({sede_id: sedeId,
sede_name: sedeName,
      user_id: user.id,
 fix-merge-conflicts

      user_email:
        profile?.email || user.email,

      user_name:
        profile?.full_name ||
        user.email,

      sede_id:
        sede_id ||
        userSede?.sedes?.id ||
        null,

      sede_name:
        sede_name ||
        userSede?.sedes?.name ||
        "Sin sede",


      user_email: profile?.email || user.email,
      user_name: profile?.full_name,
      // Obtener sede real del usuario
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

const sedeName =
  (userSede?.sedes as any)?.name || null
 main
      action,
      entity_type,
      entity_id,
      entity_name,
 fix-merge-conflicts

      old_data: old_value,
      new_data: new_value,


      old_value,
      new_value,
 main
      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
