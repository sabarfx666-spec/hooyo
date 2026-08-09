"use client";
import { useEffect } from "react";
import { imgPendingUploads } from "@/lib/db";

/**
 * Blocks accidental tab-close while chart images are still uploading to the
 * cloud — closing the page mid-upload is how images get lost.
 *
 * Renders nothing: the upload chip is intentionally hidden.
 */
export function CloudStatus() {
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (imgPendingUploads() > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  return null;
}
