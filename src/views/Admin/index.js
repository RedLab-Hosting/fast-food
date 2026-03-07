import React, { useEffect, useState, useCallback } from 'react';
import { db, auth } from '../../services/firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import FormularioProducto from '../../Components/FormularioProducto';
import LoginAdmin from './LoginAdmin';
import { pedirPermisoNotificaciones, enviarNotificacion, getNotifPrefs, setNotifPrefs, useDetectarCambios } from '../../services/notificaciones';
import { useTasa } from '../../hooks/useTasa';
import { IconBell, IconLogout, IconClipboard, IconMotorbike, IconBurger, IconChart, IconDollar, IconPhone, IconMapPin, IconClock, IconStar, IconStarEmpty, IconCheckCircle, IconXCircle, IconRefresh, IconPlus, IconWarning, IconTruck, IconCopy, IconMessageCircle, IconClose } from '../../Components/Icons';

function Admin() {
  const { tasa, modo: modoTasa, ultimaActualizacion, cargando: cargandoTasa, error: errorTasa, actualizarBCV, guardarTasaManual, cambiarModo, formatearBs, formatearUSD } = useTasa();
  const [tasaManualInput, setTasaManualInput] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [tab, setTab] = useState('pedidos');
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [ajustes, setAjustes] = useState({ permitirRechazarPedidos: false, categorias: [] });
  const [pedidoACancelar, setPedidoACancelar] = useState(null); // ID of the order being cancelled
  const [deliveryAsignar, setDeliveryAsignar] = useState(null);
  const [costoDeliveryAux, setCostoDeliveryAux] = useState('');
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState('');

  const categoriasDinamicas = ajustes?.categorias && ajustes.categorias.length > 0 ? ajustes.categorias : [
    { value: 'hamburguesas', label: 'Hamburguesas', icon: '🍔' },
    { value: 'pizzas', label: 'Pizzas', icon: '🍕' },
    { value: 'pollo', label: 'Pollo', icon: '🍗' },
    { value: 'perros', label: 'Hot Dogs', icon: '🌭' },
    { value: 'bebidas', label: 'Bebidas', icon: '🥤' }
  ];

  const agregarCategoria = async () => {
    if (!nuevaCategoriaInput.trim()) return;
    const nuevaList = [...categoriasDinamicas, { 
      value: nuevaCategoriaInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_'), 
      label: nuevaCategoriaInput, 
      icon: '🏷️' 
    }];
    await updateDoc(doc(db, "config", "ajustes"), { categorias: nuevaList });
    setNuevaCategoriaInput('');
  };

  const eliminarCategoria = async (val) => {
    if(window.confirm("¿Seguro que deseas eliminar esta categoría?")) {
      const nuevaList = categoriasDinamicas.filter(c => c.value !== val);
      await updateDoc(doc(db, "config", "ajustes"), { categorias: nuevaList });
    }
  };

  const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    alert('Teléfono copiado al portapapeles');
  };

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

  // Leer ajustes generales
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(doc(db, "config", "ajustes"), (snap) => {
      if (snap.exists()) setAjustes(snap.data());
    });
    return () => unsub();
  }, [usuario]);

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  const toggleRechazarPedidos = async () => {
    await updateDoc(doc(db, "config", "ajustes"), {
      permitirRechazarPedidos: !ajustes.permitirRechazarPedidos
    });
  };

  const asignarPedido = (pedidoId, deliveryUid, deliveryNombre) => {
    setDeliveryAsignar({ pedidoId, deliveryUid, deliveryNombre });
  };

  const confirmarAsignarPedido = async () => {
    if (!deliveryAsignar) return;
    const { pedidoId, deliveryUid, deliveryNombre } = deliveryAsignar;
    const costo = parseFloat(costoDeliveryAux) || 0;
    
    await updateDoc(doc(db, "pedidos", pedidoId), {
      asignadoA: deliveryUid,
      asignadoNombre: deliveryNombre,
      estado: 'asignado',
      costoDelivery: costo,
    });
    setDeliveryAsignar(null);
    setCostoDeliveryAux('');
  };

  const cancelarPedido = async (pedidoId) => {
    await updateDoc(doc(db, "pedidos", pedidoId), { estado: 'cancelado' });
    setPedidoACancelar(null);
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
      alert(`${entregados.length} pedido(s) eliminado(s) exitosamente.`);
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
        const totalSeguro = (Number(p.total) || 0).toFixed(2);
        enviarNotificacion('Nuevo Pedido!', { body: `${p.cliente} - $${totalSeguro}` });
      }
    });
    cambios.forEach(p => {
      if (notifConfig.cambioEstado) {
        const estados = { asignado: 'Asignado', en_camino: 'En camino', entregado: 'Entregado' };
        enviarNotificacion(`Pedido ${estados[p.estado] || p.estado}`, { body: `${p.cliente}` });
      }
    });
  }, [notifConfig]);

  useDetectarCambios(pedidos, 'id', onCambiosPedidos);

  // Detectar deliveries que se ponen disponibles
  const onCambiosDeliveries = useCallback(({ cambios }) => {
    cambios.forEach(d => {
      if (d.estadoDelivery === 'en_tienda' && notifConfig.deliveryEnTienda) {
        enviarNotificacion('Repartidor disponible', { body: `${d.nombre} está en la tienda` });
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
      case 'pendiente': return 'border-l-4 border-l-yellow-400';
      case 'asignado': return 'border-l-4 border-l-purple-500';
      case 'en_camino': return 'border-l-4 border-l-blue-500';
      case 'entregado': return 'border-l-4 border-l-green-500 opacity-60';
      case 'cancelado': return 'border-l-4 border-l-red-500 opacity-60';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'asignado': return 'bg-purple-100 text-purple-800';
      case 'en_camino': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'asignado': return 'Asignado';
      case 'en_camino': return 'En camino';
      case 'entregado': return 'Entregado';
      case 'cancelado': return 'Cancelado';
      default: return estado;
    }
  };

  const tiempoTranscurrido = (fecha) => {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaPedido = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const diffMs = ahora - fechaPedido;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `hace ${horas}h ${mins % 60}m`;
    return `hace ${Math.floor(horas / 24)}d`;
  };

  const getColorTiempo = (fecha) => {
    if (!fecha) return 'text-gray-400';
    const fechaPedido = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const mins = Math.floor((new Date() - fechaPedido) / 60000);
    if (mins < 15) return 'text-green-600';
    if (mins < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Estadísticas
  const ahora = new Date();
  const safeGetDate = (f) => {
    if (!f) return null;
    try {
      const d = f.toDate ? f.toDate() : new Date(f);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const pedidosHoy = pedidos.filter(p => {
    const f = safeGetDate(p.fecha);
    if (!f) return false;
    return (ahora - f) / 3600000 < 24;
  });

  const pedidosSemana = pedidos.filter(p => {
    const f = safeGetDate(p.fecha);
    if (!f) return false;
    return (ahora - f) / 3600000 < 168;
  });

  // Split revenue by payment method: pago_movil -> Bs, zelle/efectivo -> USD
  const calcRevenueSplit = (list) => {
    let usd = 0, bs = 0;
    list.filter(p => p.estado === 'entregado').forEach(p => {
      const t = Number(p.total) || 0;
      if (p.metodoPago === 'pago_movil') {
        // Store as Bs: use saved totalBs if available, otherwise convert with current tasa
        bs += Number(p.totalBs) || (tasa > 0 ? t * tasa : 0);
      } else {
        usd += t;
      }
    });
    return { usd, bs };
  };
  const revHoy = calcRevenueSplit(pedidosHoy);
  const revSemana = calcRevenueSplit(pedidosSemana);
  const ingresosHoy = revHoy.usd;
  const ingresosSemana = revSemana.usd;

  // Delivery rankings
  const deliveryConteo = {};
  pedidosSemana.forEach(p => {
    if (p.asignadoNombre) {
      deliveryConteo[p.asignadoNombre] = (deliveryConteo[p.asignadoNombre] || 0) + 1;
    }
  });
  const deliveryRanking = Object.entries(deliveryConteo).sort((a, b) => b[1] - a[1]);

  const tiempoEntregaAdmin = (pedido) => {
    if (!pedido || !pedido.fechaEnCamino) return null;
    try {
      const inicio = pedido.fechaEnCamino.toDate ? pedido.fechaEnCamino.toDate() : new Date(pedido.fechaEnCamino);
      if (isNaN(inicio.getTime())) return null;
      const fin = pedido.fechaEntregado
        ? (pedido.fechaEntregado.toDate ? pedido.fechaEntregado.toDate() : new Date(pedido.fechaEntregado))
        : ahora;
      if (isNaN(fin.getTime())) return null;
      const mins = Math.max(0, Math.floor((fin - inicio) / 60000));
      if (mins < 1) return '< 1 min';
      if (mins < 60) return `${mins} min`;
      return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    } catch (e) { return null; }
  };

  const deliveriesDisponibles = deliveries.filter(d => d.estadoDelivery === 'en_tienda' && d.aprobado);
  const deliveriesPendientes = deliveries.filter(d => !d.aprobado);
  const deliveriesAprobados = deliveries.filter(d => d.aprobado);

  return (
    <div className="min-h-screen bg-kfc-gray font-sans">
      {/* Admin Header */}
      <header className="bg-gradient-admin text-white px-4 md:px-8 py-5">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Panel Admin</h1>
            <p className="text-gray-400 text-xs font-medium mt-0.5">Gestión de pedidos y productos</p>
          </div>
          <div className="flex items-center gap-3">
            {tasa > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold">
                <IconDollar className="w-3.5 h-3.5" />
                Bs {(Number(tasa) || 0).toFixed(2)}
              </span>
            )}
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

      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {/* Config notificaciones */}
        {mostrarConfigNotif && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><IconBell className="w-4 h-4" /> Notificaciones</h3>
            {[
              { key: 'nuevoPedido', label: 'Nuevo pedido recibido' },
              { key: 'cambioEstado', label: 'Cambio de estado de pedido' },
              { key: 'deliveryEnTienda', label: 'Repartidor en la tienda' },
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
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl mb-6 shadow-card">
          {[
            { key: 'pedidos', Icon: IconClipboard, label: 'Pedidos', count: pedidos.filter(p => p.estado === 'pendiente').length },
            { key: 'repartidores', Icon: IconMotorbike, label: 'Repartid.', badge: deliveriesPendientes.length },
            { key: 'productos', Icon: IconBurger, label: 'Productos' },
            { key: 'tasa', Icon: IconDollar, label: 'Configuración' },
            { key: 'estadisticas', Icon: IconChart, label: 'Stats' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-1 rounded-xl font-bold transition-all btn-press flex flex-col items-center justify-center gap-0.5 ${
                tab === t.key
                  ? 'bg-kfc-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-kfc-dark hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <t.Icon className="w-5 h-5" />
                {t.badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-kfc-red text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">{t.badge}</span>}
              </div>
              <span className="text-[10px] font-bold leading-none mt-0.5">{t.label}</span>
              {t.count > 0 && <span className="text-[9px] opacity-60">({t.count})</span>}
            </button>
          ))}
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

          // Agrupar los pedidos
          const grupos = [
            { titulo: 'Pendientes', clave: 'pendiente', pedidos: pedidosFiltrados.filter(p => p.estado === 'pendiente') },
            { titulo: 'Asignados', clave: 'asignado', pedidos: pedidosFiltrados.filter(p => p.estado === 'asignado') },
            { titulo: 'En camino', clave: 'en_camino', pedidos: pedidosFiltrados.filter(p => p.estado === 'en_camino') },
            { titulo: 'Entregados', clave: 'entregado', pedidos: pedidosFiltrados.filter(p => p.estado === 'entregado') },
            { titulo: 'Cancelados', clave: 'cancelado', pedidos: pedidosFiltrados.filter(p => p.estado === 'cancelado') }
          ].filter(g => g.pedidos.length > 0);

          return (
            <div className="space-y-4">
              {/* Barra de filtros */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-700">Filtros</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro estado */}
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="asignado">Asignados</option>
                    <option value="en_camino">En camino</option>
                    <option value="entregado">Entregados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>

                  {/* Filtro fecha */}
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">Todas las fechas</option>
                    <option value="hoy">Últimas 24h</option>
                    <option value="semana">Última semana</option>
                  </select>

                  {/* Filtro repartidor */}
                  <select
                    value={filtroDelivery}
                    onChange={(e) => setFiltroDelivery(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm font-medium bg-gray-50"
                  >
                    <option value="todos">Todos los repartidores</option>
                    {deliveriesAprobados.map((del) => (
                      <option key={del.uid} value={del.uid}>{del.nombre}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400">Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos</p>
              </div>

              {pedidosFiltrados.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <p className="text-4xl mb-3"><IconClipboard className="w-10 h-10 mx-auto text-gray-300" /></p>
                  <p className="text-gray-500">No hay pedidos con estos filtros</p>
                </div>
              ) : (
                grupos.map(grupo => (
                  <div key={grupo.clave} className="space-y-3">
                    <h2 className="text-lg font-black text-gray-700 mt-6 pb-2 border-b border-gray-200">
                      {grupo.titulo} <span className="text-sm font-medium text-gray-400">({grupo.pedidos.length})</span>
                    </h2>
                    
                    {grupo.pedidos.map((pedido) => (
                      <div key={pedido.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${getEstadoColor(pedido.estado)} transition-all duration-300 hover:shadow-md`}>
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{pedido.cliente}</h3>
                                {pedido.estado === 'pendiente' && (() => {
                                  if (!pedido.fecha) return null;
                                  const f = pedido.fecha.toDate ? pedido.fecha.toDate() : new Date(pedido.fecha);
                                  const m = Math.floor((new Date() - f) / 60000);
                                  if (m < 5) return <span className="bg-red-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full animate-pulse">¡NUEVO!</span>;
                                  return null;
                                })()}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm font-bold text-gray-700">{pedido.telefono}</p>
                                <div className="flex gap-1.5">
                                  <a href={`tel:${pedido.telefono || ''}`} title="Llamar" className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
                                    <IconPhone className="w-3.5 h-3.5" />
                                  </a>
                                  <a href={`https://wa.me/${(pedido.telefono || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
                                    <IconMessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                  <button onClick={() => copiarTexto(pedido.telefono)} title="Copiar" className="w-7 h-7 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-gray-200">
                                    <IconCopy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{pedido.metodo === 'delivery' ? 'Delivery' : 'Pick-up'}</p>
                              {pedido.metodo === 'delivery' && <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5"><IconMapPin className="w-3.5 h-3.5 text-blue-500" /> {pedido.direccion}</p>}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeColor(pedido.estado)}`}>
                              {getEstadoTexto(pedido.estado)}
                            </span>
                          </div>
                      {pedido.fecha && (
                        <p className={`text-xs font-medium mt-1 ${getColorTiempo(pedido.fecha)}`}>
                          <IconClock className="w-3.5 h-3.5 inline" /> {tiempoTranscurrido(pedido.fecha)}
                          {pedido.estado === 'en_camino' && ' — En camino'}
                        </p>
                      )}

                      {/* Items */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        {pedido.items && pedido.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm py-1">
                            <span>{item.nombre} {item.cantidad > 1 ? `x${item.cantidad}` : ''}</span>
                            <span className="font-mono font-bold">${(Number(item.precio) * (item.cantidad || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-bold">
                          <span>Total</span>
                          <div className="text-right">
                            {pedido.metodoPago === 'pago_movil' ? (
                              <span className="text-yellow-600">
                                Bs {formatearBs(pedido.totalBs || (tasa > 0 ? (Number(pedido.total) || 0) * tasa : 0))}
                              </span>
                            ) : (
                              <span className="text-kfc-red">
                                ${formatearUSD(pedido.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Asignación */}
                      {pedido.estado === 'cancelado' ? (
                        <p className="text-sm text-red-600 font-medium flex items-center gap-1"><IconXCircle className="w-4 h-4" /> Pedido cancelado</p>
                      ) : pedido.asignadoNombre ? (
                        <div>
                          <p className="text-sm text-kfc-dark font-medium flex items-center gap-1"><IconTruck className="w-4 h-4" /> Asignado a: <span className="font-bold">{pedido.asignadoNombre}</span></p>
                          {pedido.estado === 'en_camino' && tiempoEntregaAdmin(pedido) && (
                            <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1"><IconTruck className="w-3.5 h-3.5" /> En camino: {tiempoEntregaAdmin(pedido)}</p>
                          )}
                          {pedido.estado === 'entregado' && tiempoEntregaAdmin(pedido) && (
                            <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1"><IconCheckCircle className="w-3.5 h-3.5" /> Entregado en: {tiempoEntregaAdmin(pedido)}</p>
                          )}
                          {pedido.calificacion && (
                            <p className="text-xs mt-1 flex items-center gap-0.5">
                              {[1,2,3,4,5].map(n => n <= pedido.calificacion ? <IconStar key={n} className="w-3.5 h-3.5 text-yellow-500" /> : <IconStarEmpty key={n} className="w-3.5 h-3.5 text-gray-300" />)}
                              <span className="ml-1 text-gray-500">({pedido.calificacion}/5)</span>
                            </p>
                          )}
                        </div>
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
                                  <span className="flex items-center gap-1"><IconTruck className="w-3.5 h-3.5" /> {del.nombre}</span>
                                </button>
                              ))}
                            </div>
                          )}
                            <button
                              onClick={() => setPedidoACancelar(pedido.id)}
                              className="mt-4 text-gray-400 text-sm font-bold hover:text-red-500 transition-colors"
                            >
                              <span className="flex items-center gap-1"><IconXCircle className="w-3.5 h-3.5" /> Cancelar pedido</span>
                            </button>
                            
                            {/* Two-step confirm cancel guard */}
                            {pedidoACancelar === pedido.id && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-slide-in">
                                <p className="text-sm font-bold text-red-700 flex items-center gap-1.5"><IconWarning className="w-4 h-4" /> ¿Seguro que quieres cancelar este pedido?</p>
                                <div className="flex gap-2">
                                  <button onClick={() => cancelarPedido(pedido.id)} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-bold hover:bg-red-600 transition-colors">Sí, cancelar</button>
                                  <button onClick={() => setPedidoACancelar(null)} className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-bold hover:bg-gray-300 transition-colors">No, volver</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                className="bg-kfc-red text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-1.5"
              >
                <IconPlus className="w-4 h-4" /> Nuevo Producto
              </button>
            </div>

            {/* Mobile-friendly card list (replaces overflow table) */}
            <div className="space-y-3">
              {productos.map((prod) => (
                <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                  {prod.imagen && (
                    <img src={prod.imagen} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{prod.nombre}</p>
                    <p className="text-xs text-gray-400 truncate mb-1">{prod.categoria || 'Sin categoría'}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-green-600 text-sm">${formatearUSD(prod.precio)}</span>
                      {tasa > 0 && <span className="text-xs text-gray-400">/ Bs {formatearBs((Number(prod.precio) || 0) * tasa)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => { setProductoEditar(prod); setMostrarForm(true); }}
                      className="text-kfc-dark bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="text-red-500 bg-red-50 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {productos.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                  <p className="text-gray-400">No hay productos aún</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB REPARTIDORES */}
        {tab === 'repartidores' && (
          <div className="space-y-6">
            {/* Solicitudes pendientes */}
            {deliveriesPendientes.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-yellow-700 mb-3 flex items-center gap-2"><IconClock className="w-5 h-5" /> Solicitudes Pendientes</h3>
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
                          <span className="flex items-center gap-1"><IconCheckCircle className="w-4 h-4" /> Aprobar</span>
                        </button>
                        <button
                          onClick={() => rechazarDelivery(del.uid)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600"
                        >
                          <span className="flex items-center gap-1"><IconXCircle className="w-4 h-4" /> Rechazar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repartidores aprobados */}
            <div>
              <h3 className="font-bold text-lg text-green-700 mb-3 flex items-center gap-2"><IconCheckCircle className="w-5 h-5" /> Repartidores Activos ({deliveriesAprobados.length})</h3>
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
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          del.estadoDelivery === 'en_tienda' ? 'bg-green-100 text-green-700' :
                          del.estadoDelivery === 'entregando' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                          }`}>
                          {del.estadoDelivery === 'en_tienda' ? 'En la tienda' :
                           del.estadoDelivery === 'entregando' ? 'Entregando' :
                           'No disponible'}
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

        {/* TAB CONFIGURACIONES */}
        {tab === 'tasa' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><IconDollar className="w-5 h-5 text-green-600" /> Tasa de Cambio USD / Bs</h3>

              {/* Current rate display */}
              {tasa > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-5 border border-green-100">
                  <p className="text-sm text-green-700 font-medium">Tasa actual</p>
                  <p className="text-3xl font-black text-green-700">Bs {tasa.toFixed(2)}</p>
                  {ultimaActualizacion && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <IconClock className="w-3 h-3" /> Actualizada: {new Date(ultimaActualizacion).toLocaleString('es-VE')}
                    </p>
                  )}
                </div>
              )}

              {/* Mode selector */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => cambiarModo('bcv')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all btn-press ${modoTasa === 'bcv' ? 'bg-kfc-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  BCV Automática
                </button>
                <button
                  onClick={() => cambiarModo('manual')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all btn-press ${modoTasa === 'manual' ? 'bg-kfc-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Manual
                </button>
              </div>

              {modoTasa === 'bcv' ? (
                <div>
                  <p className="text-sm text-gray-600 mb-3">La tasa se obtiene directamente del Banco Central de Venezuela (bcv.org.ve)</p>
                  <button
                    onClick={actualizarBCV}
                    disabled={cargandoTasa}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-300 transition-all btn-press flex items-center justify-center gap-2"
                  >
                    <IconRefresh className={`w-4 h-4 ${cargandoTasa ? 'animate-spin' : ''}`} />
                    {cargandoTasa ? 'Consultando BCV...' : 'Actualizar desde BCV'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Ingresa la tasa manualmente</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 431.01"
                      value={tasaManualInput}
                      onChange={(e) => setTasaManualInput(e.target.value)}
                      className="flex-1 border border-gray-200 p-3 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-gray-50"
                    />
                    <button
                      onClick={() => { guardarTasaManual(tasaManualInput); setTasaManualInput(''); }}
                      className="bg-green-600 text-white px-6 rounded-xl font-bold hover:bg-green-700 transition-all btn-press"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {errorTasa && <p className="text-red-500 text-sm mt-3 font-medium flex items-center gap-1"><IconWarning className="w-4 h-4" /> {errorTasa}</p>}
            </div>

            {/* Ajustes Generales Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                 <IconWarning className="w-5 h-5 text-orange-500" /> Ajustes Básicos
              </h3>
              <label className="flex items-center justify-between cursor-pointer p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Permitir que repartidores rechacen pedidos</span>
                  <span className="text-xs text-gray-500">Muestra un botón de "Rechazar" cuando se les asigne un nuevo pedido.</span>
                </div>
                <div
                  onClick={toggleRechazarPedidos}
                  className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer shadow-inner flex-shrink-0 ${ajustes?.permitirRechazarPedidos ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${ajustes?.permitirRechazarPedidos ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                </div>
              </label>
            </div>

            {/* Gestor de Categorías */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                 <IconBurger className="w-5 h-5 text-kfc-red" /> Categorías del Menú
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Ej: Ofertas Especiales"
                  value={nuevaCategoriaInput}
                  onChange={(e) => setNuevaCategoriaInput(e.target.value)}
                  className="flex-1 border border-gray-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red bg-gray-50"
                />
                <button
                  onClick={agregarCategoria}
                  className="bg-kfc-dark text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition-all btn-press shrink-0"
                >
                  Agregar
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categoriasDinamicas.map(c => (
                  <div key={c.value} className="bg-gray-100 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 shadow-sm border border-gray-200">
                    <span className="text-sm font-bold text-gray-700">{c.icon} {c.label}</span>
                    <button 
                      onClick={() => eliminarCategoria(c.value)}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                      title="Eliminar categoría"
                    >
                      <IconClose className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB ESTADÍSTICAS */}
        {tab === 'estadisticas' && (
          <div className="space-y-6">
            {/* Resumen: split into USD and Bs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center col-span-2">
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Hoy</p>
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-kfc-red">{pedidosHoy.length}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">Pedidos</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-green-600">${formatearUSD(revHoy.usd)}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">USD</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-yellow-600">Bs{formatearBs(revHoy.bs)}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">Bs</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center col-span-2">
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Última Semana</p>
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-blue-600">{pedidosSemana.length}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">Pedidos</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-purple-600">${formatearUSD(revSemana.usd)}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">USD</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center justify-center">
                    <p className="text-xl md:text-2xl font-black text-orange-500">Bs{formatearBs(revSemana.bs)}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium">Bs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desglose por estado */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><IconChart className="w-5 h-5" /> Pedidos por estado</h3>
              <div className="space-y-3">
                {[
                  { estado: 'pendiente', label: 'Pendientes', color: 'bg-yellow-400' },
                  { estado: 'asignado', label: 'Asignados', color: 'bg-purple-400' },
                  { estado: 'en_camino', label: 'En camino', color: 'bg-blue-400' },
                  { estado: 'entregado', label: 'Entregados', color: 'bg-green-400' },
                  { estado: 'cancelado', label: 'Cancelados', color: 'bg-red-400' },
                ].map(item => {
                  const count = pedidos.filter(p => p.estado === item.estado).length;
                  const pct = pedidos.length > 0 ? (count / pedidos.length * 100) : 0;
                  return (
                    <div key={item.estado} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 shrink-0">{item.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranking de deliveries */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><IconStar className="w-5 h-5 text-yellow-500" /> Repartidores (última semana)</h3>
              {deliveryRanking.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay datos aún</p>
              ) : (
                <div className="space-y-2">
                  {deliveryRanking.map(([nombre, count], i) => (
                    <div key={nombre} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                        <span className="font-bold text-gray-800">{nombre}</span>
                      </div>
                      <span className="bg-kfc-red text-white px-3 py-1 rounded-full text-sm font-bold">{count} pedidos</span>
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
          categorias={categoriasDinamicas}
        />
      )}

      {/* Modal para Ajustar Cobro de Delivery al Asignar */}
      {deliveryAsignar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in p-6">
            <h3 className="font-black text-xl text-gray-800 mb-2">Asignar Repartidor</h3>
            <p className="text-gray-500 text-sm mb-4">
              Vas a asignar este pedido a <strong className="text-kfc-dark">{deliveryAsignar.deliveryNombre}</strong>.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-1">Costo a cobrar por Delivery</label>
              <div className="flex bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-kfc-red/30 focus-within:border-kfc-red transition-all">
                <span className="flex items-center px-4 bg-gray-100 text-gray-500 font-bold border-r border-gray-200">
                  <IconDollar className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costoDeliveryAux}
                  onChange={(e) => setCostoDeliveryAux(e.target.value)}
                  placeholder="Ej: 2.00"
                  className="w-full p-3 outline-none text-lg font-bold text-gray-800 bg-transparent"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Monto que se le informará al repartidor que le debe cobrar extra al cliente.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={confirmarAsignarPedido}
                className="flex-1 bg-kfc-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Confirmar Asignación
              </button>
              <button
                onClick={() => setDeliveryAsignar(null)}
                className="bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;