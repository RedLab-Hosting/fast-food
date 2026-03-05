import React, { useEffect, useState, useCallback } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import LoginDelivery from './LoginDelivery';
import { pedirPermisoNotificaciones, enviarNotificacion, getNotifPrefs, setNotifPrefs, useDetectarCambios } from '../../services/notificaciones';

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

  const toggleDisponible = async () => {
    if (!perfil) return;
    await updateDoc(doc(db, "usuarios", usuario.uid), {
      disponible: !perfil.disponible,
    });
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
    // Si sale en camino, desactivar disponibilidad para no recibir más pedidos
    if (nuevoEstado === 'en_camino') {
      await updateDoc(doc(db, "usuarios", usuario.uid), { disponible: false });
    }
    // Si entrega, volver a ponerse disponible
    if (nuevoEstado === 'entregado') {
      await updateDoc(doc(db, "usuarios", usuario.uid), { disponible: true });
    }
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
        enviarNotificacion('📦 Nuevo pedido asignado!', { body: `${p.cliente} - $${p.total?.toFixed ? p.total.toFixed(2) : p.total}` });
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
    <div className="min-h-screen bg-kfc-gray p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">🛵 Delivery</h1>
            <p className="text-gray-500 text-sm">Hola, {perfil.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarConfigNotif(!mostrarConfigNotif)}
              className="text-gray-500 hover:text-gray-700 text-xl"
              title="Configurar notificaciones"
            >
              🔔
            </button>
            <button onClick={cerrarSesion} className="text-red-500 font-bold text-sm hover:underline">
              Salir
            </button>
          </div>
        </header>

        {/* Config notificaciones */}
        {mostrarConfigNotif && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
            <h3 className="font-bold text-gray-700">🔔 Notificaciones</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-600">📦 Pedido asignado</span>
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

        {/* Toggle disponibilidad */}
        <div
          onClick={toggleDisponible}
          className={`p-4 rounded-2xl mb-6 cursor-pointer transition-all ${perfil.disponible
              ? 'bg-green-100 border-2 border-green-400'
              : 'bg-gray-100 border-2 border-gray-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">
                {perfil.disponible ? '✅ Estoy en la tienda' : '❌ No disponible'}
              </p>
              <p className="text-sm text-gray-500">Toca para cambiar tu estado</p>
            </div>
            <div className={`w-14 h-8 rounded-full p-1 transition-all ${perfil.disponible ? 'bg-green-500' : 'bg-gray-400'
              }`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${perfil.disponible ? 'translate-x-6' : 'translate-x-0'
                }`}></div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'todos', label: '📋 Todos', count: pedidos.length },
            { key: 'asignado', label: '📦 Asignados', count: pedidos.filter(p => p.estado === 'asignado').length },
            { key: 'en_camino', label: '🛵 En camino', count: pedidos.filter(p => p.estado === 'en_camino').length },
            { key: 'entregado', label: '✅ Entregados', count: pedidos.filter(p => p.estado === 'entregado').length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${filtro === f.key
                  ? 'bg-kfc-red border-kfc-red text-white shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-kfc-red hover:text-kfc-red'
                }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Lista de pedidos */}
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <p className="text-4xl mb-3">📭</p>
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
                        <p className="text-sm text-gray-500">📞 {pedido.telefono}</p>
                        <a
                          href={`tel:${pedido.telefono}`}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600"
                        >
                          📞 Llamar
                        </a>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getEstadoColor(pedido.estado)}`}>
                      {pedido.estado === 'asignado' ? '📦 Asignado' : pedido.estado === 'en_camino' ? '🛵 En camino' : '✅ Entregado'}
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
                      💳 {pedido.metodoPago === 'pago_movil' ? '📱 Pago Móvil' : pedido.metodoPago === 'zelle' ? '💵 Zelle' : '💰 Efectivo USD'}
                    </p>
                    {pedido.metodoPago === 'efectivo' && pedido.pagaCon > 0 && (
                      <div className="flex gap-4 text-xs mt-1">
                        <span>Paga con: <b>${pedido.pagaCon?.toFixed ? pedido.pagaCon.toFixed(2) : pedido.pagaCon}</b></span>
                        <span>Vuelto: <b className="text-green-700">${pedido.vuelto?.toFixed ? pedido.vuelto.toFixed(2) : pedido.vuelto}</b></span>
                        {pedido.necesitaVuelto && <span className="text-red-600 font-bold">⚠️ Llevar vuelto</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Dirección y Mapa */}
                {pedido.metodo === 'delivery' && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">📍 {pedido.direccion}</p>
                    {pedido.ubicacion && (
                      <a
                        href={pedido.ubicacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                      >
                        🗺️ Abrir en Google Maps
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
                      🛵 Estoy en camino
                    </button>
                  )}
                  {pedido.estado === 'en_camino' && (
                    <button
                      onClick={() => cambiarEstado(pedido.id, 'entregado')}
                      className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 active:scale-95 transition-all"
                    >
                      ✅ Marcar Entregado
                    </button>
                  )}
                  {pedido.estado === 'entregado' && (
                    <p className="text-center text-green-600 font-bold py-2">✅ Pedido completado</p>
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
