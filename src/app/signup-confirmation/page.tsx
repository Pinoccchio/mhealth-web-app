import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SignUpConfirmation() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>We&apos;ve sent you a confirmation email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Please check your email and click on the confirmation link to activate your account. If you don&apos;t see
            the email, please check your spam folder.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Return to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

