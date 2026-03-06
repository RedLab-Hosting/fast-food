import React, { useEffect, useState, useCallback } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import LoginDelivery from './LoginDelivery';
import SwipeSlider from '../../Components/SwipeSlider';
import { pedirPermisoNotificaciones, enviarNotificacion, getNotifPrefs, setNotifPrefs, useDetectarCambios } from '../../services/notificaciones';
import { IconBell, IconLogout, IconMotorbike, IconClipboard, IconPackage, IconCheckCircle, IconPhone, IconMapPin, IconClock, IconStore, IconWarning, IconTruck, IconCopy, IconMessageCircle, IconNavigation, IconXCircle } from '../../Components/Icons';
function Delivery() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('asignado'); // Default to incoming/active orders
  const [ajustes, setAjustes] = useState({});
  const [toastNotif, setToastNotif] = useState(null);

  // Notificaciones
  const [mostrarConfigNotif, setMostrarConfigNotif] = useState(false);
  const [notifConfig, setNotifConfig] = useState(() => {
    return getNotifPrefs('delivery') || {
      pedidoAsignado: true,
    };
  });

  const guardarNotifConfig = (key, value) => {
    const nueva = { ...notifConfig, [key]: value };
    setNotifConfig(nueva);
    setNotifPrefs('delivery', nueva);
  };

  // Persistir sesión al recargar
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists() && userDoc.data().rol === 'delivery' && userDoc.data().aprobado) {
          setUsuario(user);
          pedirPermisoNotificaciones();
        }
      }
      setCargandoAuth(false);
    });
    return () => unsub();
  }, []);

  // Cargar perfil del delivery logueado
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(doc(db, "usuarios", usuario.uid), (snap) => {
      if (snap.exists()) setPerfil({ ...snap.data(), id: snap.id });
    });
    return () => unsub();
  }, [usuario]);

  // Cargar configuracion (ajustes)
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(doc(db, "config", "ajustes"), (snap) => {
      if (snap.exists()) setAjustes(snap.data());
    });
    return () => unsub();
  }, [usuario]);

  // Leer pedidos asignados a este delivery
  useEffect(() => {
    if (!usuario) return;
    const q = query(
      collection(db, "pedidos"),
      where("asignadoA", "==", usuario.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => docs.push({ ...d.data(), id: d.id }));
      // Ordenar en el cliente por fecha descendente
      docs.sort((a, b) => {
        const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(0);
        const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(0);
        return fb - fa;
      });
      setPedidos(docs);
    });
    return () => unsub();
  }, [usuario]);

  const toggleEstado = async () => {
    if (!perfil) return;
    const estadoActual = perfil.estadoDelivery || 'no_disponible';
    const nuevoEstado = estadoActual === 'no_disponible' ? 'en_tienda' : 'no_disponible';
    await updateDoc(doc(db, "usuarios", usuario.uid), {
      estadoDelivery: nuevoEstado,
      disponible: nuevoEstado === 'en_tienda',
    });
  };

  const marcarEnTienda = async () => {
    await updateDoc(doc(db, "usuarios", usuario.uid), {
      estadoDelivery: 'en_tienda',
      disponible: true,
    });
  };

  const rechazarPedido = async (id) => {
    if (!ajustes.permitirRechazarPedidos) return;
    await updateDoc(doc(db, "pedidos", id), {
      estado: 'pendiente',
      asignadoA: null,
      asignadoNombre: null
    });
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    const updates = { estado: nuevoEstado };
    if (nuevoEstado === 'en_camino') {
      updates.fechaEnCamino = serverTimestamp();
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        estadoDelivery: 'entregando',
        disponible: false,
      });
      setFiltro('todos'); // Once picked up, default to showing the active order
    }
    if (nuevoEstado === 'entregado') {
      updates.fechaEntregado = serverTimestamp();
      setFiltro('asignado'); // Auto return to incoming orders tab when done
    }
    await updateDoc(doc(db, "pedidos", id), updates);
  };

  // Check if delivery has active orders (asignado or en_camino)
  const tienePedidoActivo = pedidos.some(p => p.estado === 'asignado' || p.estado === 'en_camino');

  const tiempoEntrega = (pedido) => {
    if (!pedido || !pedido.fechaEnCamino) return null;
    try {
      const inicio = pedido.fechaEnCamino.toDate ? pedido.fechaEnCamino.toDate() : new Date(pedido.fechaEnCamino);
      if (isNaN(inicio.getTime())) return null;
      
      const fin = pedido.fechaEntregado
        ? (pedido.fechaEntregado.toDate ? pedido.fechaEntregado.toDate() : new Date(pedido.fechaEntregado))
        : new Date();
      
      if (isNaN(fin.getTime())) return null;
      
      const mins = Math.floor((fin - inicio) / 60000);
      if (mins < 0) return '0 min';
      if (mins < 1) return '< 1 min';
      if (mins < 60) return `${mins} min`;
      return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    } catch (e) {
      console.error("Error calculating time:", e);
      return null;
    }
  };

  const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    alert('Teléfono copiado al portapapeles');
  };

  const cerrarSesion = () => {
    auth.signOut();
    setUsuario(null);
    setPerfil(null);
  };

  // Detectar pedidos nuevos asignados
  const onCambiosPedidos = useCallback(({ nuevos }) => {
    nuevos.forEach(p => {
      if (notifConfig.pedidoAsignado) {
        enviarNotificacion('Nuevo pedido asignado!', { body: `${p.cliente} - $${p.total?.toFixed ? p.total.toFixed(2) : p.total}` });
        setToastNotif(p);
        setTimeout(() => setToastNotif(null), 8000); // Hide after 8 seconds
      }
    });
  }, [notifConfig]);

  useDetectarCambios(pedidos, 'id', onCambiosPedidos);

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg font-medium">Cargando...</p>
      </div>
    );
  }

  if (!usuario) {
    return <LoginDelivery onLogin={(user) => setUsuario(user)} />;
  }

  // Esperar a que el perfil cargue
  if (!perfil) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg font-medium">Cargando perfil...</p>
      </div>
    );
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'asignado': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'en_camino': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'entregado': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Pedidos entrantes (asignados que aún no confirman que están en camino)
  const pedidosEntrantes = pedidos.filter(p => p.estado === 'asignado');

  const pedidosFiltrados = filtro === 'todos' 
    ? pedidos.filter(p => p.estado === 'en_camino') // Mi pedido activo ONLY shows en_camino
    : filterByTab(pedidos, filtro);

  function filterByTab(pedidos, f) {
    if (f === 'asignado') return pedidos.filter(p => p.estado === 'asignado');
    if (f === 'entregado') return pedidos.filter(p => p.estado === 'entregado');
    return pedidos;
  }

  // Stats calculation
  const totalEntregados = pedidos.filter(p => p.estado === 'entregado').length;
  // Calculate average delivery time
  const deliveredOrders = pedidos.filter(p => p.estado === 'entregado' && p.fechaEnCamino && p.fechaEntregado);
  let avgMins = 0;
  if (deliveredOrders.length > 0) {
    const sumMins = deliveredOrders.reduce((sum, p) => {
      try {
        const inicio = p.fechaEnCamino.toDate ? p.fechaEnCamino.toDate() : new Date(p.fechaEnCamino);
        const fin = p.fechaEntregado.toDate ? p.fechaEntregado.toDate() : new Date(p.fechaEntregado);
        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return sum;
        return sum + Math.max(0, Math.floor((fin - inicio) / 60000));
      } catch (e) { return sum; }
    }, 0);
    avgMins = Math.floor(sumMins / deliveredOrders.length);
  }

  return (
    <div className="min-h-screen bg-kfc-gray font-sans">
      {/* Delivery Header */}
      <header className="bg-gradient-delivery text-white px-4 md:px-8 py-5">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2"><IconMotorbike className="w-6 h-6" /> Delivery</h1>
            <p className="text-blue-300 text-xs font-medium mt-0.5">Hola, {perfil.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarConfigNotif(!mostrarConfigNotif)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Configurar notificaciones"
            >
              <IconBell className="w-5 h-5" />
            </button>
            <button
              onClick={cerrarSesion}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-sm font-bold hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
            >
              <IconLogout className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8">

        {/* Config notificaciones */}
        {mostrarConfigNotif && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><IconBell className="w-4 h-4" /> Notificaciones</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-600">Pedido asignado</span>
              <div
                onClick={() => guardarNotifConfig('pedidoAsignado', !notifConfig.pedidoAsignado)}
                className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${notifConfig.pedidoAsignado ? 'bg-green-500' : 'bg-gray-300'
                  }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${notifConfig.pedidoAsignado ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
              </div>
            </label>
          </div>
        )}

        {/* Estado del delivery - 3 estados */}
        {(() => {
          const estado = perfil.estadoDelivery || 'no_disponible';
          const estilos = {
            en_tienda: { bg: 'bg-green-100 border-green-400', text: 'Estoy en la tienda', dot: 'bg-green-500' },
            entregando: { bg: 'bg-yellow-100 border-yellow-400', text: 'Entregando pedido', dot: 'bg-yellow-500' },
            no_disponible: { bg: 'bg-gray-100 border-gray-300', text: 'No disponible', dot: 'bg-gray-400' },
          };
          const estilo = estilos[estado] || estilos.no_disponible;
          return (
            <div className="mb-6 space-y-3">
              <div
                onClick={estado !== 'entregando' ? toggleEstado : undefined}
                className={`p-4 rounded-2xl transition-all border-2 ${estilo.bg} ${estado !== 'entregando' ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{estilo.text}</p>
                    <p className="text-sm text-gray-500">
                      {estado === 'entregando' ? 'Toca "Ya llegué" cuando regreses' : 'Toca para cambiar tu estado'}
                    </p>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${estilo.dot}`}></div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Global Ya Llegué Banner Button */}
        {perfil.estadoDelivery === 'entregando' && !tienePedidoActivo && (
          <div className="mb-6">
            <button
              onClick={marcarEnTienda}
              className="w-full bg-white border-2 border-green-500 py-6 rounded-3xl shadow-[0_8px_0_rgb(22,163,74)] hover:shadow-[0_4px_0_rgb(22,163,74)] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all flex flex-col items-center justify-center group overflow-hidden relative"
            >
              {/* Subtle pattern background */}
              <div className="absolute inset-0 bg-green-50 opacity-40 group-hover:bg-green-100 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-green-500 p-3 rounded-full mb-3 shadow-md group-hover:scale-110 transition-transform">
                  <IconCheckCircle className="w-8 h-8 text-white" />
                </div>
                <span className="text-green-700 font-black text-xl tracking-tighter uppercase">AVISAR QUE LLEGUÉ</span>
                <span className="text-green-600/60 text-xs font-black mt-1 uppercase tracking-[0.2em] animate-pulse">
                  Toca aquí para recibir pedidos
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Modal de Pedidos Entrantes (Nuevos Asignados) - Only show in its tab */}
        {pedidosEntrantes.length > 0 && filtro === 'asignado' && (
          <div className="mb-6 space-y-4">
            {pedidosEntrantes.map(pedido => (
              <div key={pedido.id} className="bg-kfc-dark text-white rounded-2xl p-5 shadow-lg border-2 border-yellow-400 relative overflow-hidden animate-slide-in">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-400 rounded-full opacity-10 animate-ping"></div>
                <h3 className="text-xl font-black flex items-center gap-2 mb-3 text-yellow-400">
                  <IconBell className="w-6 h-6 animate-swing" /> ¡Te han asignado un pedido!
                </h3>
                
                <div className="space-y-2 mb-5 z-10 relative">
                  <p className="font-bold text-lg">{pedido.cliente}</p>
                  <p className="text-sm text-gray-300 flex items-center gap-1.5"><IconMapPin className="w-4 h-4 text-gray-400" /> {pedido.direccion}</p>
                  <p className="text-sm text-gray-300 flex items-center gap-1.5"><IconPhone className="w-4 h-4 text-gray-400" /> {pedido.telefono}</p>
                  
                  <div className="bg-white/10 rounded-lg p-3 mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-300">Total a cobrar:</span>
                      <span className="text-xl font-black text-green-400">${pedido.total?.toFixed ? pedido.total.toFixed(2) : pedido.total}</span>
                    </div>
                    {pedido.metodoPago && (
                      <p className="text-xs text-blue-300 font-medium">Método: {pedido.metodoPago === 'efectivo' ? 'Efectivo USD' : pedido.metodoPago === 'pago_movil' ? 'Pago Móvil' : 'Zelle'}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 relative z-10">
                  <button
                    onClick={() => cambiarEstado(pedido.id, 'en_camino')}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 active:scale-95 transition-all"
                  >
                    Tomar pedido
                  </button>
                  {ajustes.permitirRechazarPedidos && (
                    <button
                      onClick={() => rechazarPedido(pedido.id)}
                      className="flex-1 bg-red-500/20 text-red-300 py-3 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/30 active:scale-95 transition-all"
                    >
                      Rechazar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: 'asignado', label: 'Pedidos entrantes', Icon: IconPackage, count: pedidos.filter(p => p.estado === 'asignado').length },
            { key: 'todos', label: 'Mi pedido activo', Icon: IconTruck, count: pedidos.filter(p => p.estado === 'en_camino').length },
            { key: 'entregado', label: 'Historial', Icon: IconCheckCircle },
            { key: 'stats', label: 'Mis Stats', Icon: IconClipboard },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all btn-press flex items-center gap-1.5 ${
                filtro === f.key
                  ? 'bg-kfc-dark text-white shadow-sm'
                  : 'bg-white text-gray-600 shadow-card hover:shadow-card-hover'
              }`}
            >
              <f.Icon className="w-4 h-4" /> {f.label}
              {f.count > 0 && <span className="text-xs opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>

        {/* Stats view */}
        {filtro === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <p className="text-4xl font-black text-green-600 mb-1">{totalEntregados}</p>
                <p className="text-sm text-gray-500 font-medium">Pedidos entregados</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <p className="text-4xl font-black text-blue-600 mb-1">{avgMins > 0 ? `${avgMins}m` : '--'}</p>
                <p className="text-sm text-gray-500 font-medium">Tiempo prom. entrega</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><IconStore className="w-5 h-5 text-gray-400" /> Mi estado</h3>
              <p className="text-sm text-gray-600 mb-2">Para seguir recibiendo pedidos, asegúrate de mantener tu estado en <span className="font-bold text-green-600">En la tienda</span> cuando estés disponible.</p>
              <div className="p-3 bg-gray-50 rounded-xl mt-3 flex items-center justify-between">
                <span className="font-medium">Estado actual</span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  perfil.estadoDelivery === 'en_tienda' ? 'bg-green-100 text-green-700' :
                  perfil.estadoDelivery === 'entregando' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {perfil.estadoDelivery === 'en_tienda' ? 'EN LA TIENDA' :
                   perfil.estadoDelivery === 'entregando' ? 'ENTREGANDO' : 'NO DISPONIBLE'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lista de pedidos */}
        {filtro !== 'stats' && (
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <p className="text-4xl mb-3"><IconClipboard className="w-10 h-10 mx-auto text-gray-300" /></p>
              <p className="text-gray-500 font-medium">
                {pedidos.length === 0 ? 'Aún no te han asignado pedidos' : 'No hay pedidos en esta categoría'}
              </p>
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => {
              if (filtro === 'asignado' && pedido.estado === 'asignado') return null; // Modal takes care of assigned new orders.

              return (
              <div key={pedido.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Cabecera del pedido (Uber style block for active order) */}
                <div className={`p-5 border-b border-gray-100 ${pedido.estado === 'en_camino' ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-xl text-gray-800 tracking-tight">{pedido.cliente}</h3>
                      <p className="text-sm font-bold text-gray-500 mt-0.5 tracking-wider uppercase">Orden #{pedido.id.slice(-5)}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getEstadoColor(pedido.estado)} ${pedido.estado === 'en_camino' ? 'bg-green-100/50' : ''}`}>
                      {pedido.estado === 'en_camino' ? 'En camino' : 'Entregado'}
                    </span>
                  </div>

                  {/* Acciones de Contacto: Uber Style (Phone only text, actionable buttons) */}
                  <div className="flex flex-col gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <IconPhone className="w-5 h-5" />
                        </div>
                        <p className="text-lg font-bold tracking-tight text-gray-700">{pedido.telefono}</p>
                      </div>

                      {pedido.estado === 'en_camino' && filtro === 'todos' && (
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <a
                            href={`tel:${pedido.telefono}`}
                            className="bg-green-500 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 hover:bg-green-600 active:scale-95 transition-all w-full"
                          >
                            <IconPhone className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Llamar</span>
                          </a>
                          <a
                            href={`https://wa.me/${pedido.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 hover:bg-green-700 active:scale-95 transition-all w-full"
                          >
                            <IconMessageCircle className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
                          </a>
                          <button
                            onClick={() => copiarTexto(pedido.telefono)}
                            className="bg-gray-100 text-gray-700 rounded-xl py-2.5 flex flex-col items-center justify-center gap-1 hover:bg-gray-200 active:scale-95 transition-all w-full border border-gray-200"
                          >
                            <IconCopy className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Copiar</span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>

                {/* Productos */}
                <div className="px-5 py-3 bg-gray-50">
                  {pedido.items && pedido.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-gray-700">{item.nombre} {item.cantidad > 1 ? `x${item.cantidad}` : ''}</span>
                      <span className="font-mono font-bold text-gray-600">${(item.precio * (item.cantidad || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-kfc-red text-lg">${pedido.total?.toFixed ? pedido.total.toFixed(2) : pedido.total}</span>
                  </div>
                </div>

                {/* Info de pago */}
                {pedido.metodoPago && (
                  <div className="px-5 py-2 border-t border-gray-100 bg-blue-50">
                    <p className="text-sm font-medium text-blue-800">
                        {pedido.metodoPago === 'pago_movil' ? 'Pago Móvil' : pedido.metodoPago === 'zelle' ? 'Zelle' : 'Efectivo USD'}
                    </p>
                    {pedido.metodoPago === 'efectivo' && pedido.pagaCon > 0 && (
                      <div className="flex gap-4 text-xs mt-1">
                        <span>Paga con: <b>${pedido.pagaCon?.toFixed ? pedido.pagaCon.toFixed(2) : pedido.pagaCon}</b></span>
                        <span>Vuelto: <b className="text-green-700">${pedido.vuelto?.toFixed ? pedido.vuelto.toFixed(2) : pedido.vuelto}</b></span>
                        {pedido.necesitaVuelto && <span className="text-red-600 font-bold flex items-center gap-1"><IconWarning className="w-3.5 h-3.5" /> Llevar vuelto</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Dirección y Mapa (Only show map/actions for Delivery, hide complicated stuff in History log) */}
                {pedido.metodo === 'delivery' && (
                  <div className="p-5 border-t border-gray-100 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                         <IconNavigation className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        {pedido.estado === 'entregado' ? (
                          <p className="text-sm font-medium text-green-600 uppercase tracking-wider mb-1">Entregado en</p>
                        ) : (
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Entregar en</p>
                        )}
                        <p className="text-base font-bold text-gray-800 leading-snug">{pedido.direccion}</p>
                      </div>
                    </div>

                    {pedido.estado === 'en_camino' && filtro === 'todos' && (
                      <div className="mt-4">
                        {pedido.ubicacion ? (
                          <div className="relative">
                            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 h-40 bg-gray-100 relative group">
                              <div className="absolute inset-0 bg-[#e5e7eb] bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=10.48,-66.90&zoom=13&size=600x300&scale=2&maptype=roadmap&key=AIzaSyA...')] bg-cover bg-center brightness-95"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-white/90 p-3 rounded-full shadow-lg animate-bounce">
                                  <IconMapPin className="w-8 h-8 text-kfc-red" />
                                </div>
                              </div>
                            </div>
                            <a 
                              href={pedido.ubicacion} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full mt-3 bg-blue-600 text-white py-3.5 rounded-xl font-black text-center flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                            >
                               <IconNavigation className="w-5 h-5" /> ABRIR EN GOOGLE MAPS
                            </a>
                          </div>
                        ) : (
                          <div className="w-full h-32 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <IconMapPin className="w-8 h-8 opacity-50 mb-2" />
                            <span className="text-sm font-bold opacity-50 uppercase tracking-widest">Ubicación no proporcionada</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Botones de estado */}
                <div className="px-5 py-4 border-t border-gray-100">
                  {pedido.estado === 'asignado' && filtro === 'todos' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'en_camino')}
                      className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      <span className="flex items-center gap-1.5 justify-center"><IconTruck className="w-5 h-5" /> Estoy en camino</span>
                    </button>
                  )}
                  {pedido.estado === 'en_camino' && filtro === 'todos' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100 mt-2">
                      <SwipeSlider onSwipeSuccess={() => cambiarEstado(pedido.id, 'entregado')} text="Desliza cuando entregues el pedido" />
                      {tiempoEntrega(pedido) && (
                        <p className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider">Tiempo del viaje: {tiempoEntrega(pedido)}</p>
                      )}
                    </div>
                  )}
                  {pedido.estado === 'entregado' && (
                  <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                    <p className="text-green-700 font-black flex items-center gap-1.5 justify-center text-lg"><IconCheckCircle className="w-6 h-6" /> Completado</p>
                    {tiempoEntrega(pedido) && (
                      <p className="text-sm text-green-600/80 mt-1 font-bold flex items-center gap-1.5 justify-center">
                        <IconClock className="w-4 h-4" /> Entregado en: {tiempoEntrega(pedido)}
                      </p>
                    )}
                  </div>
                )}
                </div>
              </div>
            );
            })
          )}
        </div>
        )}
      {/* Toast global Notification for new orders */}
      {toastNotif && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white rounded-xl shadow-2xl p-4 pr-12 animate-slide-in max-w-sm w-[90%] border border-green-600">
          <button 
            onClick={() => setToastNotif(null)} 
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <IconXCircle className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-full">
               <IconMotorbike className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg mb-0.5 shadow-sm">¡Nuevo pedido asignado!</p>
              <p className="text-sm text-green-50 font-medium">{toastNotif.cliente}</p>
              <p className="text-sm font-black mt-1 bg-white/20 inline-block px-2 py-0.5 rounded-md">${toastNotif.total?.toFixed ? toastNotif.total.toFixed(2) : toastNotif.total}</p>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default Delivery;
