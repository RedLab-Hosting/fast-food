import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { IconMapPin, IconMotorbike, IconShopping, IconCheckCircle, IconPhone, IconDollar, IconWarning, IconCreditCard } from '../../Components/Icons';
import { useTasa } from '../../hooks/useTasa';

// Icono personalizado para el Pin
const iconoPin = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

// Componente para centrar el mapa cuando se obtiene GPS
function CentrarMapa({ posicion }) {
  const map = useMap();
  useEffect(() => {
    if (posicion) map.flyTo(posicion, 16);
  }, [posicion, map]);
  return null;
}

function MapaUbicacion({ alCambiarUbicacion, posicionGPS }) {
  const [posicion, setPosicion] = useState([10.6447, -71.6106]);

  // Cuando llega posición del GPS, mover el pin
  useEffect(() => {
    if (posicionGPS) {
      setPosicion(posicionGPS);
      const linkGoogle = `https://www.google.com/maps?q=${posicionGPS[0]},${posicionGPS[1]}`;
      alCambiarUbicacion(linkGoogle);
    }
  }, [posicionGPS, alCambiarUbicacion]);

  function MarcadorMovible() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosicion([lat, lng]);
        const linkGoogle = `https://www.google.com/maps?q=${lat},${lng}`;
        alCambiarUbicacion(linkGoogle);
      },
    });

    const eventHandlers = useMemo(() => ({
      dragend(e) {
        const marker = e.target;
        const { lat, lng } = marker.getLatLng();
        setPosicion([lat, lng]);
        const linkGoogle = `https://www.google.com/maps?q=${lat},${lng}`;
        alCambiarUbicacion(linkGoogle);
      },
    }), []);

    return (
      <Marker
        position={posicion}
        icon={iconoPin}
        draggable={true}
        eventHandlers={eventHandlers}
      />
    );
  }

  return (
    <div className="mt-4">
      <div className="h-64 w-full rounded-xl overflow-hidden border-2 border-kfc-red shadow-sm">
        <MapContainer center={posicion} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MarcadorMovible />
          <CentrarMapa posicion={posicionGPS} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500 p-2 bg-gray-100 rounded-b-xl italic">
        Toca el mapa o mueve el pin para marcar tu ubicación
      </p>
    </div>
  );
}

