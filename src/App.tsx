import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

/* ====== Mapa (Leaflet) ====== */
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
// Fix de íconos en Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
});

/* ====== Configuración de negocio ====== */
const WHATSAPP_NUMBER = "5493764876249"; // ← reemplazá por tu número (sin + ni espacios)

const VEHICLES = {
  moto: { label: "Moto", base: 2500, perKm: 300, maxVolumen: "Caja chica" },
  auto: { label: "Auto", base: 3500, perKm: 400, maxVolumen: "Baúl / 2-3 bultos" },
  camioneta: { label: "Camioneta", base: 6000, perKm: 600, maxVolumen: "Carga mediana" },
} as const;
type VehicleKey = keyof typeof VEHICLES;

function formatARS(n: number) {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

/* ====== Helpers de geocoding / routing (Nominatim + OSRM, sin API key) ====== */
type Pt = { lat: number; lon: number };
const toLatLng = (p: Pt): LatLngExpression => [p.lat, p.lon];

async function geocode(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Geocoding error");
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) throw new Error("No se encontraron resultados");
  const { lat, lon } = data[0];
  return { lat: Number(lat), lon: Number(lon) } as Pt;
}

async function routeOSRM(from: Pt, to: Pt) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing error");
  const data = await res.json();
  if (!data.routes?.length) throw new Error("Sin ruta");
  const meters: number = data.routes[0].distance;
  const geo: [number, number][] = data.routes[0].geometry.coordinates; // [lon, lat]
  const latlngs: LatLngExpression[] = geo.map(([lon, lat]) => [lat, lon]); // Leaflet usa [lat,lon]
  const km = Math.max(0, Math.round(meters / 100) / 10); // redondeo a 0.1km
  return { km, latlngs };
}

/* ====== Componente para ajustar vista del mapa ====== */
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

