"use client";

import { useState } from "react";
import styles from "./forget-password.module.css";

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
      // Convert email to lowercase before sending to API
      const normalizedEmail = email.trim().toLowerCase();

      const res = await fetch("/api/forget-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

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
