import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { fetchTasaBCV, formatBs } from '../services/tasaBCV';

// Firestore document: config/tasa
const TASA_DOC = doc(db, 'config', 'tasa');

export function useTasa() {
  const [tasa, setTasa] = useState(0);
  const [modo, setModo] = useState('bcv'); // 'bcv' or 'manual'
  const [tasaManual, setTasaManual] = useState(0);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Listen to Firestore config
  useEffect(() => {
    const unsub = onSnapshot(TASA_DOC, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setModo(data.modo || 'bcv');
        setTasaManual(Number(data.tasaManual) || 0);
        setTasa(Number(data.tasaActual) || 0);
        setUltimaActualizacion(data.ultimaActualizacion || null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch BCV rate
  const actualizarBCV = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const rate = await fetchTasaBCV();
      await setDoc(TASA_DOC, {
        modo: 'bcv',
        tasaActual: rate,
        tasaManual: tasaManual,
        ultimaActualizacion: new Date().toISOString(),
      }, { merge: true });
      setTasa(rate);
    } catch (err) {
      setError('No se pudo obtener la tasa del BCV');
      console.error('BCV fetch error:', err);
    }
    setCargando(false);
  }, [tasaManual]);

  // Save manual rate
  const guardarTasaManual = useCallback(async (valor) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) return;
    await setDoc(TASA_DOC, {
      modo: 'manual',
      tasaActual: num,
      tasaManual: num,
      ultimaActualizacion: new Date().toISOString(),
    }, { merge: true });
    setTasa(num);
    setTasaManual(num);
  }, []);

  // Switch mode
  const cambiarModo = useCallback(async (nuevoModo) => {
    if (nuevoModo === 'bcv') {
      await actualizarBCV();
    } else {
      await setDoc(TASA_DOC, { modo: 'manual' }, { merge: true });
    }
    setModo(nuevoModo);
  }, [actualizarBCV]);

  // Format helper
  const aBs = useCallback((usd) => formatBs(usd, tasa), [tasa]);

  return {
    tasa,
    modo,
    tasaManual,
    ultimaActualizacion,
    cargando,
    error,
    actualizarBCV,
    guardarTasaManual,
    cambiarModo,
    aBs,
  };
}
