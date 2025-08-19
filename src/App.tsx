import { useCallback, useRef, useState } from "react";
import {
  useJsApiLoader,
  GoogleMap,
  Autocomplete,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type VehicleKey = "moto" | "camioneta" | "camion";
type LatLng = { lat: number; lng: number };
type RouteInfo = { distanceText?: string; durationText?: string };

const MAP_CENTER: LatLng = { lat: -27.3621, lng: -55.9009 }; // Posadas
const WA_NUMBER = "5493764876249"; // sin "+"

const VEHICLE_AVAILABLE: Record<VehicleKey, boolean> = {
  moto: false,
  camioneta: true,
  camion: false,
};

// imágenes en /public/images
const VEHICLE_IMAGES: Record<VehicleKey, string> = {
  moto: "/images/moto.jpg",
  camioneta: "/images/camioneta.png",
  camion: "/images/camion.jpg",
};

const VEHICLE_LABELS: Record<VehicleKey, string> = {
  moto: "Moto",
  camioneta: "Camioneta",
  camion: "Camión",
};

function VehicleGallery({
  value,
  onChange,
}: {
  value: VehicleKey;
  onChange: (v: VehicleKey) => void;
}) {
  const items: VehicleKey[] = ["moto", "camioneta", "camion"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: ".75rem", width: "100%" }}>
      {items.map((key) => {
        const selected = value === key;
        const available = VEHICLE_AVAILABLE[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => available && onChange(key)}
            title={available ? VEHICLE_LABELS[key] : `${VEHICLE_LABELS[key]} (no disponible)`}
            style={{
              cursor: available ? "pointer" : "not-allowed",
              border: selected ? "2px solid #2563eb" : "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
              background: selected ? "rgba(37,99,235,.08)" : "#fff",
              boxShadow: selected ? "0 0 0 3px rgba(37,99,235,.15)" : "0 1px 3px rgba(0,0,0,.06)",
              opacity: available ? 1 : 0.5,
              padding: 0,
            }}
          >
            <div style={{ aspectRatio: "4 / 3", width: "100%", overflow: "hidden" }}>
              <img
                src={VEHICLE_IMAGES[key]}
                alt={VEHICLE_LABELS[key]}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: ".6rem .8rem", textAlign: "center", fontWeight: 600 }}>
              {VEHICLE_LABELS[key]}
              {!available && <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 12, color: "#6b7280" }}>(Pronto)</span>}
              {selected && <span style={{ marginLeft: 8, fontSize: 12, color: "#2563eb" }}>✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  // Cargar Google Maps JS + Places
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"],
  });

  // Estado UI
  const [vehiculo, setVehiculo] = useState<VehicleKey>("camioneta");
  const [fecha, setFecha] = useState<Date | null>(null);

  // Places (texto + coords)
  const [origenText, setOrigenText] = useState<string>("");
  const [destinoText, setDestinoText] = useState<string>("");

  const [origenLL, setOrigenLL] = useState<LatLng | null>(null);
  const [destinoLL, setDestinoLL] = useState<LatLng | null>(null);

  // GMaps helpers
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({});
  const [usingGeoloc, setUsingGeoloc] = useState<boolean>(false);

  const acOrigenRef = useRef<google.maps.places.Autocomplete | null>(null);
  const acDestinoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onLoadOrigen = useCallback((ac: google.maps.places.Autocomplete) => {
    ac.setFields(["place_id", "geometry", "formatted_address", "name"]);
    acOrigenRef.current = ac;
  }, []);

  const onLoadDestino = useCallback((ac: google.maps.places.Autocomplete) => {
    ac.setFields(["place_id", "geometry", "formatted_address", "name"]);
    acDestinoRef.current = ac;
  }, []);

  const maybeRoute = useCallback(
    (recent?: LatLng, which?: "origen" | "destino") => {
      const o = which === "origen" ? recent ?? origenLL : origenLL;
      const d = which === "destino" ? recent ?? destinoLL : destinoLL;
      if (!o || !d) return;

      const service = new google.maps.DirectionsService();
      service.route(
        { origin: o, destination: d, travelMode: google.maps.TravelMode.DRIVING },
        (res, status) => {
          if (status === "OK" && res) {
            setDirections(res);
            const leg = res.routes?.[0]?.legs?.[0];
            setRouteInfo({
              distanceText: leg?.distance?.text,
              durationText: leg?.duration?.text,
            });
          } else {
            console.warn("Directions failed:", status);
            setDirections(null);
            setRouteInfo({});
          }
        }
      );
    },
    [origenLL, destinoLL]
  );

  const pickFromAutocomplete = useCallback(
    (which: "origen" | "destino") => {
      const ac = which === "origen" ? acOrigenRef.current : acDestinoRef.current;
      if (!ac) return;
      const place = ac.getPlace();
      const ll = place?.geometry?.location;
      if (!ll) return;

      const coords = { lat: ll.lat(), lng: ll.lng() };
      const label = place.formatted_address || place.name || (which === "origen" ? "Origen" : "Destino");

      if (which === "origen") {
        setOrigenText(label);
        setOrigenLL(coords);
        setUsingGeoloc(false);
      } else {
        setDestinoText(label);
        setDestinoLL(coords);
      }
      setTimeout(() => maybeRoute(coords, which), 0);
    },
    [maybeRoute]
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigenLL(ll);
        setOrigenText("Mi ubicación");
        setUsingGeoloc(true);
        maybeRoute(ll, "origen");
      },
      () => alert("No pudimos acceder a tu ubicación.")
    );
  };

  const limpiar = () => {
    setOrigenText("");
    setDestinoText("");
    setFecha(null);               // ← Date|null
    setVehiculo("camioneta");     // ← clave válida
    setOrigenLL(null);
    setDestinoLL(null);
    setUsingGeoloc(false);
    setDirections(null);
    setRouteInfo({});
  };

  const buildSearchLink = (ll: LatLng | null) =>
    ll ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ll.lat},${ll.lng}`)}` : "";

  const buildDirectionsLink = (o: LatLng | null, d: LatLng | null) =>
    o && d
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${o.lat},${o.lng}`)}&destination=${encodeURIComponent(`${d.lat},${d.lng}`)}&travelmode=driving`
      : "";

  const reservarWhatsApp = () => {
    if (!origenLL || !destinoLL) {
      alert("Completá ORIGEN y DESTINO antes de enviar.");
      return;
    }
    const origenLink = buildSearchLink(origenLL);
    const destinoLink = buildSearchLink(destinoLL);
    const rutaLink = buildDirectionsLink(origenLL, destinoLL);

    const fechaTxt = fecha
  ? fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
  : null;

    const texto = [
      "Hola, quiero reservar un flete 🚚",
      `* Origen: ${origenText || "—"}`,
      `  📍 ${origenLink}`,
      `* Destino: ${destinoText || "—"}`,
      `  📍 ${destinoLink}`,
      `* Fecha/Hora: ${fechaTxt || "—"}`,   // siempre aparece
      `* Vehículo: ${VEHICLE_LABELS[vehiculo]}`,
      routeInfo.distanceText ? `* Distancia aprox.: ${routeInfo.distanceText}` : null,
      routeInfo.durationText ? `* Duración aprox.: ${routeInfo.durationText}` : null,
      rutaLink ? `* Ruta: Ver en Google Maps\n${rutaLink}` : null,
      "",
      "¿Me confirman disponibilidad y tarifa?",
    ]
      .filter(Boolean)
      .join("\n");


    const base = WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=` : `https://wa.me/?text=`;
    window.open(base + encodeURIComponent(texto), "_blank");
  };

  if (!isLoaded) return <p>Cargando mapa...</p>;

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "1rem" }}>
      <header>
        <h1 style={{ marginBottom: 4 }}>TuFlete</h1>
        <p style={{ marginTop: 0, opacity: 0.8 }}>Pedí tu flete en minutos</p>
      </header>


