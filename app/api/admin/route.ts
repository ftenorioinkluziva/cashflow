import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// This is a protected route that uses the API_KEY for admin operations
export async function GET() {
  try {
    // Using the admin client with the API_KEY
    const { data, error } = await supabaseAdmin.from("transactions").select("*").limit(10)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Admin API accessed successfully",
      data,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
