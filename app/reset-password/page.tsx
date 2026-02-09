"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import styles from "../forget-password/forget-password.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const validatePassword = (pwd: string) => {
    if (pwd.length > 16) return "Password must be max 16 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least 1 uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least 1 number";
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) return "Password must contain at least 1 special character";
    return null;
  };

  useEffect(() => {
    if (!token) {
      router.push("/forget-password");
      return;
    }

    const checkToken = async () => {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("reset_token", token)
        .single();

      if (!user) {
        setError("Invalid or expired token");
        return;
      }

      const now = new Date();
      if (new Date(user.reset_token_expires_at) < now) {
        setError("Token expired");
        return;
      }

      setUserId(user.id);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) return;

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
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password,
          password_expires_at: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString(),
          reset_token: null,
          reset_token_expires_at: null,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setSuccess("Password reset successfully! Redirecting to login...");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => router.push("/login"), 2000);
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
          <h2 className={styles.heading}>Reset Password</h2>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <label className={styles.inputLabel}>New Password</label>
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

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
