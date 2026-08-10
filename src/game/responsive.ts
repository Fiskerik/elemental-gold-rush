import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export const TABLET_BREAKPOINT_PX = 768;

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function readIsTabletLayout(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && window.innerWidth >= TABLET_BREAKPOINT_PX;
}

export function useIsTabletLayout(): boolean {
  const [isTabletLayout, setIsTabletLayout] = useState<boolean>(() => readIsTabletLayout());

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only native tablets get the wide layout — a wide desktop browser must NOT
    // be treated as a tablet (that was making the web board too broad).
    const update = () => setIsTabletLayout(readIsTabletLayout());

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
    };
  }, []);

  return isTabletLayout;
}

/**
 * Whether the board/play area should use the wide layout.
 * - Native: follows the device (tablets get the wide layout).
 * - Web: stays on the compact mobile presentation so desktop browsers do not
 *   scale the playfield into a different game experience.
 */
export function useWideBoardLayout(): boolean {
  const isTabletLayout = useIsTabletLayout();
  return isNativePlatform() && isTabletLayout;
}