function Checkout({ carrito, total, volver, onPedidoCreado }) {
  const { tasa, aBs, formatearBs, formatearUSD } = useTasa();
  const [metodo, setMetodo] = useState('delivery');
  const [datos, setDatos] = useState(() => {
    // Auto-rellenar desde localStorage
    try {
      const saved = localStorage.getItem('cliente_datos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { nombre: parsed.nombre || '', apellido: parsed.apellido || '', telefono: parsed.telefono || '', direccion: '' };
        }
      }
    } catch { /* corrupt data, ignore */ }
    return { nombre: '', apellido: '', telefono: '', direccion: '' };
  });
  const [linkUbicacion, setLinkUbicacion] = useState('');
  const [posicionGPS, setPosicionGPS] = useState(null);
  const [metodoPago, setMetodoPago] = useState('pago_movil');
  const [pagaCon, setPagaCon] = useState('');
  const [necesitaVuelto, setNecesitaVuelto] = useState(false);
  const [mostrarAlertaWP, setMostrarAlertaWP] = useState(false);

  // Currency logic: pago_movil = Bs, zelle/efectivo = USD
  const esBs = metodoPago === 'pago_movil';
  const totalBs = tasa > 0 ? (Number(total) || 0) * tasa : 0;
  
  // Calculate change if cash
  let vuelto = 0;
  if (metodoPago === 'efectivo' && pagaCon) {
    const pago = parseFloat(pagaCon);
    if (!isNaN(pago) && pago > total) {
      vuelto = pago - (Number(total) || 0);
    }
  }

  const obtenerUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const linkMapa = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLinkUbicacion(linkMapa);
          setPosicionGPS([latitude, longitude]);
        },
        () => alert("No se pudo obtener tu ubicación. Verifica los permisos del GPS."),
        { enableHighAccuracy: true }
      );
    }
  };

  const guardarCliente = async () => {
    try {
      // Verificar duplicado: mismo nombre + apellido + telefono
      const q = query(
        collection(db, "clientes"),
        where("nombre", "==", datos.nombre),
        where("apellido", "==", datos.apellido),
        where("telefono", "==", datos.telefono)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "clientes"), {
          nombre: datos.nombre,
          apellido: datos.apellido,
          telefono: datos.telefono,
          direccion: datos.direccion,
          ubicacion: linkUbicacion || '',
          fecha: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error guardando cliente:", error);
    }
  };

  const getPagoTexto = () => {
    switch (metodoPago) {
      case 'pago_movil': return '📱 Pago Móvil';
      case 'zelle': return '💵 Zelle';
      case 'efectivo': return '💰 Efectivo USD';
      default: return metodoPago;
    }
  };

  const enviarPedido = async () => {
    if (!datos.nombre || !datos.apellido || !datos.telefono) {
      alert("Por favor completa tu nombre, apellido y teléfono.");
      return;
    }

    // Guardar datos en localStorage para próxima vez
    localStorage.setItem('cliente_datos', JSON.stringify({
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono,
    }));

    // Guardar cliente en Firebase (sin duplicados)
    await guardarCliente();

    const listaProductos = carrito.map(p => {
      const cant = p.cantidad || 1;
      const extraCost = p.extraTotal || 0;
      const itemTotal = (Number(p.precio) + extraCost) * cant;
      const itemTotalBs = tasa > 0 ? itemTotal * tasa : null;
      // Show price in correct currency
      const precioStr = esBs && itemTotalBs
        ? `Bs ${formatearBs(itemTotalBs)} (≈ $${formatearUSD(itemTotal)})`
        : `$${formatearUSD(itemTotal)}${tasa > 0 ? ` (≈ Bs ${formatearBs(itemTotal * tasa)})` : ''}`;
      let line = `• ${p.nombre} x${cant} (${precioStr})`;
      if (p.personalizaciones && p.personalizaciones.length > 0) {
        const opciones = p.personalizaciones.map(o => `  ↳ ${o.label}${o.extra ? ` (+$${formatearUSD(o.extra)})` : ''}`).join('\n');
        line += '\n' + opciones;
      }
      if (p.nota) {
        line += `\n  📝 ${p.nota}`;
      }
      return line;
    }).join('\n');

    // Build total line based on payment method
    let totalLine;
    if (esBs && tasa > 0) {
      totalLine = `*TOTAL A PAGAR: Bs ${formatearBs(totalBs)}* (≈ $${formatearUSD(total)})`;
    } else {
      totalLine = `*TOTAL A PAGAR: $${formatearUSD(total)}*${tasa > 0 ? ` (≈ Bs ${formatearBs(totalBs)})` : ''}`;
    }

    // Info de pago
    let infoPago = `*Método de pago:* ${getPagoTexto()}`;
    if (metodoPago === 'efectivo' && pagaCon) {
      infoPago += `\n*Paga con:* $${formatearUSD(pagaCon)}`;
      infoPago += `\n*Vuelto:* $${formatearUSD(vuelto)}`;
      if (necesitaVuelto) {
        infoPago += ` ⚠️ _El repartidor debe llevar vuelto_`;
      }
    }

    // Guardar pedido en Firebase
    const clienteNombre = `${datos.nombre} ${datos.apellido}`;
    try {
      const docRef = await addDoc(collection(db, "pedidos"), {
        cliente: clienteNombre,
        telefono: datos.telefono,
        metodo: metodo,
        direccion: metodo === 'delivery' ? datos.direccion : 'Pick-up en local',
        ubicacion: linkUbicacion || '',
        items: carrito.map(p => ({
          nombre: p.nombre,
          precio: p.precio,
          cantidad: p.cantidad || 1,
          personalizaciones: p.personalizaciones || [],
          nota: p.nota || '',
          extraTotal: p.extraTotal || 0,
        })),
        total: total,
        totalBs: tasa > 0 ? totalBs : 0,
        metodoPago: metodoPago,
        pagaCon: metodoPago === 'efectivo' ? parseFloat(pagaCon) || 0 : 0,
        vuelto: metodoPago === 'efectivo' ? parseFloat(vuelto) || 0 : 0,
        necesitaVuelto: necesitaVuelto,
        estado: 'pendiente',
        fecha: serverTimestamp(),
      });

      // Guardar ID del pedido para seguimiento
      localStorage.setItem('pedido-activo-id', docRef.id);
    } catch (error) {
      console.error("Error guardando pedido:", error);
    }

    const mensaje = `
🍔 *NUEVO PEDIDO - FAST FOOD*
-------------------------
*Cliente:* ${clienteNombre}
*Teléfono:* ${datos.telefono}
*Método:* ${metodo === 'delivery' ? '🛵 Delivery' : '🛍️ Pick-up'}
${metodo === 'delivery' ? `*Dirección:* ${datos.direccion}` : ''}
${linkUbicacion ? `*📍 Ubicación GPS:* ${linkUbicacion}` : ''}

*PEDIDO:*
${listaProductos}

${totalLine}
${infoPago}
-------------------------
${metodoPago === 'efectivo' ? '_El repartidor lleva vuelto._' : '_Por favor, adjunte la captura de su pago a este chat._'}
    `.trim();

    const url = `https://wa.me/584140000000?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    // Navegar al seguimiento
    if (onPedidoCreado) onPedidoCreado();
  };

  return (
    <div className="min-h-screen bg-kfc-gray p-4 md:p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
        <button onClick={volver} className="text-kfc-red font-bold mb-4 hover:underline">← Volver al menú</button>
        <h2 className="text-3xl font-extrabold text-kfc-dark mb-6 tracking-tight">Finalizar Pedido</h2>

        <div className="space-y-5">
          {/* Nombre y Apellido */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                className="w-full border p-3 rounded-lg mt-1"
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                className="w-full border p-3 rounded-lg mt-1"
                value={datos.apellido}
                onChange={(e) => setDatos({ ...datos, apellido: e.target.value })}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="tel"
              className="w-full border p-3 rounded-lg mt-1"
              value={datos.telefono}
              onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
              placeholder="0424-1234567"
            />
          </div>

          {/* Método de entrega */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Método de Entrega</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setMetodo('delivery')}
                className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${metodo === 'delivery' ? 'bg-kfc-red border-kfc-red text-white shadow-md' : 'bg-white border-gray-200 text-kfc-dark hover:border-kfc-red'}`}
              ><IconMotorbike className="w-5 h-5" /> Delivery</button>
              <button
                onClick={() => setMetodo('pickup')}
                className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${metodo === 'pickup' ? 'bg-kfc-red border-kfc-red text-white shadow-md' : 'bg-white border-gray-200 text-kfc-dark hover:border-kfc-red'}`}
              ><IconShopping className="w-5 h-5" /> Pick-up</button>
            </div>
          </div>

          {metodo === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Referencia de Dirección</label>
              <textarea
                className="w-full border p-3 rounded-lg mt-1"
                value={datos.direccion}
                onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                placeholder="Ej: Calle 72 con Av. 15, casa azul al lado de la panadería"
              ></textarea>
              <button
                type="button"
                onClick={obtenerUbicacion}
                className="mt-2 w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <IconMapPin className="w-5 h-5" /> Obtener mi ubicación actual
              </button>
              {linkUbicacion && (
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1"><IconCheckCircle className="w-4 h-4" /> Ubicación GPS capturada</p>
              )}

              <MapaUbicacion
                alCambiarUbicacion={(link) => setLinkUbicacion(link)}
                posicionGPS={posicionGPS}
              />
            </div>
          )}

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setMetodoPago('pago_movil')}
                className={`flex-1 p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1.5 ${metodoPago === 'pago_movil' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              ><IconPhone className="w-4 h-4" /> Pago Móvil</button>
              <button
                onClick={() => setMetodoPago('zelle')}
                className={`flex-1 p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1.5 ${metodoPago === 'zelle' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
              ><IconDollar className="w-4 h-4" /> Zelle</button>
              <button
                onClick={() => setMetodoPago('efectivo')}
                className={`flex-1 p-2 rounded-lg border text-sm font-bold flex items-center justify-center gap-1.5 ${metodoPago === 'efectivo' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
              ><IconDollar className="w-4 h-4" /> Efectivo</button>
            </div>
          </div>

          {/* Efectivo: paga con + vuelto */}
          {metodoPago === 'efectivo' && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">¿Con cuánto paga? ($)</label>
                <input
                  type="number"
                  className="w-full border p-3 rounded-lg mt-1"
                  value={pagaCon}
                  onChange={(e) => setPagaCon(e.target.value)}
                  placeholder="Ej: 20"
                />
              </div>
              {pagaCon && parseFloat(pagaCon) >= total && (
                <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Vuelto:</span>
                  <span className="font-bold text-lg text-green-600">${vuelto}</span>
                </div>
              )}
              {pagaCon && parseFloat(pagaCon) < total && (
                <p className="text-red-500 text-sm font-medium flex items-center gap-1"><IconWarning className="w-4 h-4" /> El monto es menor al total del pedido</p>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={necesitaVuelto}
                  onChange={(e) => setNecesitaVuelto(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-gray-700">El repartidor debe llevar vuelto</span>
              </label>
            </div>
          )}

          {/* Total box — currency depends on payment method */}
          <div className="bg-gray-50 text-gray-800 p-6 rounded-2xl border-2 border-gray-100 mt-8 shadow-sm relative overflow-hidden">
            {metodo === 'delivery' && (
              <div className="absolute top-0 left-0 w-full bg-yellow-100 text-yellow-800 text-[10px] font-bold text-center py-1.5 px-4 tracking-wide uppercase">
                Costo de Delivery no incluido (Se calcula al asignar repartidor)
              </div>
            )}
            <div className={metodo === 'delivery' ? 'mt-4' : ''}>
              {esBs ? (
                <>
                  <p className="flex justify-between items-center font-black text-2xl md:text-3xl">
                    <span className="text-gray-500 text-lg">Total a pagar:</span>
                    <span className="text-blue-600">
                      {tasa > 0 ? `Bs ${totalBs.toFixed(0)}` : 'Cargando...'}
                    </span>
                  </p>
                  {tasa > 0 && (
                    <p className="text-right text-sm text-gray-400 font-bold mt-1">
                      ≈ ${(Number(total) || 0).toFixed(2)} USD
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="flex justify-between items-center font-black text-2xl md:text-3xl">
                    <span className="text-gray-500 text-lg">Total a pagar:</span>
                    <span className="text-green-600">${(Number(total) || 0).toFixed(2)}</span>
                  </p>
                  {tasa > 0 && (
                    <p className="text-right text-sm text-gray-400 font-bold mt-1">
                      ≈ Bs {totalBs.toFixed(0)}
                    </p>
                  )}
                </>
              )}
              <p className="text-xs text-gray-400 mt-3 font-semibold pb-2 border-b border-gray-200">
                {esBs ? '📱 Pago en Bolívares (Pago Móvil)' : metodoPago === 'zelle' ? '💵 Pago en USD (Zelle)' : '💰 Pago en USD (Efectivo)'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!datos.nombre || !datos.apellido || !datos.telefono) {
                alert("Por favor completa tu nombre, apellido y teléfono.");
                return;
              }
              setMostrarAlertaWP(true);
            }}
            className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-xl shadow-[0_4px_15px_rgba(37,211,102,0.4)] mt-6 hover:bg-[#1ebd59] btn-press flex items-center justify-center gap-2 transition-all"
          >
            Confirmar y enviar por WhatsApp
          </button>
        </div>
      </div>

      {/* Alerta WhatsApp */}
      {mostrarAlertaWP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheckCircle className="w-8 h-8 text-[#25D366]" />
            </div>
            <h3 className="font-black text-xl text-gray-800 mb-2">¡Todo listo para pedir!</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Vamos a redirigirte a WhatsApp para que envíes tu pedido y comprobante de pago. 
              <br/><br/>
              <span className="font-bold text-kfc-red">¡MUY IMPORTANTE!</span><br/>
              Cuando termines en WhatsApp, <span className="font-bold text-gray-800">regresa a esta página</span> para hacer el seguimiento en tiempo real de tu delivery.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setMostrarAlertaWP(false);
                  enviarPedido();
                }}
                className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#1ebd59] transition-colors shadow-m hover:shadow-lg"
              >
                Entendido, ir a WhatsApp
              </button>
              <button
                onClick={() => setMostrarAlertaWP(false)}
                className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition-colors"
              >
                Cancelar y revisar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;
