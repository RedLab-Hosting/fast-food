import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import CarritoFlotante from '../../Components/CarritoFlotante';
import ModalCarrito from '../../Components/ModalCarrito';
import Checkout from './Checkout';
import SeguimientoPedido from './SeguimientoPedido';
import ModalPersonalizar from '../../Components/ModalPersonalizar';
import { IconPlus, IconSearch, IconPackage } from '../../Components/Icons';
import { useTasa } from '../../hooks/useTasa';

const CATEGORIAS_FALLBACK = [
  { value: 'hamburguesas', label: 'Hamburguesas', icon: '🍔' },
  { value: 'pizzas', label: 'Pizzas', icon: '🍕' },
  { value: 'pollo', label: 'Pollo', icon: '🍗' },
  { value: 'perros', label: 'Hot Dogs', icon: '🌭' },
  { value: 'bebidas', label: 'Bebidas', icon: '🥤' }
];

const IMG_DEFAULT = {
  hamburguesas: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  pizzas: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  pollo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
  perros: 'https://images.unsplash.com/photo-1612392062126-2f5b24fc7ae0?w=400&h=300&fit=crop',
  tacos: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
  ensaladas: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  bebidas: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  postres: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
  combos: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
  otros: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
};

function Cliente() {
  const { tasa, aBs } = useTasa();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem('carrito-fastfood');
      const parsed = guardado ? JSON.parse(guardado) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enCheckout, setEnCheckout] = useState(false);
  const [enSeguimiento, setEnSeguimiento] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [productoPersonalizar, setProductoPersonalizar] = useState(null);

  const [ajustes, setAjustes] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ ...doc.data(), id: doc.id }));
      setProductos(docs);
    });

    const unsubAjustes = onSnapshot(doc(db, "config", "ajustes"), (docSnap) => {
      if (docSnap.exists()) {
        setAjustes(docSnap.data());
      }
    });

    return () => {
      unsub();
      unsubAjustes();
    };
  }, []);

  const categoriasDinamicas = ajustes?.categorias && ajustes.categorias.length > 0 ? ajustes.categorias : CATEGORIAS_FALLBACK;

  useEffect(() => {
    localStorage.setItem('carrito-fastfood', JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (productoConOpciones) => {
    // Generate unique key based on customizations
    const customKey = productoConOpciones.personalizaciones?.map(p => p.id).sort().join(',') || '';
    const itemId = customKey ? `${productoConOpciones.id}_${customKey}` : productoConOpciones.id;
    const existente = carrito.find(item => item.cartId === itemId);
    if (existente) {
      setCarrito(carrito.map(item =>
        item.cartId === itemId
          ? { ...item, cantidad: (item.cantidad || 1) + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...productoConOpciones, cartId: itemId, cantidad: 1 }]);
    }
  };

  const actualizarCantidad = (cartId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter(item => (item.cartId || item.id) !== cartId));
    } else {
      setCarrito(carrito.map(item =>
        (item.cartId || item.id) === cartId ? { ...item, cantidad: nuevaCantidad } : item
      ));
    }
  };

  const eliminarDelCarrito = (cartId) => {
    setCarrito(carrito.filter(item => (item.cartId || item.id) !== cartId));
  };

  const getCantidadEnCarrito = (productoId) => {
    return carrito.filter(i => i.id === productoId).reduce((sum, i) => sum + (i.cantidad || 1), 0);
  };

  const totalItems = carrito.reduce((acc, p) => acc + (p.cantidad || 1), 0);
  const totalPrecio = carrito.reduce((acc, p) => acc + (Number(p.precio) + (p.extraTotal || 0)) * (p.cantidad || 1), 0);

  let productosFiltrados = productos.filter(p => p.disponible !== false);
  if (busqueda) {
    productosFiltrados = productosFiltrados.filter(p =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  const pedidoActivoId = localStorage.getItem('pedido-activo-id');

  if (enSeguimiento && pedidoActivoId) {
    return (
      <SeguimientoPedido
        pedidoId={pedidoActivoId}
        volver={() => setEnSeguimiento(false)}
      />
    );
  }

  if (enCheckout) {
    return (
      <Checkout
        carrito={carrito}
        total={totalPrecio}
        volver={() => setEnCheckout(false)}
        onPedidoCreado={() => {
          setCarrito([]);
          setEnCheckout(false);
          setEnSeguimiento(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-kfc-gray pb-28 font-sans">
      {/* Hero Header */}
      <header className="bg-gradient-brand text-white">
        <div className="relative px-6 pt-8 pb-10 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg">
            Fast Food
          </h1>
          <p className="text-red-100 text-sm mt-2 font-medium tracking-wide uppercase">
            Los mejores sabores, en tu puerta
          </p>
        </div>
      </header>

      {/* Search bar */}
      <div className="px-4 -mt-5 relative z-10 mb-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch className="w-5 h-5" /></span>
            <input
              type="text"
              placeholder="¿Qué se te antoja hoy?"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border-0 pl-12 pr-4 py-4 rounded-2xl shadow-card text-kfc-dark font-medium outline-none focus:ring-2 focus:ring-kfc-red/40 focus:shadow-card-hover transition-all"
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <main className="px-4 max-w-4xl mx-auto">
        {productosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100 mb-8 mx-4">
              <p className="text-5xl mb-4"><IconSearch className="w-12 h-12 mx-auto text-gray-300" /></p>
              <p className="text-gray-500 font-medium">No encontramos productos con ese término</p>
            <p className="text-gray-300 text-sm mt-1">Intenta con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {productosFiltrados.map((producto) => {
              const cant = getCantidadEnCarrito(producto.id);
              const imgSrc = producto.imagen || IMG_DEFAULT[producto.categoria] || IMG_DEFAULT.otros;

              return (
                <div key={producto.id} className="bg-white rounded-2xl shadow-card overflow-hidden product-card animate-fade-in flex flex-col">
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden group shrink-0">
                    <img
                      src={imgSrc}
                      alt={producto.nombre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.src = IMG_DEFAULT.otros; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    {producto.categoria && (
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                        {categoriasDinamicas.find(c => c.value === producto.categoria)?.icon || '🏷️'} {categoriasDinamicas.find(c => c.value === producto.categoria)?.label || producto.categoria}
                      </span>
                    )}
                    <div className="absolute bottom-3 right-3 text-right">
                      <p className="text-white font-black text-2xl drop-shadow-lg">
                        ${(Number(producto.precio) || 0).toFixed(2)}
                      </p>
                      {tasa > 0 && (
                        <p className="text-white/70 text-xs font-semibold drop-shadow-md">
                          Bs {aBs(Number(producto.precio))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col grow">
                    <div className="grow">
                      <h3 className="font-bold text-lg text-gray-800 leading-tight">{producto.nombre}</h3>
                      {producto.descripcion && (
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2 leading-relaxed">{producto.descripcion}</p>
                      )}
                    </div>

                    <div className="flex justify-end items-center mt-4">
                      {cant === 0 ? (
                        <button
                          onClick={() => setProductoPersonalizar(producto)}
                          className="bg-kfc-red text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 btn-press shadow-sm hover:shadow-float transition-all flex items-center gap-1.5"
                        >
                          <IconPlus className="w-4 h-4" />
                          Agregar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setProductoPersonalizar(producto)}
                            className="bg-kfc-red text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 btn-press shadow-sm transition-all flex items-center gap-1"
                          >
                            <IconPlus className="w-4 h-4" />
                            Otro
                          </button>
                          <span className="bg-gray-100 text-kfc-dark font-bold px-3 py-2 rounded-xl text-sm">
                            {cant} en carrito
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      <div onClick={() => setModalAbierto(true)}>
        <CarritoFlotante cantidad={totalItems} />
      </div>

      {/* Active Order Tracking Button */}
      {pedidoActivoId && (
        <button
          onClick={() => setEnSeguimiento(true)}
          className="fixed bottom-24 right-4 bg-green-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-green-600 btn-press z-40 flex items-center gap-2 animate-slide-up"
        >
          <IconPackage className="w-5 h-5" /> Ver mi pedido
        </button>
      )}

      {/* Cart Modal */}
      <ModalCarrito
        abierto={modalAbierto}
        cerrar={() => setModalAbierto(false)}
        productos={carrito}
        actualizarCantidad={actualizarCantidad}
        eliminar={eliminarDelCarrito}
        irACheckout={() => {
          setModalAbierto(false);
          setEnCheckout(true);
        }}
      />

      {/* Product Customization Modal */}
      {productoPersonalizar && (
        <ModalPersonalizar
          producto={productoPersonalizar}
          onConfirmar={(productoConOpciones) => {
            agregarAlCarrito(productoConOpciones);
            setProductoPersonalizar(null);
          }}
          onCerrar={() => setProductoPersonalizar(null)}
        />
      )}
    </div>
  );
}

export default Cliente;