import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, Trash2, Navigation, Map as MapIcon, GripVertical, Info, Search, Crosshair } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Reorder } from "motion/react";

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Point {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

// Component to handle map view changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CreateGame() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.2297, 21.0122]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [zoom, setZoom] = useState(13);

  const addPoint = useCallback(() => {
    const lastPoint = points[points.length - 1];
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Punkt ${points.length + 1}`,
      description: "",
      latitude: lastPoint ? lastPoint.latitude + 0.0005 : mapCenter[0],
      longitude: lastPoint ? lastPoint.longitude + 0.0005 : mapCenter[1],
    };
    setPoints([...points, newPoint]);
    setSelectedPointIndex(points.length);
    setMapCenter([newPoint.latitude, newPoint.longitude]);
  }, [points, mapCenter]);

  const removePoint = (index: number) => {
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    if (selectedPointIndex === index) {
      setSelectedPointIndex(null);
    } else if (selectedPointIndex !== null && selectedPointIndex > index) {
      setSelectedPointIndex(selectedPointIndex - 1);
    }
  };

  const updatePoint = (index: number, field: keyof Point, value: string | number) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  const handleMarkerDrag = (index: number, e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const { lat, lng } = marker.getLatLng();
    // Use functional update to avoid stale closures and ensure precision
    setPoints(prev => {
      const next = [...prev];
      next[index] = { ...next[index], latitude: lat, longitude: lng };
      return next;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);
        setMapCenter([newLat, newLon]);
        setZoom(16); // Zoom in on search
        setSearchResult({ lat: newLat, lon: newLon, name: display_name });
      } else {
        alert("Nie znaleziono podanego adresu.");
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Błąd podczas wyszukiwania adresu.");
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const addPointAtSearchResult = () => {
    if (!searchResult) return;
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: searchQuery.split(',')[0] || `Punkt ${points.length + 1}`,
      description: searchResult.name,
      latitude: searchResult.lat,
      longitude: searchResult.lon,
    };
    setPoints([...points, newPoint]);
    setSelectedPointIndex(points.length);
    setSearchResult(null);
    setSearchQuery("");
  };

  const centerOnPoint = (index: number) => {
    const point = points[index];
    setMapCenter([point.latitude, point.longitude]);
    setSelectedPointIndex(index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points.length === 0) {
      alert("Dodaj przynajmniej jeden punkt do gry!");
      return;
    }

    setIsSubmitting(true);
    try {
      const gameResponse = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          edit_password: editPassword,
          latitude: points[0].latitude,
          longitude: points[0].longitude,
        }),
      });
      const gameData = await gameResponse.json();

      for (let i = 0; i < points.length; i++) {
        await fetch(`/api/games/${gameData.id}/points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...points[i],
            order_index: i,
          }),
        });
      }

      navigate("/catalog");
    } catch (error) {
      console.error("Failed to create game:", error);
      alert("Wystąpił błąd podczas tworzenia gry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPoint = selectedPointIndex !== null ? points[selectedPointIndex] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold text-stone-900">Kreator Podchodów</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Tytuł gry..."
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              required
              type="password"
              placeholder="Hasło do edycji..."
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />
          </div>
          <textarea
            placeholder="Opis gry..."
            className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-400 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2 h-fit"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? "Zapisywanie..." : "Opublikuj grę"}
        </button>
      </div>

      {/* Main Map Section */}
      <div className="relative h-[600px] rounded-3xl overflow-hidden border-4 border-white shadow-2xl z-0">
        {/* Search Bar on Map */}
        <div className="absolute top-4 left-4 right-4 md:left-12 md:right-auto md:w-96 z-[1000] space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Wpisz adres lub miasto..."
                className="w-full pl-10 pr-4 py-3 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl shadow-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors disabled:bg-stone-400"
            >
              {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>

          {searchResult && (
            <div className="bg-white/95 backdrop-blur p-4 rounded-2xl shadow-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
              <div className="text-xs font-bold text-emerald-600 mb-1">Wynik wyszukiwania:</div>
              <div className="text-sm text-stone-700 mb-3 line-clamp-2">{searchResult.name}</div>
              <div className="flex gap-2">
                <button
                  onClick={addPointAtSearchResult}
                  className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Dodaj punkt tutaj
                </button>
                <button
                  onClick={() => setSearchResult(null)}
                  className="px-3 py-2 text-stone-400 hover:text-stone-600 text-xs font-medium"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Add Point Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            type="button"
            onClick={addPoint}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-emerald-700 hover:scale-105 transition-all font-bold ring-4 ring-white"
          >
            <Plus className="w-6 h-6" />
            Dodaj punkt trasy
          </button>
        </div>

        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <ChangeView center={mapCenter} zoom={zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {points.map((point, index) => (
            <Marker 
              key={point.id} 
              position={[point.latitude, point.longitude]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => handleMarkerDrag(index, e),
                click: () => setSelectedPointIndex(index)
              }}
            >
              <Popup>
                <div className="font-bold">{point.name || `Punkt ${index + 1}`}</div>
              </Popup>
            </Marker>
          ))}
          <MapEvents onMapClick={(lat, lng) => {
            // Optional: Click map to add point?
          }} />
        </MapContainer>
        
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-stone-200 text-xs text-stone-600 max-w-[220px] space-y-2">
          <div className="flex items-center gap-2 font-bold text-stone-900">
            <Info className="w-4 h-4 text-emerald-600" />
            Wskazówki
          </div>
          <ul className="space-y-1 list-disc pl-3">
            <li>Przeciągaj znaczniki, aby zmienić pozycję.</li>
            <li>Kliknij znacznik, aby edytować szczegóły.</li>
            <li>Użyj wyszukiwarki, aby znaleźć miejsce.</li>
          </ul>
        </div>
      </div>

      {/* Selected Point Editor */}
      {selectedPoint && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm">
                {selectedPointIndex! + 1}
              </div>
              Edytuj: {selectedPoint.name}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setMapCenter([selectedPoint.latitude, selectedPoint.longitude])}
                className="flex items-center gap-1 text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Crosshair className="w-3 h-3" />
                Centruj mapę
              </button>
              <button 
                onClick={() => setSelectedPointIndex(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                Zamknij
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nazwa punktu</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={selectedPoint.name}
                  onChange={(e) => updatePoint(selectedPointIndex!, "name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Opis / Wskazówka</label>
                <textarea
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                  value={selectedPoint.description}
                  onChange={(e) => updatePoint(selectedPointIndex!, "description", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Szerokość (Lat)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                    value={selectedPoint.latitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updatePoint(selectedPointIndex!, "latitude", val);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Długość (Lng)</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                    value={selectedPoint.longitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updatePoint(selectedPointIndex!, "longitude", val);
                    }}
                  />
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Możesz wpisać współrzędne ręcznie lub przesuwać znacznik na mapie. Mapa zaktualizuje się automatycznie po zmianie wartości.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorderable Points List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Lista punktów (przeciągnij, aby zmienić kolejność)</h2>
        <Reorder.Group axis="y" values={points} onReorder={setPoints} className="space-y-3">
          {points.map((point, index) => (
            <Reorder.Item 
              key={point.id} 
              value={point}
              className={`bg-white p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                selectedPointIndex === index ? "border-emerald-500 ring-2 ring-emerald-100" : "border-stone-200 hover:border-stone-300"
              }`}
              onClick={() => centerOnPoint(index)}
            >
              <div className="text-stone-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-8 h-8 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold text-stone-900">{point.name || "Bez nazwy"}</div>
                <div className="text-xs text-stone-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePoint(index);
                }}
                className="text-stone-300 hover:text-red-500 p-2 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    </div>
  );
}
