"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation"; // ✅ router import
import styles from "./dashboard.module.css";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const router = useRouter(); // ✅ router instance
  const [activeMenu, setActiveMenu] = useState("Projects");
  const [showDropdown, setShowDropdown] = useState(false);

  const [firstName, setFirstName] = useState("U");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const { data, error } = await supabase
          .from("users")
          .select("first_name, profile_image_url")
          .eq("id", userId)
          .single();

        if (error || !data) return;

        if (data.first_name) setFirstName(data.first_name);
        if (data.profile_image_url) setProfileImage(data.profile_image_url);
      } catch (err) {
        console.log(err);
      }
    };

    loadUser();
  }, []);

  const userInitial = firstName?.charAt(0).toUpperCase();

  const menuItems = [
    "Projects",
    "Test Cases",
    "Test Execution",
    "Release Versions",
    "Reports",
  ];

  // ✅ Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ Logout handler
  const handleLogout = async () => {
    // Supabase sign out
    await supabase.auth.signOut();

    // Clear localStorage if userId stored
    localStorage.removeItem("userId");

    // Redirect to login page
    router.push("/login");
  };

  return (
    <div className={styles.wrapper}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>ReleaseGuard</div>
        {menuItems.map((item) => (
          <div
            key={item}
            onClick={() => setActiveMenu(item)}
            className={`${styles.menuItem} ${
              activeMenu === item ? styles.active : ""
            }`}
          >
            {item}
          </div>
        ))}
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        {/* TOPBAR */}
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>Dashboard</div>

          <div className={styles.profileWrapper} ref={profileRef}>
            <div
              className={styles.profileIcon}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  className={styles.profileImage}
                  alt="profile"
                />
              ) : (
                userInitial
              )}
            </div>

            {showDropdown && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownItem}>Profile</div>
                <div className={styles.dropdownItem}>Theme</div>
                <div className={styles.dropdownItem}>Change Password</div>
                {/* ✅ Logout */}
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

        {/* CONTENT */}
        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Total Projects</div>
            <div className={styles.cardValue}>12</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Active Test Runs</div>
            <div className={styles.cardValue}>5</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Pending Releases</div>
            <div className={styles.cardValue}>3</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Defects Found</div>
            <div className={styles.cardValue}>27</div>
          </div>
        </div>
      </div>
    </div>
  );
}
