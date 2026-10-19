import { useEffect, useState } from "react";
import { vb, type Site } from "../lib/vaultbase.ts";

const fallback = { title: "A Vaultbase blog", tagline: "" };

/**
 * The site's title and tagline, from the `site` singleton.
 *
 * Admins edit them in the Vaultbase admin (Collections → site). The change
 * arrives over realtime, so open pages update without a reload.
 */
export function useSite(): { title: string; tagline: string } {
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    vb.singleton("site").get()
      .then((s) => {
        if (cancelled) return;
        setSite(s);
        // Follow the one record by its id.
        unsubscribe = vb.subscribe("site", s.id, (event) => {
          if (event.type === "update" && event.record) setSite(event.record as Site);
        });
      })
      .catch(() => { /* the fallback title will do */ });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return { title: site?.title || fallback.title, tagline: site?.tagline || fallback.tagline };
}
