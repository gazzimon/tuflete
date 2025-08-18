import { useCallback, useRef, useState, useMemo } from "react";
import {
  useJsApiLoader,
  GoogleMap,
  Autocomplete,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Components
import ThemeToggle from "./components/ThemeToggle";
import LoadingSpinner from "./components/LoadingSpinner";
import ToastContainer from "./components/ToastContainer";

// Hooks
import { useGoogleMaps } from "./hooks/useGoogleMaps";
import { useFormValidation } from "./hooks/useFormValidation";
import { useToast } from "./hooks/useToast";

// Types
import type { LatLng } from "./hooks/useGoogleMaps";

type VehicleKey = "moto" | "camioneta" | "camion";

const MAP_CENTER: LatLng = { lat: -27.3621, lng: -55.9009 }; // Posadas
const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "5493764876249";

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
    <div className="grid grid-cols-3 gap-3 w-full">
      {items.map((key) => {
        const selected = value === key;
        const available = VEHICLE_AVAILABLE[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => available && onChange(key)}
            title={available ? VEHICLE_LABELS[key] : `${VEHICLE_LABELS[key]} (no disponible)`}
            className={`
              group relative overflow-hidden rounded-xl transition-all duration-300 transform
              ${available ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'}
              ${selected 
                ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg shadow-primary-500/25' 
                : 'card hover:shadow-md'
              }
            `}
          >
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img
                src={VEHICLE_IMAGES[key]}
                alt={VEHICLE_LABELS[key]}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              {!available && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-medium text-sm bg-black/70 px-3 py-1 rounded-full">
                    Próximamente
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="font-semibold text-sm">{VEHICLE_LABELS[key]}</span>
                {selected && (
                  <span className="text-primary-500 text-lg">✓</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  // Custom hooks
  const { directions, routeInfo, isCalculating, calculateRoute, clearRoute } = useGoogleMaps();
  const { validateForm, getFieldError, clearErrors } = useFormValidation();
  const { toasts, success, error, warning, removeToast } = useToast();

  // Cargar Google Maps JS + Places con memoización
  const { isLoaded, loadError } = useJsApiLoader({
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

  // Estados de loading
  const [usingGeoloc, setUsingGeoloc] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // Función optimizada para calcular ruta
  const handleRouteCalculation = useCallback(async (
    origin: LatLng, 
    destination: LatLng
  ) => {
    try {
      await calculateRoute(origin, destination);
      success("Ruta calculada correctamente");
    } catch (err) {
      error("Error al calcular la ruta. Intentá de nuevo.");
    }
  }, [calculateRoute, success, error]);

  const pickFromAutocomplete = useCallback(
    (which: "origen" | "destino") => {
      const ac = which === "origen" ? acOrigenRef.current : acDestinoRef.current;
      if (!ac) return;
      
      const place = ac.getPlace();
      const ll = place?.geometry?.location;
      if (!ll) {
        warning("Seleccioná una dirección válida de la lista");
        return;
      }

      const coords = { lat: ll.lat(), lng: ll.lng() };
      const label = place.formatted_address || place.name || (which === "origen" ? "Origen" : "Destino");

      if (which === "origen") {
        setOrigenText(label);
        setOrigenLL(coords);
        setUsingGeoloc(false);
        clearErrors();
        
        // Calcular ruta si ya hay destino
        if (destinoLL) {
          handleRouteCalculation(coords, destinoLL);
        }
      } else {
        setDestinoText(label);
        setDestinoLL(coords);
        clearErrors();
        
        // Calcular ruta si ya hay origen
        if (origenLL) {
          handleRouteCalculation(origenLL, coords);
        }
      }
    },
    [origenLL, destinoLL, clearErrors, handleRouteCalculation, warning]
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      error("Tu navegador no soporta geolocalización.");
      return;
    }

    setUsingGeoloc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigenLL(ll);
        setOrigenText("Mi ubicación");
        success("Ubicación obtenida correctamente");
        
        if (destinoLL) {
          handleRouteCalculation(ll, destinoLL);
        }
      },
      (err) => {
        setUsingGeoloc(false);
        if (err.code === err.PERMISSION_DENIED) {
          error("Permiso de ubicación denegado. Permití el acceso para usar esta función.");
        } else {
          error("No pudimos acceder a tu ubicación. Intentá de nuevo.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [destinoLL, handleRouteCalculation, success, error]);

  const limpiar = useCallback(() => {
    setOrigenText("");
    setDestinoText("");
    setFecha(null);
    setVehiculo("camioneta");
    setOrigenLL(null);
    setDestinoLL(null);
    setUsingGeoloc(false);
    clearRoute();
    clearErrors();
    success("Formulario limpiado");
  }, [clearRoute, clearErrors, success]);

  const buildSearchLink = (ll: LatLng | null) =>
    ll ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ll.lat},${ll.lng}`)}` : "";

  const buildDirectionsLink = (o: LatLng | null, d: LatLng | null) =>
    o && d
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${o.lat},${o.lng}`)}&destination=${encodeURIComponent(`${d.lat},${d.lng}`)}&travelmode=driving`
      : "";

  const reservarWhatsApp = useCallback(async () => {
    setIsSubmitting(true);
    
    const formData = {
      origen: origenText,
      destino: destinoText,
      origenLL,
      destinoLL,
      vehiculo,
      fecha
    };

    if (!validateForm(formData)) {
      error("Por favor completá todos los campos requeridos");
      setIsSubmitting(false);
      return;
    }

    try {
      const origenLink = buildSearchLink(origenLL);
      const destinoLink = buildSearchLink(destinoLL);
      const rutaLink = buildDirectionsLink(origenLL, destinoLL);

      const fechaTxt = fecha
        ? fecha.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
        : null;

      const texto = [
        "🚚 Hola, quiero reservar un flete",
        "",
        `📍 *Origen:* ${origenText}`,
        `   ${origenLink}`,
        "",
        `🎯 *Destino:* ${destinoText}`,
        `   ${destinoLink}`,
        "",
        fechaTxt ? `📅 *Fecha/Hora:* ${fechaTxt}` : null,
        `🚛 *Vehículo:* ${VEHICLE_LABELS[vehiculo]}`,
        routeInfo.distanceText ? `📏 *Distancia:* ${routeInfo.distanceText}` : null,
        routeInfo.durationText ? `⏱️ *Duración:* ${routeInfo.durationText}` : null,
        "",
        rutaLink ? `🗺️ *Ver ruta completa:* ${rutaLink}` : null,
        "",
        "¿Me confirman disponibilidad y tarifa? 😊",
      ]
        .filter(Boolean)
        .join("\n");

      const base = WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=` : `https://wa.me/?text=`;
      window.open(base + encodeURIComponent(texto), "_blank");
      
      success("Mensaje enviado a WhatsApp");
    } catch (err) {
      error("Error al generar el mensaje. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    origenText, destinoText, origenLL, destinoLL, vehiculo, fecha,
    validateForm, routeInfo, success, error
  ]);

  // Mostrar errores de carga
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-600">Error al cargar Google Maps</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando Google Maps..." />
      </div>
    );
  }

  return (
    <>
      <ThemeToggle />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-700">
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
          {/* Header */}
          <header className="text-center space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
              TuFlete
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              Pedí tu flete en minutos ⚡
            </p>
          </header>

          {/* Form Card */}
          <div className="card p-6 space-y-6 animate-slide-up">
            {/* Origen */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                📍 Origen
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl z-10">
                  📍
                </span>
                <Autocomplete 
                  onLoad={onLoadOrigen} 
                  onPlaceChanged={() => pickFromAutocomplete("origen")}
                >
                  <input
                    value={origenText}
                    onChange={(e) => {
                      setOrigenText(e.target.value);
                      if (usingGeoloc) setUsingGeoloc(false);
                    }}
                    placeholder="Ingresá tu dirección de origen..."
                    autoComplete="off"
                    className={`input-field pl-12 pr-12 ${getFieldError('origen') ? 'border-red-500' : ''}`}
                  />
                </Autocomplete>
                {!usingGeoloc && (
                  <button
                    onClick={useMyLocation}
                    title="Usar mi ubicación"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-xl">📌</span>
                  </button>
                )}
              </div>
              {getFieldError('origen') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('origen')}</p>
              )}
            </div>

            {/* Destino */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                🎯 Destino
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl z-10">
                  🎯
                </span>
                <Autocomplete 
                  onLoad={onLoadDestino} 
                  onPlaceChanged={() => pickFromAutocomplete("destino")}
                >
                  <input
                    value={destinoText}
                    onChange={(e) => setDestinoText(e.target.value)}
                    placeholder="¿A dónde querés que llevemos tu carga?"
                    autoComplete="off"
                    className={`input-field pl-12 pr-12 ${getFieldError('destino') ? 'border-red-500' : ''}`}
                  />
                </Autocomplete>
                <button
                  onClick={limpiar}
                  title="Limpiar formulario"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-xl">🧹</span>
                </button>
              </div>
              {getFieldError('destino') && (
                <p className="text-sm text-red-600 mt-1">{getFieldError('destino')}</p>
              )}
            </div>

            {/* Mapa */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                🗺️ Ruta {isCalculating && <span className="text-primary-500">(Calculando...)</span>}
              </label>
              <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
                <GoogleMap
                  mapContainerStyle={{ height: "400px", width: "100%" }}
                  center={destinoLL || origenLL || MAP_CENTER}
                  zoom={destinoLL && origenLL ? 12 : 13}
                  options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    styles: [
                      {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                      }
                    ]
                  }}
                >
                  {origenLL && (
                    <Marker 
                      position={origenLL} 
                      label={{ text: "A", color: "white", fontWeight: "bold" }}
                      title="Origen" 
                      icon={{
                        url: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2316a34a'><path d='M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z'/></svg>",
                        scaledSize: new google.maps.Size(40, 40)
                      }}
                    />
                  )}
                  {destinoLL && (
                    <Marker 
                      position={destinoLL} 
                      label={{ text: "B", color: "white", fontWeight: "bold" }}
                      title="Destino"
                      icon={{
                        url: "data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'><path d='M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z'/></svg>",
                        scaledSize: new google.maps.Size(40, 40)
                      }}
                    />
                  )}
                  {directions && (
                    <DirectionsRenderer 
                      directions={directions} 
                      options={{ 
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: "#3b82f6",
                          strokeWeight: 5,
                          strokeOpacity: 0.8
                        }
                      }} 
                    />
                  )}
                </GoogleMap>
              </div>
            </div>

            {/* Información de la ruta */}
            {(routeInfo.distanceText || routeInfo.durationText) && (
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-4 space-y-2 border border-primary-100 dark:border-primary-800/30">
                <h3 className="font-semibold text-primary-800 dark:text-primary-200 flex items-center gap-2">
                  <span>📊</span> Información del viaje
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {routeInfo.distanceText && (
                    <div className="flex items-center gap-2">
                      <span className="text-primary-600 dark:text-primary-400">📏</span>
                      <span className="font-medium">Distancia:</span>
                      <span>{routeInfo.distanceText}</span>
                    </div>
                  )}
                  {routeInfo.durationText && (
                    <div className="flex items-center gap-2">
                      <span className="text-primary-600 dark:text-primary-400">⏱️</span>
                      <span className="font-medium">Duración:</span>
                      <span>{routeInfo.durationText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opciones de flete */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehículo */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  🚚 Tipo de vehículo
                </label>
                <VehicleGallery value={vehiculo} onChange={setVehiculo} />
              </div>

              {/* Fecha y hora */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  📅 Fecha y hora (opcional)
                </label>
                <DatePicker
                  selected={fecha}
                  onChange={(date) => setFecha(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd/MM/yyyy HH:mm"
                  placeholderText="¿Cuándo necesitás el flete?"
                  className="w-full"
                  minDate={new Date()}
                  timeCaption="Hora"
                />
                {getFieldError('fecha') && (
                  <p className="text-sm text-red-600">{getFieldError('fecha')}</p>
                )}
              </div>
            </div>

            {/* Botón de WhatsApp */}
            <div className="pt-4">
              <button 
                onClick={reservarWhatsApp} 
                disabled={!origenLL || !destinoLL || isSubmitting}
                className="btn btn-primary w-full text-lg py-4 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">💬</span>
                      Reservar por WhatsApp
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              {(!origenLL || !destinoLL) && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 text-center">
                  ⚠️ Completá origen y destino para continuar
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
