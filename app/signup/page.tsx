"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import styles from "./signup.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");

  // ✅ DEFAULT ROLE = ADMIN
  const [role, setRole] = useState("admin");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Super Admin removed
  const rolesList = [
    "admin",
    "QA Lead",
    "QA",
    "Dev Lead",
    "Dev",
    "Project Manager",
  ];

  const normalizeRole = (r: string) =>
    r.trim().toLowerCase().replace(/\s+/g, "-");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedRole = normalizeRole(role);

      // =============================
      // 1️⃣ CHECK DUPLICATE EMAIL
      // =============================
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        throw new Error("Email already registered");
      }

      // =============================
      // 2️⃣ FIND OR CREATE ORGANIZATION
      // =============================
      let { data: organization } = await supabase
        .from("organizations")
        .select("*")
        .eq("code", orgCode.trim())
        .maybeSingle();

      let orgId = "";

      if (!organization) {
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName.trim(),
            code: orgCode.trim(),
            status: "active",
            plan: "free",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (orgError || !newOrg)
          throw new Error("Failed to create organization");

        organization = newOrg;
      }

      orgId = organization.id;

      // =============================
      // 3️⃣ FIND OR CREATE ROLE
      // =============================
      let { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", normalizedRole)
        .maybeSingle();

      let roleId = "";

      if (!roleData) {
        const { data: newRole, error: roleError } = await supabase
          .from("roles")
          .insert({
            organization_id: orgId,
            name: normalizedRole,
            is_system_role: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (roleError || !newRole)
          throw new Error("Failed to create role");

        roleId = newRole.id;
      } else {
        roleId = roleData.id;
      }

      // =============================
      // 4️⃣ CREATE USER
      // =============================
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          organization_id: orgId,
          role_id: roleId,
          status: "active",
          password: null,
          temp_password: null,
          must_change_password: true,
          password_expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userError || !newUser)
        throw new Error("Failed to create user");

      // =============================
      // 5️⃣ SET ORG OWNER (FIRST USER)
      // =============================
      if (!organization.owner_user_id) {
        await supabase
          .from("organizations")
          .update({
            owner_user_id: newUser.id,
          })
          .eq("id", orgId);
      }

      // =============================
      // ✅ REDIRECT TO PASSWORD SETUP
      // =============================
      router.push(`/set-password?userId=${newUser.id}`);

      // reset
      setName("");
      setEmail("");
      setOrgName("");
      setOrgCode("");
      setRole("admin");

    } catch (err: any) {
      setError(err.message || "Signup failed");
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
          <h2 className={styles.heading}>Sign Up</h2>

          {error && <p className={styles.error}>{error}</p>}

          <label>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label>Organization Name</label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          <label>Organization Code</label>
          <input
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
            required
          />

          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {rolesList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
