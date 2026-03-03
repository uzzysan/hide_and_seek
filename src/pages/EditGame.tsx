import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2, Navigation, GripVertical, Info, Search, Crosshair, Image as ImageIcon } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Reorder } from "motion/react";
import { useAppContext } from "../contexts/AppContext";

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Point {
  id: string | number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  attachment?: File | null;
  attachment_url?: string | null;
  isNew?: boolean;
}

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

export default function EditGame() {
  const { id } = useParams<{ id: string }>();
  const { t, theme, user, token } = useAppContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [gameAttachment, setGameAttachment] = useState<File | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [deletedPointIds, setDeletedPointIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.2297, 21.0122]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${id}`);
        if (!response.ok) throw new Error("Failed to fetch game");
        const data = await response.json();
        
        if (data.creator_id !== user?.id) {
          navigate("/catalog");
          return;
        }

        setTitle(data.title);
        setDescription(data.description || "");
        setEditPassword(data.edit_password || "");
        setMapCenter([data.latitude, data.longitude]);
        setExistingAttachmentUrl(data.attachment_url);
        
        const pointsData = data.points.map((p: any) => ({
          ...p,
          isNew: false
        }));
        setPoints(pointsData);
        
      } catch (error) {
        console.error("Error fetching game:", error);
        navigate("/catalog");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [id, token, navigate, user]);

  const addPoint = useCallback(() => {
    const lastPoint = points[points.length - 1];
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${t('create.point_name')} ${points.length + 1}`,
      description: "",
      latitude: lastPoint ? lastPoint.latitude + 0.0005 : mapCenter[0],
      longitude: lastPoint ? lastPoint.longitude + 0.0005 : mapCenter[1],
      attachment: null,
      isNew: true
    };
    setPoints([...points, newPoint]);
    setSelectedPointIndex(points.length);
    setMapCenter([newPoint.latitude, newPoint.longitude]);
  }, [points, mapCenter, t]);

  const removePoint = (index: number) => {
    const pointToRemove = points[index];
    if (!pointToRemove.isNew && typeof pointToRemove.id === 'number') {
      setDeletedPointIds([...deletedPointIds, pointToRemove.id]);
    }
    
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    if (selectedPointIndex === index) {
      setSelectedPointIndex(null);
    } else if (selectedPointIndex !== null && selectedPointIndex > index) {
      setSelectedPointIndex(selectedPointIndex - 1);
    }
  };

  const updatePoint = (index: number, field: keyof Point, value: any) => {
    const newPoints = [...points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setPoints(newPoints);
  };

  const handleMarkerDrag = (index: number, e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const { lat, lng } = marker.getLatLng();
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
        setZoom(16);
        setSearchResult({ lat: newLat, lon: newLon, name: display_name });
      } else {
        alert(t('create.no_address_found'));
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert(t('create.search_error'));
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const addPointAtSearchResult = () => {
    if (!searchResult) return;
    const newPoint: Point = {
      id: Math.random().toString(36).substr(2, 9),
      name: searchQuery.split(',')[0] || `${t('create.point_name')} ${points.length + 1}`,
      description: searchResult.name,
      latitude: searchResult.lat,
      longitude: searchResult.lon,
      attachment: null,
      isNew: true
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
      alert(t('create.add_at_least_one'));
      return;
    }

    setIsSubmitting(true);
    try {
      const gameFormData = new FormData();
      gameFormData.append("title", title);
      gameFormData.append("description", description);
      gameFormData.append("edit_password", editPassword);
      gameFormData.append("latitude", points[0].latitude.toString());
      gameFormData.append("longitude", points[0].longitude.toString());
      if (gameAttachment) {
        gameFormData.append("attachment", gameAttachment);
      }

      const gameResponse = await fetch(`/api/games/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: gameFormData,
      });
      
      if (!gameResponse.ok) throw new Error("Failed to update game");

      // Delete removed points
      for (const pointId of deletedPointIds) {
        await fetch(`/api/points/${pointId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }

      // Update or create points
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const pointFormData = new FormData();
        pointFormData.append("name", point.name);
        pointFormData.append("description", point.description);
        pointFormData.append("latitude", point.latitude.toString());
        pointFormData.append("longitude", point.longitude.toString());
        pointFormData.append("order_index", i.toString());
        if (point.attachment) {
          pointFormData.append("attachment", point.attachment as File);
        }

        if (point.isNew) {
          await fetch(`/api/games/${id}/points`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: pointFormData,
          });
        } else {
          await fetch(`/api/points/${point.id}`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: pointFormData,
          });
        }
      }

      navigate(`/game/${id}`);
    } catch (error) {
      console.error("Failed to update game:", error);
      alert(t('create.create_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-12 bg-stone-200 dark:bg-stone-800 rounded-xl w-1/3"></div>
        <div className="h-64 bg-stone-200 dark:bg-stone-800 rounded-3xl"></div>
      </div>
    );
  }

  const selectedPoint = selectedPointIndex !== null ? points[selectedPointIndex] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white">{t('edit.title') || 'Edytuj grę'}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder={t('create.title_placeholder')}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg dark:text-white transition-colors shadow-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              required
              type="password"
              placeholder={t('create.password_placeholder')}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-colors shadow-sm"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />
          </div>
          <textarea
            placeholder={t('create.desc_placeholder')}
            className="w-full px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] dark:text-white transition-colors shadow-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 cursor-pointer w-fit">
              <ImageIcon className="w-4 h-4" />
              {t('create.game_image')}
            </label>
            {existingAttachmentUrl && !gameAttachment && (
              <div className="mb-2 text-xs text-stone-500">Obecne zdjęcie: {existingAttachmentUrl.split('/').pop()}</div>
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setGameAttachment(e.target.files?.[0] || null)}
              className="text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 dark:hover:file:bg-emerald-900/50 transition-colors"
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-400 dark:disabled:bg-stone-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2 h-fit"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? t('create.saving') : t('create.publish_btn')}
        </button>
      </div>

      {/* Main Map Section */}
      <div className="relative h-[600px] rounded-3xl overflow-hidden border-4 border-white dark:border-stone-800 shadow-2xl z-0">
        {/* Search Bar on Map */}
        <div className="absolute top-4 left-4 right-4 md:left-12 md:right-auto md:w-96 z-[1000] space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                placeholder={t('create.search_placeholder')}
                className="w-full pl-10 pr-4 py-3 bg-white/95 dark:bg-stone-800/95 backdrop-blur border border-stone-200 dark:border-stone-700 rounded-2xl shadow-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors disabled:bg-stone-400 dark:disabled:bg-stone-600"
            >
              {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>

          {searchResult && (
            <div className="bg-white/95 dark:bg-stone-800/95 backdrop-blur p-4 rounded-2xl shadow-xl border border-emerald-100 dark:border-emerald-900/50 animate-in fade-in slide-in-from-top-2">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{t('create.search_result')}</div>
              <div className="text-sm text-stone-700 dark:text-stone-300 mb-3 line-clamp-2">{searchResult.name}</div>
              <div className="flex gap-2">
                <button
                  onClick={addPointAtSearchResult}
                  className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {t('create.add_point_here')}
                </button>
                <button
                  onClick={() => setSearchResult(null)}
                  className="px-3 py-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 text-xs font-medium"
                >
                  {t('create.cancel')}
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
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-emerald-700 hover:scale-105 transition-all font-bold ring-4 ring-white dark:ring-stone-800"
          >
            <Plus className="w-6 h-6" />
            {t('create.add_point_btn')}
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
            url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
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
                <div className="font-bold">{point.name || `${t('create.point_name')} ${index + 1}`}</div>
              </Popup>
            </Marker>
          ))}
          <MapEvents onMapClick={(lat, lng) => {
            // Optional: Click map to add point?
          }} />
        </MapContainer>
        
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-stone-800/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 max-w-[220px] space-y-2">
          <div className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            {t('create.instruction_title')}
          </div>
          <p className="leading-relaxed">
            {t('create.instruction_desc')}
          </p>
        </div>
      </div>

      {/* Selected Point Editor */}
      {selectedPoint && (
        <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center text-sm">
                {selectedPointIndex! + 1}
              </div>
              {t('create.edit_point')} {selectedPoint.name}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setMapCenter([selectedPoint.latitude, selectedPoint.longitude])}
                className="flex items-center gap-1 text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Crosshair className="w-3 h-3" />
                {t('create.center_map')}
              </button>
              <button 
                onClick={() => setSelectedPointIndex(null)}
                className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1"
              >
                {t('create.close')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('create.point_name')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-colors"
                  value={selectedPoint.name}
                  onChange={(e) => updatePoint(selectedPointIndex!, "name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('create.point_desc')}</label>
                <textarea
                  className="w-full px-4 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] dark:text-white transition-colors"
                  value={selectedPoint.description}
                  onChange={(e) => updatePoint(selectedPointIndex!, "description", e.target.value)}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 cursor-pointer w-fit">
                  <ImageIcon className="w-4 h-4" />
                  {t('create.point_image')}
                </label>
                {selectedPoint.attachment_url && !selectedPoint.attachment && (
                  <div className="mb-2 text-xs text-stone-500">Obecne zdjęcie: {selectedPoint.attachment_url.split('/').pop()}</div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => updatePoint(selectedPointIndex!, "attachment", e.target.files?.[0] || null)}
                  className="text-sm text-stone-500 dark:text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 dark:hover:file:bg-emerald-900/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('create.lat')}</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:text-white transition-colors"
                    value={selectedPoint.latitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updatePoint(selectedPointIndex!, "latitude", val);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('create.lng')}</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:text-white transition-colors"
                    value={selectedPoint.longitude}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updatePoint(selectedPointIndex!, "longitude", val);
                    }}
                  />
                </div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
                  {t('create.manual_coords_info')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorderable Points List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-stone-900 dark:text-white">{t('create.points_list_title')}</h2>
        <Reorder.Group axis="y" values={points} onReorder={setPoints} className="space-y-3">
          {points.map((point, index) => (
            <Reorder.Item 
              key={point.id} 
              value={point}
              className={`bg-white dark:bg-stone-800 p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                selectedPointIndex === index ? "border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900/50" : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
              }`}
              onClick={() => centerOnPoint(index)}
            >
              <div className="text-stone-400 dark:text-stone-500 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-8 h-8 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-bold text-stone-900 dark:text-white">{point.name || t('create.unnamed_point')}</div>
                <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </div>
              </div>
              {(point.attachment || point.attachment_url) && (
                <div className="text-emerald-600 dark:text-emerald-500" title="Zawiera załącznik">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePoint(index);
                }}
                className="text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors"
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
