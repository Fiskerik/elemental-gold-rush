import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export const TABLET_BREAKPOINT_PX = 768;

function readIsTabletLayout(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && window.innerWidth >= TABLET_BREAKPOINT_PX;
}

export function useIsTabletLayout(): boolean {
  const [isTabletLayout, setIsTabletLayout] = useState<boolean>(() => readIsTabletLayout());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT_PX}px)`);
    const update = () => setIsTabletLayout(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isTabletLayout;
}
