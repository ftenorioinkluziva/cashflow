import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import LoginForm from "@/components/auth/login-form"

export default async function LoginPage() {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sistema de Controle Financeiro</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Entre para acessar o sistema</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
