import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-600">Error de Autenticacion</CardTitle>
          <CardDescription>
            Ha ocurrido un error durante el proceso de autenticacion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Por favor, intenta nuevamente o contacta al administrador si el problema persiste.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Link href="/auth/login" className="flex-1">
            <Button variant="outline" className="w-full">
              Iniciar Sesion
            </Button>
          </Link>
          <Link href="/auth/sign-up" className="flex-1">
            <Button className="w-full">
              Registrarse
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
