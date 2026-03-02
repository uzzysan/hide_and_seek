import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Navigation, CheckCircle, Trophy, Info, Camera, X, Compass as CompassIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Point {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order_index: number;
}

interface Game {
  id: number;
  title: string;
  points: Point[];
}

export default function PlayGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [bearingToTarget, setBearingToTarget] = useState<number>(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isARMode, setIsARMode] = useState(false);
  const [hasOrientationPermission, setHasOrientationPermission] = useState<boolean | null>(null);
  
  const watchId = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${id}`);
        const data = await response.json();
        setGame(data);
      } catch (error) {
        console.error("Failed to fetch game:", error);
      }
    };
    fetchGame();

    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      stopCamera();
    };
  }, [id]);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Use webkitCompassHeading for iOS, or alpha for Android (though alpha is not absolute north)
      let heading = (event as any).webkitCompassHeading || (360 - (event.alpha || 0));
      if (heading !== undefined) {
        setDeviceHeading(heading);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        setHasOrientationPermission(permission === "granted");
      } catch (e) {
        console.error("Permission request failed", e);
      }
    } else {
      setHasOrientationPermission(true);
    }
  };

  useEffect(() => {
    if (game && userLocation && !isGameFinished) {
      const target = game.points[currentPointIndex];
      const dist = calculateDistance(userLocation.lat, userLocation.lng, target.latitude, target.longitude);
      const bearing = calculateBearing(userLocation.lat, userLocation.lng, target.latitude, target.longitude);
      
      setDistanceToTarget(dist);
      setBearingToTarget(bearing);

      // If within 10 meters (0.01 km)
      if (dist < 0.01) {
        if (currentPointIndex < game.points.length - 1) {
          setCurrentPointIndex(currentPointIndex + 1);
          alert(`Znalazłeś punkt: ${target.name}! Teraz szukaj kolejnego.`);
        } else {
          setIsGameFinished(true);
        }
      }
    }
  }, [userLocation, game, currentPointIndex, isGameFinished]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsARMode(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Nie udało się uruchomić aparatu.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsARMode(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = deg2rad(lat1);
    const φ2 = deg2rad(lat2);
    const Δλ = deg2rad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (rad2deg(θ) + 360) % 360;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const rad2deg = (rad: number) => rad * (180 / Math.PI);

  if (!game) return <div className="text-center py-12">Ładowanie gry...</div>;

  if (isGameFinished) {
    return (
      <div className="max-w-md mx-auto text-center space-y-8 py-12">
        <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-stone-900">Gratulacje!</h1>
          <p className="text-stone-600 text-lg">Ukończyłeś grę: <span className="font-bold">{game.title}</span></p>
        </div>
        <button
          onClick={() => navigate("/catalog")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
        >
          Wróć do katalogu
        </button>
      </div>
    );
  }

  const currentPoint = game.points[currentPointIndex];
  // Arrow rotation relative to device heading
  const arrowRotation = deviceHeading !== null ? (bearingToTarget - deviceHeading) : bearingToTarget;

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden">
      {/* AR View Background */}
      <AnimatePresence>
        {isARMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 bg-black"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover opacity-70"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section: Compass & Distance */}
      <div className="relative z-10 p-6 flex flex-col items-center space-y-4 pt-12">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 flex flex-col items-center w-full max-w-xs">
          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            {/* Compass Ring */}
            <div className="absolute inset-0 border-4 border-stone-100 rounded-full" />
            
            {/* Direction Arrow */}
            <motion.div 
              animate={{ rotate: arrowRotation }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="relative z-10 text-emerald-600"
            >
              <Navigation className="w-16 h-16 fill-current" />
            </motion.div>

            {/* North Indicator (if heading available) */}
            {deviceHeading !== null && (
              <motion.div 
                animate={{ rotate: -deviceHeading }}
                className="absolute inset-0 flex flex-col items-center pt-1"
              >
                <span className="text-[10px] font-black text-red-500">N</span>
              </motion.div>
            )}
          </div>

          <div className="text-center">
            <div className="text-4xl font-black text-stone-900">
              {distanceToTarget !== null ? (
                distanceToTarget < 1 ? `${(distanceToTarget * 1000).toFixed(0)} m` : `${distanceToTarget.toFixed(2)} km`
              ) : "---"}
            </div>
            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
              Dystans do celu
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isARMode ? (
            <button 
              onClick={startCamera}
              className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/20 text-stone-700 hover:text-emerald-600 transition-colors"
            >
              <Camera className="w-6 h-6" />
            </button>
          ) : (
            <button 
              onClick={stopCamera}
              className="bg-red-500 p-3 rounded-full shadow-lg text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
          
          {hasOrientationPermission === null && (
            <button 
              onClick={requestOrientationPermission}
              className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/20 text-stone-700 hover:text-emerald-600 transition-colors"
            >
              <CompassIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Section: Info & Progress */}
      <div className="mt-auto relative z-10 p-6 pb-12 space-y-4">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-black text-sm">
                {currentPointIndex + 1}
              </div>
              <h3 className="font-bold text-stone-900">{currentPoint.name}</h3>
            </div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              Punkt {currentPointIndex + 1} / {game.points.length}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-stone-50/50 rounded-2xl border border-stone-100">
            <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-stone-600 text-sm italic leading-relaxed">
              {currentPoint.description || "Brak dodatkowych wskazówek dla tego punktu."}
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 px-2">
          {game.points.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                index < currentPointIndex ? "bg-emerald-500" : 
                index === currentPointIndex ? "bg-emerald-300 animate-pulse" : "bg-stone-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
