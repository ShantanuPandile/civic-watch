import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import { NAGPUR } from "@/lib/civic";

export type MapMarker = { id: string; lat: number; lng: number; color: string; popup?: string };

// Leaflet is loaded only in the browser (dynamic import inside effect).
export function CivicMap({
  markers = [],
  picked,
  onPick,
  className = "h-80",
  zoom = 13,
}: {
  markers?: MapMarker[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  className?: string;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Leaf = (mod as any).default ?? mod;
      L.current = Leaf;
      const m = Leaf.map(el.current).setView([picked?.lat ?? NAGPUR.lat, picked?.lng ?? NAGPUR.lng], zoom);
      Leaf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(m);
      layer.current = Leaf.layerGroup().addTo(m);
      m.on("click", (e: any) => pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.current = m;
      draw();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Leaf = L.current;
    if (!Leaf || !layer.current) return;
    layer.current.clearLayers();
    const icon = (color: string, size = 18) =>
      Leaf.divIcon({ className: "", html: `<div class="civic-pin" style="width:${size}px;height:${size}px;background:${color}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    for (const mk of markers) {
      const mm = Leaf.marker([mk.lat, mk.lng], { icon: icon(mk.color) });
      if (mk.popup) mm.bindPopup(mk.popup);
      mm.addTo(layer.current);
    }
    if (picked) {
      Leaf.marker([picked.lat, picked.lng], { icon: icon("var(--primary)", 24) }).addTo(layer.current);
    }
  }

  useEffect(() => {
    draw();
    if (picked && map.current) map.current.panTo([picked.lat, picked.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, picked?.lat, picked?.lng]);

  return <div ref={el} className={`w-full ${className}`} />;
}
