import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { addMonths, addQuarters, addYears, format } from "date-fns"

// This endpoint can be called by a cron job to generate recurring transactions
export async function POST(request: Request) {
  try {
    // Verify API key for security
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all recurring transactions that need to be generated
    const today = new Date()
    const { data: recurringTransactions, error } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .in("recurrence", ["monthly", "quarterly", "yearly"])
      .eq("status", "paid")
      .is("next_generation_date", null)
      .order("due_date", { ascending: true })

    if (error) throw error

    let generatedCount = 0
    const newTransactions = []

    // Process each recurring transaction
    for (const transaction of recurringTransactions || []) {
      let nextDate
      const dueDate = new Date(transaction.due_date)

      // Calculate next date based on recurrence type
      switch (transaction.recurrence) {
        case "monthly":
          nextDate = addMonths(dueDate, 1)
          break
        case "quarterly":
          nextDate = addQuarters(dueDate, 1)
          break
        case "yearly":
          nextDate = addYears(dueDate, 1)
          break
        default:
          continue
      }

      // Only generate if the next date is in the future
      if (nextDate > today) {
        // Create new transaction
        const newTransaction = {
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.category_id,
          due_date: format(nextDate, "yyyy-MM-dd"),
          status: "pending",
          recurrence: transaction.recurrence,
          payment_method: transaction.payment_method,
          notes: transaction.notes,
          department: transaction.department,
          parent_transaction_id: transaction.id,
        }

        newTransactions.push(newTransaction)

        // Update original transaction with next generation date
        await supabaseAdmin
          .from("transactions")
          .update({ next_generation_date: format(nextDate, "yyyy-MM-dd") })
          .eq("id", transaction.id)

        generatedCount++
      }
    }

    // Insert all new transactions in a single batch
    if (newTransactions.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("transactions").insert(newTransactions)
      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedCount} recurring transactions`,
    })
  } catch (error: any) {
    console.error("Error generating recurring transactions:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
