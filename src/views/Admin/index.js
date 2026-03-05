import React, { useEffect, useState, useCallback } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import FormularioProducto from '../../Components/FormularioProducto';
import LoginAdmin from './LoginAdmin';
import { pedirPermisoNotificaciones, enviarNotificacion, getNotifPrefs, setNotifPrefs, useDetectarCambios } from '../../services/notificaciones';

function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [tab, setTab] = useState('pedidos');
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);

  // Filtros de pedidos
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [filtroDelivery, setFiltroDelivery] = useState('todos');

  // Notificaciones
  const [mostrarConfigNotif, setMostrarConfigNotif] = useState(false);
  const [notifConfig, setNotifConfig] = useState(() => {
    return getNotifPrefs('admin') || {
      nuevoPedido: true,
      cambioEstado: true,
      deliveryEnTienda: true,
    };
  });

  const guardarNotifConfig = (key, value) => {
    const nueva = { ...notifConfig, [key]: value };
    setNotifConfig(nueva);
    setNotifPrefs('admin', nueva);
  };

  // Persistir sesión al recargar
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists() && userDoc.data().rol === 'admin') {
          setUsuario(user);
          pedirPermisoNotificaciones();
        }
      }
      setCargandoAuth(false);
    });
    return () => unsub();
  }, []);

  // Leer productos de Firebase
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => docs.push({ ...d.data(), id: d.id }));
      setProductos(docs);
    });
    return () => unsub();
  }, [usuario]);

  // Leer pedidos en tiempo real
  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => docs.push({ ...d.data(), id: d.id }));
      setPedidos(docs);
    });
    return () => unsub();
  }, [usuario]);

  // Leer deliveries disponibles
  useEffect(() => {
    if (!usuario) return;
    const q = query(collection(db, "usuarios"), where("rol", "==", "delivery"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((d) => docs.push({ ...d.data(), id: d.id }));
      setDeliveries(docs);
    });
    return () => unsub();
  }, [usuario]);

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  const asignarPedido = async (pedidoId, deliveryUid, deliveryNombre) => {
    await updateDoc(doc(db, "pedidos", pedidoId), {
      asignadoA: deliveryUid,
      asignadoNombre: deliveryNombre,
      estado: 'asignado',
    });
  };

  const aprobarDelivery = async (uid) => {
    await updateDoc(doc(db, "usuarios", uid), { aprobado: true });
  };

  const rechazarDelivery = async (uid) => {
    if (window.confirm("¿Seguro que quieres rechazar/revocar a este repartidor?")) {
      await updateDoc(doc(db, "usuarios", uid), { aprobado: false, disponible: false });
    }
  };

  const limpiarEntregados = async () => {
    const entregados = pedidos.filter(p => p.estado === 'entregado');
    if (entregados.length === 0) {
      alert('No hay pedidos entregados para limpiar.');
      return;
    }
    if (window.confirm(`¿Eliminar ${entregados.length} pedido(s) entregado(s)? Esta acción no se puede deshacer.`)) {
      for (const p of entregados) {
        await deleteDoc(doc(db, "pedidos", p.id));
      }
      alert(`✅ ${entregados.length} pedido(s) eliminado(s).`);
    }
  };

  const cerrarSesion = () => {
    auth.signOut();
    setUsuario(null);
  };

  // Detectar cambios en pedidos para notificar
  const onCambiosPedidos = useCallback(({ nuevos, cambios }) => {
    nuevos.forEach(p => {
      if (notifConfig.nuevoPedido) {
        enviarNotificacion('🍔 Nuevo Pedido!', { body: `${p.cliente} - $${p.total?.toFixed ? p.total.toFixed(2) : p.total}` });
      }
    });
    cambios.forEach(p => {
      if (notifConfig.cambioEstado) {
        const estados = { asignado: '📦 Asignado', en_camino: '🛵 En camino', entregado: '✅ Entregado' };
        enviarNotificacion(`Pedido ${estados[p.estado] || p.estado}`, { body: `${p.cliente}` });
      }
    });
  }, [notifConfig]);

  useDetectarCambios(pedidos, 'id', onCambiosPedidos);

  // Detectar deliveries que se ponen disponibles
  const onCambiosDeliveries = useCallback(({ cambios }) => {
    cambios.forEach(d => {
      if (d.disponible && notifConfig.deliveryEnTienda) {
        enviarNotificacion('🛵 Repartidor disponible', { body: `${d.nombre} está en la tienda` });
      }
    });
  }, [notifConfig]);

  useDetectarCambios(deliveries, 'id', onCambiosDeliveries);

  if (cargandoAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg font-medium">Cargando...</p>
      </div>
    );
  }

  if (!usuario) {
    return <LoginAdmin onLogin={(user) => setUsuario(user)} />;
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'asignado': return 'bg-purple-100 text-purple-800';
      case 'en_camino': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const deliveriesDisponibles = deliveries.filter(d => d.disponible && d.aprobado);
  const deliveriesPendientes = deliveries.filter(d => !d.aprobado);
  const deliveriesAprobados = deliveries.filter(d => d.aprobado);

  return (
    <div className="min-h-screen bg-kfc-gray p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800">Panel Admin 🛠️</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarConfigNotif(!mostrarConfigNotif)}
              className="text-gray-500 hover:text-gray-700 text-xl"
              title="Configurar notificaciones"
            >
              🔔
            </button>
            <button onClick={cerrarSesion} className="text-red-500 font-bold text-sm hover:underline">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Config notificaciones */}
        {mostrarConfigNotif && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
            <h3 className="font-bold text-gray-700">🔔 Notificaciones</h3>
            {[
              { key: 'nuevoPedido', label: '🍔 Nuevo pedido recibido' },
              { key: 'cambioEstado', label: '📦 Cambio de estado de pedido' },
              { key: 'deliveryEnTienda', label: '🛵 Repartidor en la tienda' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-600">{item.label}</span>
                <div
                  onClick={() => guardarNotifConfig(item.key, !notifConfig[item.key])}
                  className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${notifConfig[item.key] ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${notifConfig[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab('pedidos')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${tab === 'pedidos' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500 hover:text-kfc-dark'
              }`}
          >
            📋 Pedidos ({pedidos.length})
          </button>
          <button
            onClick={() => setTab('repartidores')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${tab === 'repartidores' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500 hover:text-kfc-dark'
              }`}
          >
            🛵 Repartidores {deliveriesPendientes.length > 0 && <span className="bg-kfc-red text-white text-xs px-2 py-0.5 rounded-full ml-1">{deliveriesPendientes.length}</span>}
          </button>
          <button
            onClick={() => setTab('productos')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${tab === 'productos' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500 hover:text-kfc-dark'
              }`}
          >
            🍔 Productos ({productos.length})
          </button>
        </div>

        {/* TAB PEDIDOS */}
        {tab === 'pedidos' && (() => {
          // Aplicar filtros
          let pedidosFiltrados = [...pedidos];

          if (filtroEstado !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtroEstado);
          }

          if (filtroDelivery !== 'todos') {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.asignadoA === filtroDelivery);
          }

          if (filtroFecha !== 'todos') {
            const ahora = new Date();
            pedidosFiltrados = pedidosFiltrados.filter(p => {
              if (!p.fecha) return false;
              const fechaPedido = p.fecha.toDate ? p.fecha.toDate() : new Date(p.fecha);
              const diffHoras = (ahora - fechaPedido) / (1000 * 60 * 60);
              if (filtroFecha === 'hoy') return diffHoras <= 24;
              if (filtroFecha === 'semana') return diffHoras <= 168;
              return true;
            });
          }

          return (
            <div className="space-y-4">
              {/* Barra de filtros */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-700">Filtros</h3>
                  <button
                    onClick={limpiarEntregados}
                    className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg font-bold hover:bg-red-100 transition-colors"
                  >
                    🗑️ Limpiar entregados
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Filtro estado */}
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">📋 Todos los estados</option>
                    <option value="pendiente">⏳ Pendientes</option>
                    <option value="asignado">📦 Asignados</option>
                    <option value="en_camino">🛵 En camino</option>
                    <option value="entregado">✅ Entregados</option>
                  </select>

                  {/* Filtro fecha */}
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">📅 Todas las fechas</option>
                    <option value="hoy">📆 Últimas 24h</option>
                    <option value="semana">📅 Última semana</option>
                  </select>

                  {/* Filtro repartidor */}
                  <select
                    value={filtroDelivery}
                    onChange={(e) => setFiltroDelivery(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">🛵 Todos los repartidores</option>
                    {deliveriesAprobados.map((del) => (
                      <option key={del.uid} value={del.uid}>{del.nombre}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400">Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos</p>
              </div>

              {pedidosFiltrados.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-gray-500">No hay pedidos con estos filtros</p>
                </div>
              ) : (
                pedidosFiltrados.map((pedido) => (
                  <div key={pedido.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{pedido.cliente}</h3>
                          <p className="text-sm text-gray-500">📞 {pedido.telefono} | {pedido.metodo === 'delivery' ? '🛵 Delivery' : '🛍️ Pick-up'}</p>
                          {pedido.metodo === 'delivery' && <p className="text-sm text-gray-500 mt-1">📍 {pedido.direccion}</p>}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getEstadoColor(pedido.estado)}`}>
                          {pedido.estado === 'pendiente' ? '⏳ Pendiente' : pedido.estado === 'asignado' ? '📦 Asignado' : pedido.estado === 'en_camino' ? '🛵 En camino' : '✅ Entregado'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        {pedido.items && pedido.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm py-1">
                            <span>{item.nombre}</span>
                            <span className="font-mono font-bold">${item.precio}</span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-bold">
                          <span>Total</span>
                          <span className="text-kfc-red">${pedido.total?.toFixed ? pedido.total.toFixed(2) : pedido.total}</span>
                        </div>
                      </div>

                      {/* Asignación */}
                      {pedido.asignadoNombre ? (
                        <p className="text-sm text-kfc-dark font-medium">🛵 Asignado a: <span className="font-bold">{pedido.asignadoNombre}</span></p>
                      ) : pedido.estado === 'pendiente' && (
                        <div>
                          <p className="text-sm font-bold text-gray-700 mb-2">Asignar a repartidor:</p>
                          {deliveriesDisponibles.length === 0 ? (
                            <p className="text-sm text-red-500">No hay repartidores disponibles</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {deliveriesDisponibles.map((del) => (
                                <button
                                  key={del.id}
                                  onClick={() => asignarPedido(pedido.id, del.uid, del.nombre)}
                                  className="bg-kfc-dark text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-sm"
                                >
                                  🛵 {del.nombre}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })()}
        {/* TAB PRODUCTOS */}
        {tab === 'productos' && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setProductoEditar(null); setMostrarForm(true); }}
                className="bg-kfc-red text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-red-700 transition-all"
              >
                + Nuevo Producto
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-sm font-bold text-gray-600 uppercase">Producto</th>
                    <th className="px-4 py-4 text-sm font-bold text-gray-600 uppercase">Categoría</th>
                    <th className="px-4 py-4 text-sm font-bold text-gray-600 uppercase">Precio</th>
                    <th className="px-4 py-4 text-sm font-bold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {prod.imagen && (
                            <img src={prod.imagen} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="font-bold text-gray-800">{prod.nombre}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{prod.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {prod.categoria || 'Sin categoría'}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-green-600">
                        ${Number(prod.precio).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setProductoEditar(prod); setMostrarForm(true); }}
                            className="text-kfc-dark hover:underline text-sm font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(prod.id)}
                            className="text-red-500 hover:underline text-sm font-semibold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB REPARTIDORES */}
        {tab === 'repartidores' && (
          <div className="space-y-6">
            {/* Solicitudes pendientes */}
            {deliveriesPendientes.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-yellow-700 mb-3">⏳ Solicitudes Pendientes</h3>
                <div className="space-y-3">
                  {deliveriesPendientes.map((del) => (
                    <div key={del.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{del.nombre}</p>
                        <p className="text-sm text-gray-500">{del.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => aprobarDelivery(del.uid)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => rechazarDelivery(del.uid)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600"
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repartidores aprobados */}
            <div>
              <h3 className="font-bold text-lg text-green-700 mb-3">✅ Repartidores Activos ({deliveriesAprobados.length})</h3>
              {deliveriesAprobados.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
                  <p className="text-gray-500">No hay repartidores aprobados aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveriesAprobados.map((del) => (
                    <div key={del.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{del.nombre}</p>
                        <p className="text-sm text-gray-500">{del.email}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${del.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {del.disponible ? '🟢 En la tienda' : '⚪ No disponible'}
                        </span>
                      </div>
                      <button
                        onClick={() => rechazarDelivery(del.uid)}
                        className="text-red-500 text-sm font-bold hover:underline"
                      >
                        Revocar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {mostrarForm && (
        <FormularioProducto
          cerrar={() => { setMostrarForm(false); setProductoEditar(null); }}
          productoEditar={productoEditar}
        />
      )}
    </div>
  );
}

export default Admin;