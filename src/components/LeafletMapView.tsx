import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Compass, Layers, Check, Maximize2, Minimize2, MapPin, Navigation, X } from 'lucide-react';
import type { DrivePoint } from '../types/tesla';

interface LeafletMapViewProps {
  points: DrivePoint[];
  startAddress?: string;
  endAddress?: string;
  heightClass?: string;
  onFetchPoints?: () => void;
  isLoadingPoints?: boolean;
}

type TileSource = 'osm' | 'dark' | 'satellite';

const TILE_CONFIG: Record<TileSource, { name: string; url: string; subdomains?: string; maxZoom: number; attribution: string }> = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
  dark: {
    name: 'Modo Oscuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CARTO',
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri, Maxar, Earthstar',
  },
};

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  points,
  startAddress,
  endAddress,
  heightClass = 'h-72',
  onFetchPoints,
  isLoadingPoints = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [currentLayer, setCurrentLayer] = useState<TileSource>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Inicialización del Mapa
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (points.length === 0) return;

    // Destruir mapa previo para evitar doble renderizado
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    // Inicializar mapa centrado en el primer punto
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([firstPoint.latitude, firstPoint.longitude], 12);

    mapInstanceRef.current = map;

    // Añadir capa de mosaicos inicial (OpenStreetMap libre sin API key)
    const cfg = TILE_CONFIG[currentLayer];
    const tileLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Dibujar polilíneas coloreadas según la potencia (Verde: Regeneración, Cian: Crucero, Rojo: Aceleración)
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      let segmentColor = '#00e5ff'; // Crucero por defecto
      if (p1.power_kw < 0) {
        segmentColor = '#10b981'; // Freno regenerativo (verde)
      } else if (p1.power_kw > 40) {
        segmentColor = '#ef4444'; // Fuerte aceleración (rojo)
      } else if (p1.power_kw > 20) {
        segmentColor = '#f59e0b'; // Potencia media (ámbar)
      }

      const polyline = L.polyline(
        [
          [p1.latitude, p1.longitude],
          [p2.latitude, p2.longitude],
        ],
        {
          color: segmentColor,
          weight: 4,
          opacity: 0.9,
        }
      ).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; color: #111;">
          <strong>Punto del Trayecto</strong><br/>
          Velocidad: <b>${p1.speed_kmh} km/h</b><br/>
          Potencia: <b style="color: ${p1.power_kw < 0 ? '#059669' : '#dc2626'}">${p1.power_kw} kW</b><br/>
          Batería: <b>${p1.battery_level}%</b><br/>
          Altitud: <b>${p1.elevation_m} m</b>
        </div>
      `);
    }

    // Marcador de Inicio (Verde)
    const startIcon = L.divIcon({
      className: 'custom-map-pin-start',
      html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 8px rgba(0,0,0,0.6);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([firstPoint.latitude, firstPoint.longitude], { icon: startIcon })
      .bindPopup(`<b>Inicio:</b> ${startAddress || 'Punto de partida'}`)
      .addTo(map);

    // Marcador de Llegada (Rojo)
    const endIcon = L.divIcon({
      className: 'custom-map-pin-end',
      html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 8px rgba(0,0,0,0.6);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lastPoint.latitude, lastPoint.longitude], { icon: endIcon })
      .bindPopup(`<b>Destino:</b> ${endAddress || 'Llegada'}`)
      .addTo(map);

    // Ajustar zoom para abarcar todo el trayecto
    const latLngs = points.map(p => [p.latitude, p.longitude] as [number, number]);
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // invalidateSize para recalcular dimensiones tras el montaje en el DOM
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    // Observador de redimensionado para garantizar que nunca quede en gris
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  // Recalcular dimensiones al alternar pantalla completa
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        if (points.length > 0) {
          const latLngs = points.map(p => [p.latitude, p.longitude] as [number, number]);
          const bounds = L.latLngBounds(latLngs);
          mapInstanceRef.current?.fitBounds(bounds, { padding: [30, 30] });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen]);

  // Cambiar capa de mapa dinámicamente
  const handleLayerChange = (layer: TileSource) => {
    setCurrentLayer(layer);
    setShowLayerMenu(false);
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_CONFIG[layer];
    const newLayer = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  };

  // Abrir en Apple Maps oficial (con ruta completa de origen a destino)
  const openAppleMaps = () => {
    if (points.length === 0) return;
    const start = points[0];
    const dest = points[points.length - 1];

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasBothPoints = points.length > 1;

    // URL nativa de Apple Maps
    const schemeUrl = hasBothPoints
      ? `maps://?saddr=${start.latitude},${start.longitude}&daddr=${dest.latitude},${dest.longitude}&dirflg=d`
      : `maps://?q=${encodeURIComponent(endAddress || 'Destino Tesla')}&ll=${dest.latitude},${dest.longitude}&dirflg=d`;

    const universalUrl = hasBothPoints
      ? `https://maps.apple.com/?saddr=${start.latitude},${start.longitude}&daddr=${dest.latitude},${dest.longitude}&dirflg=d`
      : `https://maps.apple.com/?q=${encodeURIComponent(endAddress || 'Destino Tesla')}&ll=${dest.latitude},${dest.longitude}&dirflg=d`;

    if (isIOS) {
      // En iOS abrimos el esquema nativo de Apple Maps
      window.location.href = schemeUrl;
      setTimeout(() => {
        window.open(universalUrl, '_system');
      }, 350);
    } else {
      window.open(universalUrl, '_blank');
    }
  };

  // Abrir en Google Maps (con coordenadas exactas del trayecto)
  const openGoogleMaps = () => {
    if (points.length === 0) return;
    const start = points[0];
    const dest = points[points.length - 1];

    const hasBothPoints = points.length > 1;
    const googleUrl = hasBothPoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${start.latitude},${start.longitude}&destination=${dest.latitude},${dest.longitude}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${dest.latitude},${dest.longitude}`;

    window.open(googleUrl, '_system') || window.open(googleUrl, '_blank');
  };

  // Abrir en OpenStreetMap web
  const openOpenStreetMap = () => {
    if (points.length === 0) return;
    const start = points[0];
    const dest = points[points.length - 1];

    const hasBothPoints = points.length > 1;
    const osmUrl = hasBothPoints
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${start.latitude}%2C${start.longitude}%3B${dest.latitude}%2C${dest.longitude}`
      : `https://www.openstreetmap.org/?mlat=${dest.latitude}&mlon=${dest.longitude}#map=16/${dest.latitude}/${dest.longitude}`;

    window.open(osmUrl, '_system') || window.open(osmUrl, '_blank');
  };

  if (points.length === 0) {
    return (
      <div className={`w-full ${heightClass} rounded-2xl glass-panel flex flex-col items-center justify-center text-gray-400 text-xs border border-white/5 p-4 text-center space-y-2`}>
        <Compass className={`w-8 h-8 text-cyan-400 ${isLoadingPoints ? 'animate-spin' : ''}`} />
        <span className="text-gray-300 font-medium">
          {isLoadingPoints ? 'Descargando puntos GPS de Tessie...' : 'Sin puntos GPS cargados en local'}
        </span>
        {onFetchPoints && !isLoadingPoints && (
          <button
            onClick={onFetchPoints}
            className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Descargar Ruta GPS desde Tessie</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] bg-[#0c1017] flex flex-col p-3 sm:p-5 animate-fadeIn'
          : 'relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#14171d]'
      }
    >
      {/* Cabecera Exclusiva Modo Pantalla Completa */}
      {isFullscreen && (
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2 shrink-0">
          <div className="flex items-center gap-2 max-w-[65%] truncate">
            <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="truncate">
              <span className="text-sm font-bold text-white font-heading truncate block">
                {endAddress || 'Trayecto Tesla'}
              </span>
              <span className="text-xs text-gray-400 truncate block">
                {startAddress ? `${startAddress} → ${endAddress}` : 'Vista ampliada del trayecto'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNavMenu(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 font-semibold text-xs border border-cyan-500/30 flex items-center gap-1.5 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navegar</span>
            </button>

            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition"
              title="Salir de pantalla completa"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenedor del Mapa Leaflet */}
      <div
        ref={mapContainerRef}
        className={isFullscreen ? 'flex-1 w-full rounded-2xl z-10 overflow-hidden' : `w-full ${heightClass} z-10`}
      />

      {/* Selector de Capas de Mapa (Esquina Superior Derecha) */}
      <div className={`absolute ${isFullscreen ? 'top-16' : 'top-2.5'} right-2.5 z-20`}>
        <button
          onClick={() => setShowLayerMenu(prev => !prev)}
          className="bg-black/85 hover:bg-black text-white p-2 rounded-xl border border-white/20 shadow-lg flex items-center gap-1.5 text-xs transition active:scale-95"
          title="Cambiar capa de mapa"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-medium pr-1">{TILE_CONFIG[currentLayer].name}</span>
        </button>

        {showLayerMenu && (
          <div className="absolute right-0 mt-1.5 w-44 bg-[#14171d]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 space-y-1 text-xs">
            <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 border-b border-white/10">
              Mapas Gratuitos
            </div>
            {(['osm', 'dark', 'satellite'] as TileSource[]).map((key) => (
              <button
                key={key}
                onClick={() => handleLayerChange(key)}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition ${
                  currentLayer === key ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>{TILE_CONFIG[key].name}</span>
                {currentLayer === key && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badge Informativo Superior Izquierda (solo en modo no-fullscreen) */}
      {!isFullscreen && (
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OpenStreetMap Libre</span>
          </div>
        </div>
      )}

      {/* Barra Inferior: Leyenda, Pantalla Completa y Navegar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        {/* Leyenda de colores */}
        <div className="bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[10px] text-gray-300 flex items-center gap-2 pointer-events-auto shadow-lg">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Regen</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="hidden sm:inline">Crucero</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="hidden sm:inline">Acel</span>
          </span>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="bg-black/90 hover:bg-black active:scale-95 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-1 shadow-lg transition"
              title="Ver mapa en pantalla completa"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Pantalla completa</span>
            </button>
          )}

          <button
            onClick={() => setShowNavMenu(true)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-cyan-400/30 flex items-center gap-1.5 shadow-lg transition"
            title="Abrir en Apple Maps o Google Maps"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Mapas</span>
          </button>
        </div>
      </div>

      {/* Modal / Selector de Navegación Externa con Coordenadas Exactas */}
      {showNavMenu && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl glass-panel p-5 border border-white/15 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white font-heading">Abrir Ruta en Navegación</h4>
              </div>
              <button
                onClick={() => setShowNavMenu(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Selecciona tu aplicación para visualizar la ruta y destino con las coordenadas exactas de este trayecto:
            </p>

            <div className="space-y-2">
              {/* Apple Maps */}
              <button
                onClick={() => {
                  setShowNavMenu(false);
                  openAppleMaps();
                }}
                className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg">
                    🍏
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Mapas de Apple</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Nativo iOS</span>
                    </div>
                    <div className="text-[11px] text-gray-400">Ruta directa sin apps externas</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>

              {/* Google Maps */}
              <button
                onClick={() => {
                  setShowNavMenu(false);
                  openGoogleMaps();
                }}
                className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg">
                    🗺️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Google Maps</div>
                    <div className="text-[11px] text-gray-400">Direcciones y tráfico en tiempo real</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>

              {/* OpenStreetMap */}
              <button
                onClick={() => {
                  setShowNavMenu(false);
                  openOpenStreetMap();
                }}
                className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-lg">
                    🌐
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">OpenStreetMap</div>
                    <div className="text-[11px] text-gray-400">Visor web cartográfico abierto</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
