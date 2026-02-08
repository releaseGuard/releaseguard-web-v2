"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import styles from "./signup.module.css"; // CSS same as login template

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [role, setRole] = useState("QA"); // default role
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rolesList = ["Super admin", "QA lead", "QA", "Dev Lead", "Dev", "Project Manager"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 🔹 Check duplicate email
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      if (existingUser) throw new Error("Email already registered");

      // 🔹 Check if organization exists
      let { data: organization } = await supabase
        .from("organizations")
        .select("*")
        .eq("code", orgCode)
        .single();

      let orgId = "";

      if (!organization) {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: orgName, code: orgCode, status: "active" })
          .select()
          .single();

        if (orgError || !newOrg) throw new Error("Failed to create organization");
        orgId = newOrg.id;
      } else {
        orgId = organization.id;
      }

      // 🔹 Insert user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          auth_user_id: null, // abhi signup me auth nahi bana
          name,
          email,
          organization_id: orgId,
          status: "active",
        })
        .select()
        .single();

      if (userError || !newUser) throw new Error("Failed to create user");

      // 🔹 Get role id (or create role if not exists)
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("organization_id", orgId)
        .eq("name", role)
        .single();

      let roleId = "";
      if (!roleData) {
        const { data: newRole } = await supabase
          .from("roles")
          .insert({ organization_id: orgId, name: role, is_system_role: false })
          .select()
          .single();
        if (!newRole) throw new Error("Failed to create role");
        roleId = newRole.id;
      } else {
        roleId = roleData.id;
      }

      // 🔹 Assign role to user
      const { error: userRoleError } = await supabase.from("user_roles").insert({
        user_id: newUser.id,
        role_id: roleId,
      });

      if (userRoleError) throw new Error("Failed to assign role");

      // ✅ Success
      setSuccess("User successfully created!");
      setName("");
      setEmail("");
      setOrgName("");
      setOrgCode("");
      setRole("QA");
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
          <h2>Sign Up</h2>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />

          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label>Organization Name</label>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} type="text" required />

          <label>Organization Code</label>
          <input value={orgCode} onChange={(e) => setOrgCode(e.target.value)} type="text" required />

          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {rolesList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button disabled={loading}>{loading ? "Signing up..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
}