{/* Origen */}
<div style={{ position: "relative", width: "100%", marginTop: "1rem" }}>
  <span
    style={{
      position: "absolute",
      left: ".8rem",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "1.2rem",
    }}
  >
    📍
  </span>
  <Autocomplete onLoad={onLoadOrigen} onPlaceChanged={() => pickFromAutocomplete("origen")}>
    <input
      value={origenText}
      onChange={(e) => {
        setOrigenText(e.target.value);
        if (usingGeoloc) setUsingGeoloc(false);
      }}
      placeholder="Origen (calle, ciudad…)"
      autoComplete="off"
      style={{
        width: "100%",
        fontSize: "1.05rem",
        padding: ".85rem 2.5rem .85rem 2.5rem", // deja espacio a izquierda y derecha
        borderRadius: "8px",
      }}
    />
  </Autocomplete>
  {!usingGeoloc && (
    <button
      onClick={useMyLocation}
      title="Usar mi ubicación"
      style={{
        position: "absolute",
        right: ".5rem",
        top: "50%",
        transform: "translateY(-50%)",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "1.2rem",
      }}
    >
      📌
    </button>
  )}
</div>

{/* Destino */}
<div style={{ position: "relative", width: "100%", marginTop: ".75rem" }}>
  <span
    style={{
      position: "absolute",
      left: ".8rem",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "1.2rem",
    }}
  >
    🎯
  </span>
  <Autocomplete onLoad={onLoadDestino} onPlaceChanged={() => pickFromAutocomplete("destino")}>
    <input
      value={destinoText}
      onChange={(e) => setDestinoText(e.target.value)}
      placeholder="Destino (calle, ciudad…)"
      autoComplete="off"
      style={{
        width: "100%",
        fontSize: "1.05rem",
        padding: ".85rem 2.5rem .85rem 2.5rem",
        borderRadius: "8px",
      }}
    />
  </Autocomplete>
  <button
    onClick={limpiar}
    title="Limpiar"
    style={{
      position: "absolute",
      right: ".5rem",
      top: "50%",
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "1.2rem",
    }}
  >
    🧹
  </button>
</div>

      {/* Mapa */}
      <div style={{ marginTop: ".9rem" }}>
        <GoogleMap
          mapContainerStyle={{ height: "360px", width: "100%", borderRadius: "12px" }}
          center={destinoLL || MAP_CENTER}
          zoom={13}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >

          {origenLL && <Marker position={origenLL} label="A" title="Origen" />}
          {destinoLL && <Marker position={destinoLL} label="B" title="Destino" />}
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
        </GoogleMap>
      </div>

      {/* Vehículo + Fecha + WhatsApp */}
      <div style={{ marginTop: ".9rem", display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: "50%", minWidth: 280 }}>
          <VehicleGallery value={vehiculo} onChange={setVehiculo} />
        </div>

        <DatePicker
          selected={fecha}
          onChange={(date) => setFecha(date)}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="dd/MM/yyyy HH:mm"
          placeholderText="Selecciona fecha y hora"
          className="button"
        />

        <button onClick={reservarWhatsApp} className="button primary">✉️ Reservar por WhatsApp</button>
      </div>

      {(routeInfo.distanceText || routeInfo.durationText) && (
        <p style={{ marginTop: ".5rem", opacity: 0.85 }}>
          {routeInfo.distanceText ? `Distancia aprox.: ${routeInfo.distanceText} · ` : ""}
          {routeInfo.durationText ? `Duración aprox.: ${routeInfo.durationText}` : ""}
        </p>
      )}
    </main>
  );
}
