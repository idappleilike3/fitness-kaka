"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

export function HeroPhotoFlip() {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFlipped((value) => !value);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <button type="button" className={styles.heroFlipButton}
      aria-label={flipped ? "返回卡卡照片正面" : "查看卡卡照片背面"}
      aria-pressed={flipped} onClick={() => setFlipped((value) => !value)}>
      <span className={`${styles.heroFlipCard} ${flipped ? styles.heroFlipActive : ""}`}>
        <span className={`${styles.heroFlipFace} ${styles.heroFlipFront}`}>
          <Image className={styles.challengeImage} src="/images/hero-kaka-original.webp"
            alt="卡卡健身教練與 30 天減脂挑戰功能總覽" width={1086} height={1448}
            priority sizes="(max-width: 899px) 92vw, 46vw" />
        </span>
        <span className={`${styles.heroFlipFace} ${styles.heroFlipBack}`}>
          <Image className={`${styles.challengeImage} ${styles.challengeImageSafe}`} src="/images/hero-kaka-cyberpunk-pink-v5.webp"
            alt="粉紅賽博朋克卡卡健身減脂營養教練功能畫面" width={1086} height={1448}
            sizes="(max-width: 899px) 92vw, 46vw" />
        </span>
      </span>
      <span className={styles.heroFlipHint}>{flipped ? "自動展示中・點一下返回" : "每 4 秒自動翻轉"}</span>
    </button>
  );
}
