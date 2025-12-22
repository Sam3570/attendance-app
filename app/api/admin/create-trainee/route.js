import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()

    // 1. Create auth user (NO session switch)
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      })

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 })
    }

    // 2. Insert trainee profile (bypasses RLS)
    const { error: traineeError } = await supabaseAdmin
      .from("trainees")
      .insert({
        user_id: userData.user.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        posting_location: body.posting_location,
      })

    if (traineeError) {
      return Response.json({ error: traineeError.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: "Server error" }, { status: 500 })
  }
}
