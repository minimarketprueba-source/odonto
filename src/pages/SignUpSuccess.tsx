import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-balance">¡Gracias por registrarte!</CardTitle>
          <CardDescription>Revisa tu correo para confirmar tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Te hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, revisa tu bandeja de entrada
            y haz clic en el enlace para activar tu cuenta.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