export default function App() {
  // Datos del formulario
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState<VehicleKey>("camioneta");
  const [km, setKm] = useState<string>("5");
  const [ayudante, setAyudante] = useState(false);
  const [facturaA, setFacturaA] = useState(false);
  const [notas, setNotas] = useState("");

  // Estado del cálculo y mapa
  const [from, setFrom] = useState<Pt | undefined>();
  const [to, setTo] = useState<Pt | undefined>();
  const [route, setRoute] = useState<LatLngExpression[]>([]);
  const [calcStatus, setCalcStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [calcMsg, setCalcMsg] = useState("");

  /* ====== Geocodificar automáticamente cuando escribís ====== */
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (origen.trim().length < 3 && destino.trim().length < 3) {
      setCalcStatus("idle");
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setCalcStatus("loading");
        setCalcMsg("Buscando direcciones…");
        const nf = origen.trim().length >= 3 ? await geocode(origen) : undefined;
        const nt = destino.trim().length >= 3 ? await geocode(destino) : undefined;
        setFrom(nf);
        setTo(nt);
        setCalcStatus("idle");
        setCalcMsg("");
      } catch {
        setCalcStatus("error");
        setCalcMsg("No se pudo geocodificar alguna dirección.");
      }
    }, 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [origen, destino]);

  /* ====== Calcular ruta (y km) cuando hay ambos puntos ====== */
  useEffect(() => {
    (async () => {
      if (from && to) {
        try {
          setCalcStatus("loading");
          setCalcMsg("Calculando ruta…");
          const r = await routeOSRM(from, to);
          setRoute(r.latlngs);
          setKm(String(r.km));
          setCalcStatus("idle");
          setCalcMsg("");
        } catch {
          setCalcStatus("error");
          setCalcMsg("No se pudo calcular la ruta.");
          setRoute([]);
        }
      } else {
        setRoute([]);
      }
    })();
  }, [from, to]);

  /* ====== Click en el mapa: primero origen, luego destino; ambos arrastrables ====== */
  const nextIsFrom = useMemo(() => !from || (from && to), [from, to]);
  function handleMapClick(e: L.LeafletMouseEvent) {
    const p = { lat: e.latlng.lat, lon: e.latlng.lng };
    if (nextIsFrom) setFrom(p);
    else setTo(p);
  }
  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setFrom({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
  }

  /* ====== Precio ====== */
  const precio = useMemo(() => {
    const kmNum = Math.max(0, Number(km) || 0);
    const v = VEHICLES[vehiculo];
    const base = v.base + v.perKm * kmNum;
    const extraAyudante = ayudante ? 3000 : 0;
    const recargoFacturaA = facturaA ? base * 0.1 : 0;
    const total = Math.round(base + extraAyudante + recargoFacturaA);
    return {
      baseVehiculo: v.base,
      perKm: v.perKm,
      km: kmNum,
      extraAyudante,
      recargoFacturaA,
      total,
    };
  }, [vehiculo, km, ayudante, facturaA]);

  /* ====== WhatsApp ====== */
  function buildWhatsAppURL() {
    const v = VEHICLES[vehiculo];
    const lineas = [
      `🚚 *Pedido de flete* - tuflete`,
      `👤 Nombre: ${nombre || "—"}`,
      telefono ? `📞 Tel: ${telefono}` : null,
      `📦 Vehículo: ${v.label}`,
      `📍 Origen: ${origen || "—"}`,
      `🎯 Destino: ${destino || "—"}`,
      `📏 Distancia: ${precio.km} km`,
      ayudante ? `🧑‍🔧 Con ayudante: Sí` : `🧑‍🔧 Con ayudante: No`,
      facturaA ? `🧾 Factura: A` : `🧾 Factura: B / C`,
      notas ? `📝 Notas: ${notas}` : null,
      "",
      `💰 Estimado: ${formatARS(precio.total)} (Base ${formatARS(
        precio.baseVehiculo
      )} + ${formatARS(precio.perKm)} x km + extras)`,
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lineas)}`;
  }

  const canQuote = origen.trim() && destino.trim() && Number(km) > 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* NAV */}
      <nav className="sticky top-0 z-10 w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-gray-50 font-bold">
              TF
            </span>
            <span className="text-lg font-semibold tracking-tight">tuflete</span>
          </div>
          <a
            href="#cotizar"
            className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:border-indigo-400 hover:bg-indigo-50"
          >
            Pedir ahora
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Fletes de última milla en <span className="text-indigo-600">minutos</span>
        </h1>
        <p className="mt-3 text-gray-600">
          Retiro y entrega puerta a puerta. Tarifas claras. Pedilo por WhatsApp.
        </p>
      </header>

      {/* FORM + MAPA */}
      <section id="cotizar" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Cotizá tu envío</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Teléfono (opcional)
                </label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="+54 9 ..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Vehículo</label>
                <select
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value as VehicleKey)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                >
                  {Object.entries(VEHICLES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} — base {formatARS(v.base)} / {formatARS(v.perKm)} x
                      km
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Origen</label>
                <input
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="Dirección de retiro (calle, nro, ciudad)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Destino</label>
                <input
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="Dirección de entrega (calle, nro, ciudad)"
                />
              </div>

              {/* Distancia (auto, editable si querés forzar) */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Distancia estimada (km)
                </label>
                <div className="relative">
                  <input
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 pr-28 outline-none focus:border-indigo-400"
                    placeholder="Ej: 7"
                    inputMode="decimal"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    {calcStatus === "loading" ? "calculando…" : "auto"}
                  </span>
                </div>
                {calcStatus === "error" && (
                  <p className="mt-1 text-xs text-amber-600">{calcMsg}</p>
                )}
                {calcStatus === "loading" && (
                  <p className="mt-1 text-xs text-gray-500">{calcMsg}</p>
                )}
              </div>

              {/* MAPA */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Hacé clic en el mapa para fijar origen y destino. Podés
                    arrastrar los marcadores.
                  </span>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="rounded-xl border px-3 py-1.5 text-sm hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    Usar mi ubicación
                  </button>
                </div>

                <MapContainer
                  center={[-27.3671, -55.8961]} // Posadas aprox.
                  zoom={13}
                  style={{ height: 360, width: "100%", borderRadius: 16 }}
                  whenCreated={(map) => {
                    map.on("click", handleMapClick as any);
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

                  {!!route.length && <Polyline positions={route} />}
                  <FitBounds from={from} to={to} />
                </MapContainer>
              </div>
            </div>

            {/* RESUMEN */}
            <div className="mt-6 rounded-xl border bg-gray-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">Resumen:</span>
                <span>Base vehículo: {formatARS(precio.baseVehiculo)}</span>
                <span>•</span>
                <span>
                  {precio.km} km x {formatARS(precio.perKm)} ={" "}
                  {formatARS(precio.perKm * precio.km)}
                </span>
                {ayudante && (
                  <>
                    <span>•</span>
                    <span>Ayudante: {formatARS(precio.extraAyudante)}</span>
                  </>
                )}
                {facturaA && (
                  <>
                    <span>•</span>
                    <span>
                      Recargo Factura A: {formatARS(precio.recargoFacturaA)}
                    </span>
                  </>
                )}
                <span className="ml-auto text-base font-semibold">
                  Total: {formatARS(precio.total)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <a
                href={buildWhatsAppURL()}
                target="_blank"
                className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-white shadow ${
                  canQuote
                    ? "bg-indigo-600 hover:opacity-95"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!canQuote) e.preventDefault();
                }}
              >
                Enviar pedido por WhatsApp
              </a>
              <button
                className="rounded-xl border px-5 py-2.5 hover:border-indigo-400 hover:bg-indigo-50"
                onClick={() => {
                  setNombre("");
                  setTelefono("");
                  setOrigen("");
                  setDestino("");
                  setVehiculo("camioneta");
                  setKm("5");
                  setAyudante(false);
                  setFacturaA(false);
                  setNotas("");
                  setFrom(undefined);
                  setTo(undefined);
                  setRoute([]);
                  setCalcStatus("idle");
                  setCalcMsg("");
                }}
              >
                Limpiar
              </button>
            </div>
            {!canQuote && (
              <p className="mt-2 text-xs text-amber-600">
                Completá origen, destino y km para habilitar WhatsApp.
              </p>
            )}
          </div>

          {/* Aside simple */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Flota disponible</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {Object.entries(VEHICLES).map(([k, v]) => (
                  <li key={k} className="rounded-xl border bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span>{v.label}</span>
                      <span className="text-gray-500">
                        Base {formatARS(v.base)} • {formatARS(v.perKm)}/km
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Capacidad: {v.maxVolumen}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-gray-600">
          <span>© {new Date().getFullYear()} tuflete</span>
          <a
            className="hover:text-gray-900"
            href="https://github.com/gazzimon/tuflete"
            target="_blank"
            rel="noreferrer"
          >
            GitHub del proyecto
          </a>
        </div>
      </footer>
    </main>
  );
}
