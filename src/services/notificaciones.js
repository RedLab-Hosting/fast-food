import { useEffect, useRef } from 'react';

// Sonido de notificación real (chime de dos tonos)
const crearSonido = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    const tocarNota = (freq, inicio, duracion, volumen = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      // Nota principal (tono limpio)
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(volumen, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);

      // Armónico sutil para darle cuerpo
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain2.gain.linearRampToValueAtTime(volumen * 0.15, ctx.currentTime + inicio + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion * 0.7);
      osc2.start(ctx.currentTime + inicio);
      osc2.stop(ctx.currentTime + inicio + duracion);
    };

    // Chime: Do-Mi-Sol (acorde mayor ascendente)
    tocarNota(523.25, 0, 0.3, 0.2);     // Do5
    tocarNota(659.25, 0.15, 0.3, 0.2);  // Mi5
    tocarNota(783.99, 0.30, 0.5, 0.25); // Sol5 (más largo)
    
  } catch (e) {
    // Audio no disponible
  }
};

// Pedir permiso de notificaciones
export const pedirPermisoNotificaciones = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permiso = await Notification.requestPermission();
  return permiso === 'granted';
};

// Enviar notificación del navegador (compatible con móviles)
export const enviarNotificacion = async (titulo, opciones = {}) => {
  crearSonido();
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notifOpts = {
    icon: '/logo192.png',
    badge: '/logo192.png',
    ...opciones,
  };

  // Intentar con new Notification (funciona en desktop)
  try {
    const notif = new Notification(titulo, notifOpts);
    setTimeout(() => {
      try { notif.close(); } catch (e) {}
    }, 5000);
    return notif;
  } catch (e) {
    // Móviles requieren ServiceWorker — intentar fallback
    try {
      if (navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.ready;
        if (reg) {
          reg.showNotification(titulo, notifOpts);
        }
      }
    } catch (e2) {
      // Notificaciones no soportadas en este dispositivo o error en service worker, ignorar silenciosamente
    }
  }
};

// Leer preferencias de notificación del localStorage
export const getNotifPrefs = (panel) => {
  try {
    const saved = localStorage.getItem(`notif_${panel}`);
    const parsed = saved ? JSON.parse(saved) : null;
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch {
    return null;
  }
};

// Guardar preferencias de notificación
export const setNotifPrefs = (panel, prefs) => {
  localStorage.setItem(`notif_${panel}`, JSON.stringify(prefs));
};

// Hook para detectar cambios en una lista y notificar
export const useDetectarCambios = (items, keyField, callback) => {
  const prevRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Buffer de carga inicial para evitar falso-spam
  useEffect(() => {
    isInitialLoad.current = true;
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 2500); // 2.5 segundos de gracia
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prevRef.current === null) {
      // Primera carga, solo guardar referencia
      prevRef.current = new Map(items.map(i => [i[keyField], i]));
      return;
    }

    const prevMap = prevRef.current;
    const currentMap = new Map(items.map(i => [i[keyField], i]));

    // Detectar items nuevos
    const nuevos = items.filter(i => !prevMap.has(i[keyField]));

    // Detectar cambios de estado
    const cambios = items.filter(i => {
      const prev = prevMap.get(i[keyField]);
      return prev && prev.estado !== i.estado;
    });

    if (!isInitialLoad.current && (nuevos.length > 0 || cambios.length > 0)) {
      callback({ nuevos, cambios });
    }

    prevRef.current = currentMap;
  }, [items, keyField, callback]);
};
