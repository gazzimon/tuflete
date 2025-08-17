import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer, TileLayer, Marker, Polyline, useMap, Popup
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";

// ----- Fix de iconos en Vite -----
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
});

// Helpers
type Pt = { lat: number; lon: number };
const toLatLng = (p: Pt): LatLngExpression => [p.lat, p.lon];

// Fit bounds cuando hay dos puntos
function FitBounds({ from, to }: { from?: Pt; to?: Pt }) {
  const map = useMap();
  useEffect(() => {
    if (from && to) {
      const b = L.latLngBounds([toLatLng(from), toLatLng(to)]);
      map.fitBounds(b, { padding: [30, 30] });
    } else if (from) {
      map.setView(toLatLng(from), 14);
    }
  }, [from, to, map]);
  return null;
}

async function geocode(q: string): Promise<Pt> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    q
  )}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) throw new Error("No se encontró la dirección");
  return { lat: +data[0].lat, lon: +data[0].lon };
}

async function routeGeoJSON(from: Pt, to: Pt) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) throw new Error("Sin ruta");
  const meters: number = data.routes[0].distance;
  const geo: [number, number][] = data.routes[0].geometry.coordinates; // [lon,lat]
  // Convertimos a [lat,lon] para Leaflet:
  const latlngs: LatLngExpression[] = geo.map(([lon, lat]) => [lat, lon]);
  return { km: Math.round(meters / 100) / 10, latlngs };
}

export type MapPickerProps = {
  origenText: string;
  destinoText: string;
  onKmChange: (km: number) => void;
  onSetOrigenText?: (t: string) => void;
  onSetDestinoText?: (t: string) => void;
};

export default function MapPicker(props: MapPickerProps) {
  const { origenText, destinoText, onKmChange, onSetOrigenText, onSetDestinoText } = props;
  const [from, setFrom] = useState<Pt | undefined>();
  const [to, setTo] = useState<Pt | undefined>();
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  // Geolocalización para setear origen rápido
  function setMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setFrom(p);
    });
  }

  // Geocode cuando cambian los textos
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setStatus("loading");
        setMsg("Buscando direcciones…");
        const nf = origenText.trim().length >= 3 ? await geocode(origenText) : undefined;
        const nt = destinoText.trim().length >= 3 ? await geocode(destinoText) : undefined;
        setFrom(nf);
        setTo(nt);
        setStatus("idle");
        setMsg("");
      } catch (e: any) {
        setStatus("error");
        setMsg("No se pudo geocodificar alguna dirección.");
      }
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [origenText, destinoText]);

  // Calcular ruta cuando hay ambos puntos
  useEffect(() => {
    (async () => {
      if (from && to) {
        try {
          setStatus("loading");
          setMsg("Calculando ruta…");
          const r = await routeGeoJSON(from, to);
          setRoute(r.latlngs);
          onKmChange(r.km);
          setStatus("idle");
          setMsg("");
        } catch (e) {
          setStatus("error");
          setMsg("No se pudo calcular la ruta.");
          setRoute([]);
        }
      } else {
        setRoute([]);
      }
    })();
  }, [from, to, onKmChange]);

  // Click en el mapa: primero setea origen, luego destino (toggle)
  const nextIsFrom = useMemo(() => !from || (from && to), [from, to]);

  function handleMapClick(e: L.LeafletMouseEvent) {
    const p = { lat: e.latlng.lat, lon: e.latlng.lng };
    if (nextIsFrom) {
      setFrom(p);
      onSetOrigenText?.(""); // opcional: limpiar texto si se clickeó en mapa
    } else {
      setTo(p);
      onSetDestinoText?.("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {status === "loading" ? msg : status === "error" ? msg : "Hacé clic en el mapa para fijar origen/destino. Podés arrastrar los marcadores."}
        </span>
        <button
          type="button"
          onClick={setMyLocation}
          className="rounded-xl border px-3 py-1.5 text-sm hover:border-indigo-400 hover:bg-indigo-50"
        >
          Usar mi ubicación
        </button>
      </div>

<MapContainer
  center={[-27.3671, -55.8961]}
  zoom={13}
  style={{ height: 360, width: "100%", borderRadius: 16 }}
  whenReady={() => {
    const map = e.target; // tipo: L.Map
    map.on("click", (ev: L.LeafletMouseEvent) => {
      const p = { lat: ev.latlng.lat, lon: ev.latlng.lng };
      if (!from || (from && to)) setFrom(p);
      else setTo(p);
    });
  }}
>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {from && (
          <Marker
            position={toLatLng(from)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                setFrom({ lat: ll.lat, lon: ll.lng });
              },
            }}
          >
            <Popup>Origen</Popup>
          </Marker>
        )}

        {to && (
          <Marker
            position={toLatLng(to)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                setTo({ lat: ll.lat, lon: ll.lng });
              },
            }}
          >
            <Popup>Destino</Popup>
          </Marker>
        )}

        {!!route.length && (
          <Polyline positions={route} />
        )}

        <FitBounds from={from} to={to} />
      </MapContainer>
    </div>
  );
}
