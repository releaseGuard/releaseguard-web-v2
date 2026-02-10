import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT: server-side only
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check user exists
    const { data: user } = await supabase
      .from("users")
      .select("id,email")
      .ilike("email", email)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-10);

    // Update DB: temp password + force change flag
    const { error: updateError } = await supabase
      .from("users")
      .update({
        temp_password: tempPassword,
        must_change_password: true,
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Prepare Brevo email
    const BREVO_API_KEY = process.env.BREVO_API_KEY!;
    const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL!;
    const SENDER_NAME = process.env.BREVO_SENDER_NAME!;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

    const resetLink = `${APP_URL}/reset-password?token=${tempPassword}`;

    // Send email via Brevo
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [{ email: user.email }],
        subject: "ReleaseGuard – Password Reset",
        htmlContent: `
          <p>Hello,</p>
          <p>You requested a password reset. Your temporary password is:</p>
          <h2>${tempPassword}</h2>
          <p>Login and change your password immediately.</p>
          <p>Or click this link to reset: <a href="${resetLink}">${resetLink}</a></p>
        `,
      }),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text();
      throw new Error(`Brevo email failed: ${errorText}`);
    }

    return NextResponse.json({
      success: true,
      message: "Temporary password sent to your email",
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
