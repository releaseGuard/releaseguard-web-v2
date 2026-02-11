"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import styles from "./set-password.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length > 16) return "Password must be max 16 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain number";
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) return "Password must contain special character";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // verify user still requires change
      const { data: user } = await supabase
        .from("users")
        .select("must_change_password")
        .eq("id", userId)
        .single();

      if (!user || !user.must_change_password) {
        throw new Error("Password reset session expired.");
      }

      // ✅ PERMANENT PASSWORD SAVE
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: password,
          temp_password: null,
          must_change_password: false,
          password_expires_at: new Date(
            new Date().setMonth(new Date().getMonth() + 3)
          ).toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setSuccess("Password set successfully! Please login.");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => router.push("/login"), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) router.push("/login");
  }, [userId]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.right}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.heading}>Set Password</h2>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <label className={styles.inputLabel}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.inputField}
            required
          />

          <label className={styles.inputLabel}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.inputField}
            required
          />

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
