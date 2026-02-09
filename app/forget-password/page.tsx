"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import styles from "./forget-password.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Case-insensitive email check using ilike
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email.trim())
        .single();

      if (!user) {
        setError("Email not found");
        return;
      }

      // Generate temporary token
      const token = Math.random().toString(36).substring(2, 12); // 10 char token
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

      // Store token in DB
      const { error: updateError } = await supabase
        .from("users")
        .update({
          reset_token: token,
          reset_token_expires_at: expiry.toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Normally send email here; for demo console log
      console.log(`Reset link: https://yourapp.com/reset-password?token=${token}`);

      setSuccess("Password reset link has been sent to your email!");
      setEmail("");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.right}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.heading}>Forget Password</h2>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <label className={styles.inputLabel}>Enter your email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.inputField}
            required
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Processing..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
