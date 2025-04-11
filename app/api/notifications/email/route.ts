import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCurrency } from "@/lib/utils"

// This endpoint can be called by a cron job to send email notifications
export async function POST(request: Request) {
  try {
    // Verify API key for security
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get upcoming transactions for the next 3 days
    const today = new Date()
    const threeDaysLater = addDays(today, 3)

    const { data: upcomingTransactions, error } = await supabaseAdmin
      .from("transactions")
      .select(`
        *,
        categories(name)
      `)
      .eq("status", "pending")
      .gte("due_date", today.toISOString())
      .lte("due_date", threeDaysLater.toISOString())
      .order("due_date", { ascending: true })

    if (error) throw error

    // Get users to notify
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) throw usersError

    // Format email content
    const emailContent = `
      <h2>Próximos Vencimentos</h2>
      <p>Você tem ${upcomingTransactions?.length || 0} contas a vencer nos próximos 3 dias:</p>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Descrição</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Categoria</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Vencimento</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingTransactions
            ?.map(
              (transaction) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${transaction.description}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${transaction.categories?.name || "Sem categoria"}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${format(new Date(transaction.due_date), "dd 'de' MMMM", { locale: ptBR })}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb; color: ${transaction.type === "income" ? "green" : "red"};">
                ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <p style="margin-top: 20px;">Acesse o sistema para mais detalhes e para efetuar os pagamentos.</p>
    `

    // In a real application, you would send emails here using a service like Nodemailer, SendGrid, etc.
    // For this example, we'll just return the content

    return NextResponse.json({
      success: true,
      message: `Notification prepared for ${users?.users.length || 0} users about ${upcomingTransactions?.length || 0} upcoming transactions`,
      emailContent,
    })
  } catch (error: any) {
    console.error("Error sending notifications:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
