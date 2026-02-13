// login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "./login.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim();

      // 1️⃣ Organization
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("id, status")
        .eq("code", orgCode.trim())
        .single();

      if (orgError || !organization || organization.status !== "active") {
        throw new Error("Invalid organization code");
      }

      // 2️⃣ User
      const { data: user, error: userError } = await supabase
        .from("users")
        .select(`
          id,
          status,
          password,
          temp_password,
          must_change_password,
          password_expires_at
        `)
        .eq("organization_id", organization.id)
        .ilike("email", normalizedEmail)
        .single();

      if (userError || !user) throw new Error("User not found");
      if (user.status !== "active") throw new Error("User inactive");

      // 3️⃣ TEMP PASSWORD → FORCE CHANGE
      if (user.must_change_password) {
        if (!user.temp_password || password !== user.temp_password) {
          throw new Error("Invalid temporary password");
        }

        router.push(`/set-password?userId=${user.id}`);
        return;
      }

      // 4️⃣ PERMANENT PASSWORD CHECK
      if (password !== user.password) {
        throw new Error("Invalid password");
      }

      // 5️⃣ Password expiry check
      if (user.password_expires_at && new Date(user.password_expires_at) < new Date()) {
        throw new Error("Password expired. Please reset your password.");
      }

      // ✅ 6️⃣ SUCCESS LOGIN → DASHBOARD
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <h1 className={styles.logo}>ReleaseGuard</h1>
        <p className={styles.tagline}>Control your releases. Eliminate risk.</p>
      </div>

      <div className={styles.right}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.heading}>Sign in</h2>

          {error && <p className={styles.error}>{error}</p>}

          <label className={styles.inputLabel}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.inputField}
            required
          />

          <label className={styles.inputLabel}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.inputField}
            required
          />

          <label className={styles.inputLabel}>Organization Code</label>
          <input
            type="text"
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            className={styles.inputField}
            required
          />

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className={styles.footer}>
            <Link href="/forget-password" className={styles.forgetLink}>
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
