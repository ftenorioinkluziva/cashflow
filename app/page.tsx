import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import DashboardOverview from "@/components/dashboard/dashboard-overview"

export default async function Home() {
  const supabase = createServerComponentClient({ cookies })

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Auth error:", error.message)
      redirect("/login")
    }

    if (!session) {
      redirect("/login")
    }

    return (
      <main className="flex min-h-screen flex-col">
        <DashboardOverview />
      </main>
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    redirect("/login")
  }
}
