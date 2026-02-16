import Image from "next/image";
import styles from "./logo.module.css";

export default function Logo() {
  return (
    <div className={styles.logoWrapper}>
      <Image
        src="/img/RG_logo.png"
        alt="ReleaseGuard Logo"
        width={160}
        height={40}
        priority
      />
    </div>
  );
}
