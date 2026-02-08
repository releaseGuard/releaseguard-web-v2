"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "./login.module.css"; // Ensure this path still works

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error("Invalid email or password");
      }

      const userId = authData.user.id;

      const { data: organization } = await supabase
        .from("organizations")
        .select("id, status")
        .eq("slug", orgCode)
        .single();

      if (!organization || organization.status !== "active") {
        throw new Error("Organization not found or inactive");
      }

      const { data: userRecord } = await supabase
        .from("users")
        .select("id, status")
        .eq("auth_user_id", userId)
        .eq("organization_id", organization.id)
        .single();

      if (!userRecord || userRecord.status !== "active") {
        throw new Error("User inactive or not registered");
      }

      const { data: license } = await supabase
        .from("licenses")
        .select("expires_at")
        .eq("organization_id", organization.id)
        .single();

      if (!license || new Date(license.expires_at) < new Date()) {
        throw new Error("License expired. Contact admin");
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select(`roles(name)`)
        .eq("user_id", userRecord.id);

      const roleNames = roles?.map((r: any) => r.roles.name) || [];

      if (roleNames.includes("super_admin")) router.push("/organization/overview");
      else if (roleNames.includes("lead")) router.push("/projects");
      else router.push("/my-work");
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
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          <label>Organization Code</label>
          <input value={orgCode} onChange={(e) => setOrgCode(e.target.value)} required />

          <button disabled={loading}>{loading ? "Signing in..." : "Login"}</button>

          <div className={styles.footer}>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
