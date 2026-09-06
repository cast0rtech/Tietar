import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Compass, Layers, Check } from 'lucide-react';
import type { DrivePoint } from '../types/tesla';

interface LeafletMapViewProps {
  points: DrivePoint[];
  startAddress?: string;
  endAddress?: string;
  heightClass?: string;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [currentLayer, setCurrentLayer] = useState<TileSource>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

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

  // Abrir coordenadas en app de mapas o navegador universal
  const openInExternalMaps = () => {
    if (points.length === 0) return;
    const dest = points[points.length - 1];
    
    // Si estamos en un móvil con soporte de protocolo geo:
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`geo:${dest.latitude},${dest.longitude}?q=${dest.latitude},${dest.longitude}(Destino+Tesla)`, '_system');
    } else {
      // En PC / navegador: abrir OpenStreetMap gratuito directamente
      window.open(`https://www.openstreetmap.org/?mlat=${dest.latitude}&mlon=${dest.longitude}#map=15/${dest.latitude}/${dest.longitude}`, '_blank');
    }
  };

  if (points.length === 0) {
    return (
      <div className={`w-full ${heightClass} rounded-2xl glass-panel flex flex-col items-center justify-center text-gray-400 text-xs border border-white/5`}>
        <Compass className="w-8 h-8 text-gray-500 mb-2 animate-spin" />
        <span>Sin puntos GPS registrados en este trayecto</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#14171d]">
      {/* Contenedor del Mapa Leaflet */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-10`} />

      {/* Selector de Capas de Mapa (Esquina Superior Derecha) */}
      <div className="absolute top-2.5 right-2.5 z-20">
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

      {/* Badge Informativo Superior Izquierda */}
      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>OpenStreetMap Libre (Sin API Key)</span>
        </div>
      </div>

      {/* Barra Inferior: Leyenda y Botón App de Mapas */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        {/* Leyenda de colores */}
        <div className="bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-[10px] text-gray-300 flex items-center gap-2.5 pointer-events-auto shadow-lg">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Regeneración
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Crucero
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Aceleración
          </span>
        </div>

        {/* Botón Abrir en App de Mapas */}
        <button
          onClick={openInExternalMaps}
          className="bg-black/90 hover:bg-black active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 shadow-lg pointer-events-auto transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          <span>Abrir mapa</span>
        </button>
      </div>
    </div>
  );
};
