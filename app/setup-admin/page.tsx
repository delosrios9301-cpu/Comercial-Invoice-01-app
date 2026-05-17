"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const createAdmin = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@miguel.com",
          password: "Admin123!",
          fullName: "Admin",
          sedeId: "25c835d1-70bc-4a79-aa29-adb764482279"
        })
      })
      const data = await response.json()
      if (data.error) {
        setResult("Error: " + data.error)
      } else {
        setResult("Usuario admin creado exitosamente! Email: admin@miguel.com, Password: Admin123!")
      }
    } catch (error) {
      setResult("Error: " + String(error))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear Usuario Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Haz clic en el boton para crear el usuario administrador.
          </p>
          <Button onClick={createAdmin} disabled={loading} className="w-full">
            {loading ? "Creando..." : "Crear Admin"}
          </Button>
          {result && (
            <p className={`text-sm ${result.includes("Error") ? "text-red-500" : "text-green-500"}`}>
              {result}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
