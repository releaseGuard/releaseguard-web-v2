"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "./login.module.css";

type UserWithRole = {
  id: string;
  status: string;
  password: string | null;
  temp_password: string | null;
  must_change_password: boolean;
  password_expires_at: string | null;
  role_id: string;
  roles:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

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

  const normalizeRole = (role: string) =>
    role.trim().toLowerCase().replace(/\s+/g, "-");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim();

      // ✅ Organization check
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("id, status")
        .eq("code", orgCode.trim())
        .single();

      if (orgError || !organization || organization.status !== "active") {
        throw new Error("Invalid organization code");
      }

      // ✅ User + Role (FIXED RELATION)
      const { data: user, error: userError } = await supabase
        .from("users")
        .select(`
          id,
          status,
          password,
          temp_password,
          must_change_password,
          password_expires_at,
          role_id,
          roles:role_id (
            name
          )
        `)
        .eq("organization_id", organization.id)
        .ilike("email", normalizedEmail)
        .single<UserWithRole>();

      if (userError || !user) throw new Error("User not found");
      if (user.status !== "active") throw new Error("User inactive");

      // ✅ Temp password
      if (user.must_change_password) {
        if (!user.temp_password || password !== user.temp_password) {
          throw new Error("Invalid temporary password");
        }

        router.push(`/set-password?userId=${user.id}`);
        return;
      }

      // ✅ Password check
      if (password !== user.password) {
        throw new Error("Invalid password");
      }

      // ✅ Expiry
      if (
        user.password_expires_at &&
        new Date(user.password_expires_at) < new Date()
      ) {
        throw new Error("Password expired.");
      }

      // ============================
      // ✅ FINAL ROLE EXTRACTION
      // ============================
      let roleName = "";

      if (!user.roles) {
        throw new Error("User role not assigned");
      }

      if (Array.isArray(user.roles)) {
        roleName = user.roles[0]?.name ?? "";
      } else {
        roleName = user.roles.name ?? "";
      }

      roleName = normalizeRole(roleName);

      if (!roleName) {
        throw new Error("Role missing from database");
      }

      console.log("✅ FINAL ROLE:", roleName);

      // ✅ Redirect mapping
      let redirectPath = "/dashboard/company-admin";

      if (roleName === "super-admin")
        redirectPath = "/dashboard/super-admin";
      else if (roleName === "qa-lead")
        redirectPath = "/dashboard/qa-lead";
      else if (roleName === "qa")
        redirectPath = "/dashboard/qa";
      else if (roleName === "company-admin")
        redirectPath = "/dashboard/company-admin";

      // ✅ Save session
      localStorage.setItem(
        "rg_user",
        JSON.stringify({
          userId: user.id,
          organizationId: organization.id,
          role: roleName,
        })
      );

      router.replace(redirectPath);
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
        <p className={styles.tagline}>
          Control your releases. Eliminate risk.
        </p>
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

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
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
