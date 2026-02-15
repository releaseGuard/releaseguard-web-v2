"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.superadmin.module.css";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [firstName, setFirstName] = useState("R");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const session = localStorage.getItem("rg_user");

      if (!session) {
        router.replace("/login");
        return;
      }

      const parsed = JSON.parse(session);

      if (parsed.role !== "super-admin") {
        router.replace("/dashboard/company-admin");
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("name, profile_image_url")
        .eq("id", parsed.userId)
        .single();

      if (data?.name) setFirstName(data.name);
      if (data?.profile_image_url)
        setProfileImage(data.profile_image_url);

      setAuthChecked(true);
    };

    init();
  }, [router]);

  if (!authChecked) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("rg_user");
    router.replace("/login");
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>ReleaseGuard Admin</div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            Super Admin Dashboard
          </div>

          <div className={styles.profileWrapper} ref={profileRef}>
            <div
              className={styles.profileIcon}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {profileImage ? (
                <img src={profileImage} className={styles.profileImage} />
              ) : (
                firstName.charAt(0).toUpperCase()
              )}
            </div>

            {showDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownItem}>Profile</div>
                <div className={styles.dropdownItem}>Theme</div>
                <div className={styles.dropdownItem}>Change Password</div>
                <div
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  Logout
                </div>
              </div>
            )}
          </div>
        </header>
      </div>
    </div>
  );
}
