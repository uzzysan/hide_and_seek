import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Navigation, CheckCircle, Trophy, Info, Camera, X, Compass as CompassIcon, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../contexts/AppContext";

interface Point {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  order_index: number;
  attachment_url?: string;
}

interface Game {
  id: number;
  title: string;
  points: Point[];
  time_limit_minutes?: number;
}

export default function PlayGame() {
  const { t, language, token } = useAppContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [bearingToTarget, setBearingToTarget] = useState<number>(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isARMode, setIsARMode] = useState(false);
  const [hasOrientationPermission, setHasOrientationPermission] = useState<boolean | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const watchId = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timer effect
  useEffect(() => {
    if (!game?.time_limit_minutes || !sessionStartedAt || isGameFinished) return;

    const interval = setInterval(() => {
      const start = new Date(sessionStartedAt).getTime();
      const now = new Date().getTime();
      const limitMs = game.time_limit_minutes! * 60 * 1000;
      const elapsed = now - start;
      const remaining = Math.max(0, limitMs - elapsed);
      
      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        setIsGameFinished(true);
        if (sessionId && token) {
          fetch(`/api/sessions/${sessionId}/complete`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
          }).catch(err => console.error("Failed to record timeout", err));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, sessionStartedAt, isGameFinished, sessionId, token]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const initGame = async () => {
      try {
        // Fetch game details
        const gameRes = await fetch(`/api/games/${id}`);
        const gameData = await gameRes.json();
        setGame(gameData);

        // Fetch or create session
        const sessionRes = await fetch(`/api/games/${id}/sessions/current`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const sessionData = await sessionRes.json();

        if (sessionData.session) {
          setSessionId(sessionData.session.id);
          setSessionStartedAt(sessionData.session.started_at);
          // Set current point index based on progress
          if (sessionData.progress && sessionData.progress.length > 0) {
            const nextIndex = sessionData.progress.length;
            if (nextIndex >= gameData.points.length) {
              setIsGameFinished(true);
            } else {
              setCurrentPointIndex(nextIndex);
            }
          }
        } else {
          // Start new session
          const startRes = await fetch(`/api/games/${id}/sessions`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const startData = await startRes.json();
          setSessionId(startData.sessionId);
          setSessionStartedAt(new Date().toISOString());
        }
      } catch (error) {
        console.error("Failed to initialize game:", error);
      }
    };
    initGame();

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
  }, [id, token, navigate]);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
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
    if (game && userLocation && !isGameFinished && sessionId) {
      const target = game.points[currentPointIndex];
      const dist = calculateDistance(userLocation.lat, userLocation.lng, target.latitude, target.longitude);
      const bearing = calculateBearing(userLocation.lat, userLocation.lng, target.latitude, target.longitude);
      
      setDistanceToTarget(dist);
      setBearingToTarget(bearing);

      // If within 10 meters (0.01 km)
      if (dist < 0.01) {
        const recordProgress = async () => {
          try {
            await fetch(`/api/sessions/${sessionId}/progress`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
              },
              body: JSON.stringify({ point_id: target.id })
            });

            if (currentPointIndex < game.points.length - 1) {
              setCurrentPointIndex(currentPointIndex + 1);
              alert(language === 'pl' ? `Znalazłeś punkt: ${target.name}! Teraz szukaj kolejnego.` : `Found point: ${target.name}! Now look for the next one.`);
            } else {
              await fetch(`/api/sessions/${sessionId}/complete`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}` }
              });
              setIsGameFinished(true);
            }
          } catch (err) {
            console.error("Failed to record progress", err);
          }
        };
        recordProgress();
      }
    }
  }, [userLocation, game, currentPointIndex, isGameFinished, language, sessionId, token]);

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
      alert(language === 'pl' ? "Nie udało się uruchomić aparatu." : "Failed to start camera.");
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

  if (!game) return <div className="text-center py-12 dark:text-stone-300">{t('play.loading')}</div>;

  if (isGameFinished) {
    const isTimeout = timeRemaining === 0;
    return (
      <div className="max-w-md mx-auto text-center space-y-8 py-12 animate-in fade-in duration-500">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg ${isTimeout ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500'}`}>
          {isTimeout ? <Clock className="w-12 h-12" /> : <Trophy className="w-12 h-12" />}
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white">
            {isTimeout ? t('play.timeout') || 'Czas minął!' : t('play.congrats')}
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-lg">
            {isTimeout ? (t('play.timeout_desc') || 'Niestety, nie udało Ci się ukończyć gry w wyznaczonym czasie.') : t('play.congrats_desc')} <span className="font-bold text-emerald-600 dark:text-emerald-400">{game.title}</span>
          </p>
        </div>
        <button
          onClick={() => navigate("/catalog")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-1"
        >
          {t('play.back_to_catalog')}
        </button>
      </div>
    );
  }

  const currentPoint = game.points[currentPointIndex];
  const arrowRotation = deviceHeading !== null ? (bearingToTarget - deviceHeading) : bearingToTarget;

  return (
    <div className="fixed inset-0 bg-stone-100 dark:bg-stone-900 flex flex-col overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-stone-900 dark:text-white truncate max-w-[200px]">{game.title}</h1>
          <div className="text-sm text-stone-500 dark:text-stone-400">
            {t('play.point')} {currentPointIndex + 1} / {game.points.length}
          </div>
        </div>
        
        {timeRemaining !== null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold text-sm ${
            timeRemaining < 300 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
              : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeRemaining)}
          </div>
        )}
      </div>

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
        <div className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 dark:border-stone-700/50 flex flex-col items-center w-full max-w-xs transition-colors duration-300">
          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <div className="absolute inset-0 border-4 border-stone-100 dark:border-stone-700 rounded-full transition-colors duration-300" />
            
            <motion.div 
              animate={{ rotate: arrowRotation }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="relative z-10 text-emerald-600 dark:text-emerald-500"
            >
              <Navigation className="w-16 h-16 fill-current" />
            </motion.div>

            {deviceHeading !== null && (
              <motion.div 
                animate={{ rotate: -deviceHeading }}
                className="absolute inset-0 flex flex-col items-center pt-1"
              >
                <span className="text-[10px] font-black text-red-500 dark:text-red-400">N</span>
              </motion.div>
            )}
          </div>

          <div className="text-center">
            <div className="text-4xl font-black text-stone-900 dark:text-white transition-colors duration-300">
              {distanceToTarget !== null ? (
                distanceToTarget < 0.01 ? "!!!" : (distanceToTarget < 1 ? `${(distanceToTarget * 1000).toFixed(0)} m` : `${distanceToTarget.toFixed(2)} km`)
              ) : "---"}
            </div>
            <div className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1 transition-colors duration-300">
              {t('play.distance')}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isARMode ? (
            <button 
              onClick={startCamera}
              className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/20 dark:border-stone-700/50 text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title={t('play.ar_view')}
            >
              <Camera className="w-6 h-6" />
            </button>
          ) : (
            <button 
              onClick={stopCamera}
              className="bg-red-500 p-3 rounded-full shadow-lg text-white transition-colors hover:bg-red-600"
              title={t('play.map_view')}
            >
              <X className="w-6 h-6" />
            </button>
          )}
          
          {hasOrientationPermission === null && (
            <button 
              onClick={requestOrientationPermission}
              className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/20 dark:border-stone-700/50 text-stone-700 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title="Request Compass Permission"
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
          className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 dark:border-stone-700/50 transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center justify-center font-black text-sm transition-colors duration-300">
                {currentPointIndex + 1}
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white transition-colors duration-300">{currentPoint.name}</h3>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-start gap-3 p-4 bg-stone-50/50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-700/50 transition-colors duration-300">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-stone-600 dark:text-stone-300 text-sm italic leading-relaxed transition-colors duration-300">
                {currentPoint.description || (language === 'pl' ? "Brak dodatkowych wskazówek dla tego punktu." : "No additional clues for this point.")}
              </p>
            </div>
            {currentPoint.attachment_url && (
              <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-700 shadow-sm flex-shrink-0">
                <img 
                  src={currentPoint.attachment_url} 
                  alt={currentPoint.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="flex gap-1.5 px-2">
          {game.points.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                index < currentPointIndex ? "bg-emerald-500 dark:bg-emerald-600" : 
                index === currentPointIndex ? "bg-emerald-300 dark:bg-emerald-400 animate-pulse" : "bg-stone-300 dark:bg-stone-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
