import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { IconClipboard, IconPackage, IconMotorbike, IconCheckCircle, IconXCircle, IconWarning, IconClock, IconStar, IconStarEmpty } from '../../Components/Icons';

function SeguimientoPedido({ pedidoId, volver }) {
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [calificacion, setCalificacion] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [yaCalificado, setYaCalificado] = useState(false);

  useEffect(() => {
    if (!pedidoId) return;
    const unsub = onSnapshot(doc(db, "pedidos", pedidoId), (snap) => {
      if (snap.exists()) {
        const data = { ...snap.data(), id: snap.id };
        setPedido(data);
        if (data.calificacion) {
          setCalificacion(data.calificacion);
          setYaCalificado(true);
        }
      }
      setCargando(false);
    });
    return () => unsub();
  }, [pedidoId]);

  const pasos = [
    { key: 'pendiente', label: 'Pedido recibido', Icon: IconClipboard, desc: 'El restaurante recibió tu pedido' },
    { key: 'asignado', label: 'Repartidor asignado', Icon: IconPackage, desc: 'Un repartidor fue asignado' },
    { key: 'en_camino', label: 'En camino', Icon: IconMotorbike, desc: 'Tu pedido está en camino' },
    { key: 'entregado', label: 'Entregado', Icon: IconCheckCircle, desc: '¡Disfruta tu comida!' },
  ];

  const getIndicePaso = () => {
    if (!pedido) return -1;
    if (pedido.estado === 'cancelado') return -2;
    return pasos.findIndex(p => p.key === pedido.estado);
  };

  const calificarPedido = async (stars) => {
    setCalificacion(stars);
    setYaCalificado(true);
    await updateDoc(doc(db, "pedidos", pedidoId), { calificacion: stars });
  };

  const tiempoEntrega = () => {
    if (!pedido?.fechaEnCamino) return null;
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
      console.error('Error calculating delivery time:', e);
      return null;
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-kfc-gray flex items-center justify-center">
        <p className="text-gray-500 text-lg font-medium">Cargando pedido...</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-kfc-gray flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
          <p className="text-4xl mb-3"><IconWarning className="w-10 h-10 mx-auto text-gray-400" /></p>
          <p className="text-gray-600 font-medium mb-4">No se encontró el pedido</p>
          <button onClick={volver} className="bg-kfc-red text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  const indicePaso = getIndicePaso();

  return (
    <div className="min-h-screen bg-kfc-gray p-4 md:p-6 font-sans">
      <div className="max-w-lg mx-auto">
        <button onClick={volver} className="text-kfc-red font-bold mb-4 hover:underline">← Volver al menú</button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-kfc-red text-white p-5 text-center">
            <p className="text-4xl mb-2 flex justify-center">
              {pedido.estado === 'cancelado' ? <IconXCircle className="w-10 h-10" /> : pedido.estado === 'entregado' ? <IconCheckCircle className="w-10 h-10" /> : <IconPackage className="w-10 h-10" />}
            </p>
            <h2 className="text-xl font-extrabold">
              {pedido.estado === 'cancelado' ? 'Pedido Cancelado' : pedido.estado === 'entregado' ? '¡Pedido Entregado!' : 'Seguimiento de Pedido'}
            </h2>
          </div>

          {/* Barra de progreso */}
          {pedido.estado !== 'cancelado' && (
            <div className="p-6">
              <div className="space-y-0">
                {pasos.map((paso, i) => {
                  const isCompleted = i <= indicePaso;
                  const isActive = i === indicePaso;
                  return (
                    <div key={paso.key} className="flex items-start gap-4">
                      {/* Indicador */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                        } ${isActive ? 'ring-4 ring-green-200 scale-110' : ''}`}>
                          {isCompleted ? <paso.Icon className="w-5 h-5" /> : (i + 1)}
                        </div>
                        {i < pasos.length - 1 && (
                          <div className={`w-0.5 h-10 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                        )}
                      </div>
                      {/* Texto */}
                      <div className="pt-2 pb-4">
                        <p className={`font-bold ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>{paso.label}</p>
                        {isActive && <p className="text-sm text-green-600 font-medium">{paso.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info del pedido */}
          <div className="px-6 pb-6 space-y-3">
            {pedido.asignadoNombre && pedido.estado !== 'cancelado' && (
              <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-2">
                <IconMotorbike className="w-5 h-5 text-blue-800" />
                <p className="text-sm font-medium text-blue-800">Repartidor: <span className="font-bold">{pedido.asignadoNombre}</span></p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-bold text-sm text-gray-700 mb-2">Tu pedido:</p>
              {pedido.items && pedido.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{item.nombre} {item.cantidad > 1 ? `x${item.cantidad}` : ''}</span>
                  <span className="font-mono font-bold">${(Number(item.precio) * (item.cantidad || 1)).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-bold">
                <span>Total</span>
                <span className="text-kfc-red text-lg">${(Number(pedido.total) || 0).toFixed(2)}</span>
              </div>
            </div>

            {pedido.estado === 'entregado' && (
              <div className="space-y-4">
                {tiempoEntrega() && (
                  <div className="bg-green-50 p-3 rounded-xl text-center">
                    <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-1"><IconClock className="w-4 h-4" /> Tiempo de entrega: <span className="font-bold">{tiempoEntrega()}</span></p>
                  </div>
                )}

                {/* Star Rating */}
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {yaCalificado ? '¡Gracias por tu calificación!' : '¿Cómo fue tu experiencia?'}
                  </p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => !yaCalificado && calificarPedido(star)}
                        onMouseEnter={() => !yaCalificado && setHoverStar(star)}
                        onMouseLeave={() => !yaCalificado && setHoverStar(0)}
                        className={`transition-transform ${!yaCalificado ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
                      >
                        {star <= (hoverStar || calificacion) ? <IconStar className="w-8 h-8 text-yellow-500" /> : <IconStarEmpty className="w-8 h-8 text-gray-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.removeItem('pedido-activo-id');
                    volver();
                  }}
                  className="w-full bg-kfc-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Hacer otro pedido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeguimientoPedido;
