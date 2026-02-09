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
      /* 1️⃣ Organization */
      const { data: organization } = await supabase
        .from("organizations")
        .select("id, status")
        .eq("code", orgCode)
        .single();

      if (!organization || organization.status !== "active") {
        throw new Error("Invalid organization code");
      }

      /* 2️⃣ User (CASE INSENSITIVE) */
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, status, password, password_expires_at")
        .eq("organization_id", organization.id)
        .ilike("email", email.trim())
        .single();

      if (userError || !user) throw new Error("User not found");
      if (user.status !== "active") throw new Error("User inactive");

      /* 3️⃣ Password */
      if (user.password !== password) {
        throw new Error("Invalid password");
      }

      /* 4️⃣ Expiry */
      if (
        user.password_expires_at &&
        new Date(user.password_expires_at) < new Date()
      ) {
        throw new Error("Password expired");
      }

      /* 5️⃣ Roles */
      const { data: roles } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", user.id);

      const roleNames = roles?.map((r: any) => r.roles.name) || [];

      /* 6️⃣ Redirect */
      if (roleNames.includes("Super admin")) {
        router.push("/organization/overview");
      } else if (
        roleNames.includes("QA lead") ||
        roleNames.includes("Dev Lead")
      ) {
        router.push("/projects");
      } else {
        router.push("/my-work");
      }
    } catch (err: any) {
      setError(err.message);
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
          <h2>Sign in</h2>

          {error && <p className={styles.error}>{error}</p>}

          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          <label>Organization Code</label>
          <input
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            required
          />

          <button disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className={styles.footer}>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
