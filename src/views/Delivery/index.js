import React, { useEffect, useState, useCallback } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import LoginDelivery from './LoginDelivery';
import { pedirPermisoNotificaciones, enviarNotificacion, getNotifPrefs, setNotifPrefs, useDetectarCambios } from '../../services/notificaciones';
import { IconBell, IconLogout, IconMotorbike, IconClipboard, IconPackage, IconCheckCircle, IconPhone, IconMapPin, IconClock, IconStore, IconWarning, IconTruck } from '../../Components/Icons';

function Delivery() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('todos');

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

  // Leer pedidos asignados a este delivery (sin orderBy para evitar índice compuesto)
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

  const cambiarEstado = async (id, nuevoEstado) => {
    const updates = { estado: nuevoEstado };
    if (nuevoEstado === 'en_camino') {
      updates.fechaEnCamino = serverTimestamp();
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        estadoDelivery: 'entregando',
        disponible: false,
      });
    }
    if (nuevoEstado === 'entregado') {
      updates.fechaEntregado = serverTimestamp();
    }
    await updateDoc(doc(db, "pedidos", id), updates);
  };

  // Check if delivery has active orders (asignado or en_camino)
  const tienePedidoActivo = pedidos.some(p => p.estado === 'asignado' || p.estado === 'en_camino');

  const tiempoEntrega = (pedido) => {
    if (!pedido.fechaEnCamino) return null;
    const inicio = pedido.fechaEnCamino.toDate ? pedido.fechaEnCamino.toDate() : new Date(pedido.fechaEnCamino);
    const fin = pedido.fechaEntregado
      ? (pedido.fechaEntregado.toDate ? pedido.fechaEntregado.toDate() : new Date(pedido.fechaEntregado))
      : new Date();
    const mins = Math.floor((fin - inicio) / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.estado === filtro);

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
              {estado === 'entregando' && !tienePedidoActivo && (
                <button
                  onClick={marcarEnTienda}
                  className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 active:scale-95 transition-all text-lg"
                >
                  <span className="flex items-center gap-1.5"><IconStore className="w-5 h-5" /> Ya llegué a la tienda</span>
                </button>
              )}
              {estado === 'entregando' && tienePedidoActivo && (
                <p className="text-center text-yellow-600 text-sm font-medium bg-yellow-50 p-3 rounded-xl">
                  <span className="flex items-center gap-1.5"><IconWarning className="w-4 h-4" /> Entrega tu pedido activo antes de marcar que llegaste</span>
                </p>
              )}
            </div>
          );
        })()}

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: 'todos', label: 'Todos', Icon: IconClipboard, count: pedidos.length },
            { key: 'asignado', label: 'Asignados', Icon: IconPackage, count: pedidos.filter(p => p.estado === 'asignado').length },
            { key: 'en_camino', label: 'En camino', Icon: IconTruck, count: pedidos.filter(p => p.estado === 'en_camino').length },
            { key: 'entregado', label: 'Entregados', Icon: IconCheckCircle, count: pedidos.filter(p => p.estado === 'entregado').length },
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


        {/* Lista de pedidos */}
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <p className="text-4xl mb-3"><IconClipboard className="w-10 h-10 mx-auto text-gray-300" /></p>
              <p className="text-gray-500 font-medium">
                {pedidos.length === 0 ? 'Aún no te han asignado pedidos' : 'No hay pedidos en esta categoría'}
              </p>
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{pedido.cliente}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 flex items-center gap-1"><IconPhone className="w-3.5 h-3.5" /> {pedido.telefono}</p>
                        <a
                          href={`tel:${pedido.telefono}`}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600 flex items-center gap-1"
                        >
                          <IconPhone className="w-3 h-3" /> Llamar
                        </a>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getEstadoColor(pedido.estado)}`}>
                      {pedido.estado === 'asignado' ? 'Asignado' : pedido.estado === 'en_camino' ? 'En camino' : 'Entregado'}
                    </span>
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

                {/* Dirección y Mapa */}
                {pedido.metodo === 'delivery' && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1"><IconMapPin className="w-4 h-4" /> {pedido.direccion}</p>
                    {pedido.ubicacion && (
                      <a
                        href={pedido.ubicacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                      >
                        <IconMapPin className="w-4 h-4" /> Abrir en Google Maps
                      </a>
                    )}
                  </div>
                )}

                {/* Botones de estado */}
                <div className="px-5 py-4 border-t border-gray-100">
                  {pedido.estado === 'asignado' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'en_camino')}
                      className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 active:scale-95 transition-all"
                    >
                      <span className="flex items-center gap-1.5 justify-center"><IconTruck className="w-5 h-5" /> Estoy en camino</span>
                    </button>
                  )}
                  {pedido.estado === 'en_camino' && (
                    <div>
                      <button
                        onClick={() => cambiarEstado(pedido.id, 'entregado')}
                        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 active:scale-95 transition-all"
                      >
                        <span className="flex items-center gap-1.5 justify-center"><IconCheckCircle className="w-5 h-5" /> Marcar Entregado</span>
                      </button>
                      {tiempoEntrega(pedido) && (
                        <p className="text-center text-sm text-blue-600 font-medium mt-2 flex items-center gap-1 justify-center"><IconTruck className="w-4 h-4" /> En camino: {tiempoEntrega(pedido)}</p>
                      )}
                    </div>
                  )}
                  {pedido.estado === 'entregado' && (
                  <div className="text-center py-2">
                    <p className="text-green-600 font-bold flex items-center gap-1 justify-center"><IconCheckCircle className="w-5 h-5" /> Pedido completado</p>
                    {tiempoEntrega(pedido) && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 justify-center"><IconClock className="w-4 h-4" /> Tiempo de entrega: <span className="font-bold">{tiempoEntrega(pedido)}</span></p>
                    )}
                  </div>
                )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Delivery;
