import { useMemo, useState } from "react";
import "./index.css";

/** CONFIGURACIÓN BÁSICA */
const WHATSAPP_NUMBER = "5493760000000"; // ← Reemplazar por tu número (cod país + cod área + número, sin + ni 0)
const VEHICLES = {
  moto: { label: "Moto", base: 2500, perKm: 300, maxVolumen: "Caja chica" },
  auto: { label: "Auto", base: 3500, perKm: 400, maxVolumen: "Baúl / 2-3 bultos" },
  camioneta: { label: "Camioneta", base: 6000, perKm: 600, maxVolumen: "Carga mediana" },
} as const;

type VehicleKey = keyof typeof VEHICLES;

function formatARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function App() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState<VehicleKey>("camioneta");
  const [km, setKm] = useState<string>("5");
  const [ayudante, setAyudante] = useState(false);
  const [facturaA, setFacturaA] = useState(false);
  const [notas, setNotas] = useState("");

  const precio = useMemo(() => {
    const kmNum = Math.max(0, Number(km) || 0);
    const v = VEHICLES[vehiculo];
    const base = v.base + v.perKm * kmNum;
    const extraAyudante = ayudante ? 3000 : 0; // flat por servicio
    const recargoFacturaA = facturaA ? base * 0.1 : 0; // ejemplo 10%
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
      `💰 Estimado: ${formatARS(precio.total)} (Base ${formatARS(precio.baseVehiculo)} + ${formatARS(precio.perKm)} x km + extras)`,
    ]
      .filter(Boolean)
      .join("\n");

    const encoded = encodeURIComponent(lineas);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  }

  const canQuote = origen.trim() && destino.trim() && Number(km) > 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* NAV */}
      <nav className="sticky top-0 z-10 w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-gray-50 font-bold">TF</span>
            <span className="text-lg font-semibold tracking-tight">tuflete</span>
          </div>
          <div className="hidden gap-4 md:flex">
            <a href="#cotizar" className="text-sm text-gray-600 hover:text-gray-900">Cotizar</a>
            <a href="#flota" className="text-sm text-gray-600 hover:text-gray-900">Flota</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900">Ayuda</a>
          </div>
          <a href="#cotizar" className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:border-indigo-400 hover:bg-indigo-50">
            Pedir ahora
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Fletes de última milla en <span className="text-indigo-600">minutos</span>
            </h1>
            <p className="mt-3 text-gray-600">
              Retiro y entrega puerta a puerta. Tarifas claras. Pedilo por WhatsApp, sin vueltas.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="#cotizar" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-white shadow hover:opacity-95">
                Cotizar envío
              </a>
              <a
                className="inline-flex items-center justify-center rounded-xl border px-5 py-2.5 hover:border-indigo-400 hover:bg-indigo-50"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
              >
                Hablar por WhatsApp
              </a>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 text-sm text-gray-600 md:max-w-md">
              <li className="rounded-xl border bg-white p-3">⏱️ Entregas rápidas</li>
              <li className="rounded-xl border bg-white p-3">🧾 Facturamos A/B</li>
              <li className="rounded-xl border bg-white p-3">🔒 Seguro básico</li>
              <li className="rounded-xl border bg-white p-3">📍 Seguimiento simple</li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1554078212-84c9d93b8043?q=80&w=1600&auto=format&fit=crop"
              alt="Entrega de paquetes"
              className="h-64 w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </header>

      {/* FORMULARIO DE COTIZACIÓN */}
      <section id="cotizar" className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Cotizá tu envío</h2>
            <p className="mt-1 text-sm text-gray-600">Completá los datos y generá tu pedido por WhatsApp.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Nombre</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400" placeholder="Tu nombre" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Teléfono (opcional)</label>
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400" placeholder="+54 9 ..." />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Vehículo</label>
                <select value={vehiculo} onChange={(e) => setVehiculo(e.target.value as VehicleKey)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400">
                  {Object.entries(VEHICLES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} — base {formatARS(v.base)} / {formatARS(v.perKm)} x km
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Capacidad aprox.: {VEHICLES[vehiculo].maxVolumen}</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Distancia estimada (km)</label>
                <input
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                  placeholder="Ej: 7"
                  inputMode="decimal"
                />
                <p className="mt-1 text-xs text-gray-500">Por ahora ingresá un estimado (agregaremos mapa luego).</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Origen</label>
                <input value={origen} onChange={(e) => setOrigen(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400" placeholder="Dirección de retiro" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Destino</label>
                <input value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400" placeholder="Dirección de entrega" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
                <input value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400" placeholder="Pisos, horarios, referencias..." />
              </div>

              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={ayudante} onChange={(e) => setAyudante(e.target.checked)} className="h-4 w-4" />
                  Necesito ayudante (+{formatARS(3000)})
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={facturaA} onChange={(e) => setFacturaA(e.target.checked)} className="h-4 w-4" />
                  Factura A (+10%)
                </label>
              </div>
            </div>

            {/* RESUMEN */}
            <div className="mt-6 rounded-xl border bg-gray-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">Resumen:</span>
                <span>Base vehículo: {formatARS(precio.baseVehiculo)}</span>
                <span>•</span>
                <span>{precio.km} km x {formatARS(precio.perKm)} = {formatARS(precio.perKm * precio.km)}</span>
                {ayudante && (<><span>•</span><span>Ayudante: {formatARS(precio.extraAyudante)}</span></>)}
                {facturaA && (<><span>•</span><span>Recargo Factura A: {formatARS(precio.recargoFacturaA)}</span></>)}
                <span className="ml-auto text-base font-semibold">Total: {formatARS(precio.total)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <a
                href={buildWhatsAppURL()}
                target="_blank"
                className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-white shadow ${
                  canQuote ? "bg-indigo-600 hover:opacity-95" : "bg-gray-300 cursor-not-allowed"
                }`}
                onClick={(e) => { if (!canQuote) e.preventDefault(); }}
              >
                Enviar pedido por WhatsApp
              </a>
              <button
                className="rounded-xl border px-5 py-2.5 hover:border-indigo-400 hover:bg-indigo-50"
                onClick={() => {
                  setNombre(""); setTelefono(""); setOrigen(""); setDestino("");
                  setVehiculo("camioneta"); setKm("5"); setAyudante(false); setFacturaA(false); setNotas("");
                }}
              >
                Limpiar
              </button>
            </div>
            {!canQuote && <p className="mt-2 text-xs text-amber-600">Completá origen, destino y km para habilitar WhatsApp.</p>}
          </div>

          {/* TARJETAS DE FLOTA / INFO */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Flota disponible</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {Object.entries(VEHICLES).map(([k, v]) => (
                  <li key={k} className="rounded-xl border bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span>{v.label}</span>
                      <span className="text-gray-500">Base {formatARS(v.base)} • {formatARS(v.perKm)}/km</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Capacidad: {v.maxVolumen}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div id="faq" className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Preguntas rápidas</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
                <li>Podés pagar en efectivo o transferencia.</li>
                <li>Tiempo de espera incluido: 10 min. Luego {formatARS(1500)}/cada 15 min.</li>
                <li>Operamos principalmente en Posadas y alrededores.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-gray-600">
          <span>© {new Date().getFullYear()} tuflete</span>
          <a className="hover:text-gray-900" href="https://github.com/gazzimon/tuflete" target="_blank" rel="noreferrer">
            GitHub del proyecto
          </a>
        </div>
      </footer>
    </main>
  );
}
