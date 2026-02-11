// app/api/forget-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const trimmedEmail = email.trim();

    // Case-insensitive search for user
    const { data: users, error: findError } = await supabase
      .from("users")
      .select("*")
      .ilike("email", trimmedEmail)
      .limit(1);

    if (findError) return NextResponse.json({ error: "Error finding user" }, { status: 500 });
    if (!users || users.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = users[0];

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Update user: must_change_password + temp password
    const { error: updateError } = await supabase
      .from("users")
      .update({
        temp_password: tempPassword,
        must_change_password: true
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Send email via Brevo — 🟢 single line htmlContent to avoid unterminated template
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME, email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: trimmedEmail }],
        subject: "Temporary Password",
        htmlContent: `<p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Please login and set a new password.</p>`
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log("Brevo error:", errText);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Temporary password sent" });
  } catch (err: any) {
    console.log("Catch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
