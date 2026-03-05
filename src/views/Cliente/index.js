import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import CarritoFlotante from '../../Components/CarritoFlotante';
import ModalCarrito from '../../Components/ModalCarrito';
import Checkout from './Checkout';

const CATEGORIAS = [
  { value: 'todos', label: '📋 Todo' },
  { value: 'hamburguesas', label: '🍔 Burgers' },
  { value: 'pizzas', label: '🍕 Pizzas' },
  { value: 'pollo', label: '🍗 Pollo' },
  { value: 'perros', label: '🌭 Perros' },
  { value: 'bebidas', label: '🥤 Bebidas' },
  { value: 'postres', label: '🍰 Postres' },
  { value: 'otros', label: '📦 Otros' },
];

// Imágenes genéricas por categoría
const IMG_DEFAULT = {
  hamburguesas: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  pizzas: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  pollo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
  perros: 'https://images.unsplash.com/photo-1612392062126-2f5b24fc7ae0?w=400&h=300&fit=crop',
  bebidas: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  postres: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
  otros: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
};

function Cliente() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState(() => {
    const guardado = localStorage.getItem('carrito-fastfood');
    return guardado ? JSON.parse(guardado) : [];
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enCheckout, setEnCheckout] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ ...doc.data(), id: doc.id }));
      setProductos(docs);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('carrito-fastfood', JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto) => {
    const existente = carrito.find(item => item.id === producto.id);
    if (existente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: (item.cantidad || 1) + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      setCarrito(carrito.filter(item => item.id !== id));
    } else {
      setCarrito(carrito.map(item =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      ));
    }
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const getCantidadEnCarrito = (productoId) => {
    const item = carrito.find(i => i.id === productoId);
    return item ? (item.cantidad || 1) : 0;
  };

  const totalItems = carrito.reduce((acc, p) => acc + (p.cantidad || 1), 0);
  const totalPrecio = carrito.reduce((acc, p) => acc + Number(p.precio) * (p.cantidad || 1), 0);

  // Filtrar productos
  let productosFiltrados = productos;
  if (categoriaActiva !== 'todos') {
    productosFiltrados = productosFiltrados.filter(p => p.categoria === categoriaActiva);
  }
  if (busqueda) {
    productosFiltrados = productosFiltrados.filter(p =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }

  if (enCheckout) {
    return (
      <Checkout
        carrito={carrito}
        total={totalPrecio}
        volver={() => setEnCheckout(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-kfc-gray pb-24 font-sans">
      {/* Header */}
      <header className="bg-kfc-red text-white p-6 shadow-md">
        <h1 className="text-3xl font-extrabold text-center tracking-tight">🍔 Fast Food Express</h1>
        <p className="text-center text-red-100 text-sm mt-1 font-medium">Los mejores sabores, en tu puerta</p>
      </header>

      {/* Buscador */}
      <div className="px-4 -mt-5">
        <div className="max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="🔍 Buscar platos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border-0 p-4 rounded-xl shadow-md text-kfc-dark font-medium outline-none focus:ring-2 focus:ring-kfc-red"
          />
        </div>
      </div>

      {/* Categorías */}
      <div className="px-4 mt-4">
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIAS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoriaActiva(cat.value)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${categoriaActiva === cat.value
                  ? 'bg-kfc-red border-kfc-red text-white shadow-md'
                  : 'bg-white border-gray-200 text-kfc-dark shadow-sm hover:border-kfc-red hover:text-kfc-red'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Productos */}
      <main className="px-4 mt-4 max-w-4xl mx-auto">
        {productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500">No se encontraron platos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productosFiltrados.map((producto) => {
              const cant = getCantidadEnCarrito(producto.id);
              const imgSrc = producto.imagen || IMG_DEFAULT[producto.categoria] || IMG_DEFAULT.otros;

              return (
                <div key={producto.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-all">
                  {/* Imagen */}
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={producto.nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = IMG_DEFAULT.otros; }}
                    />
                    {producto.categoria && (
                      <span className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
                        {CATEGORIAS.find(c => c.value === producto.categoria)?.label || producto.categoria}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{producto.nombre}</h3>
                        {producto.descripcion && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-2">{producto.descripcion}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <p className="text-kfc-red font-black text-2xl">${Number(producto.precio).toFixed(2)}</p>

                      {cant === 0 ? (
                        <button
                          onClick={() => agregarAlCarrito(producto)}
                          className="bg-kfc-red text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                        >
                          Agregar
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                          <button
                            onClick={() => actualizarCantidad(producto.id, cant - 1)}
                            className="w-8 h-8 rounded-full bg-white text-kfc-dark font-bold flex items-center justify-center hover:bg-gray-100 shadow-sm border border-gray-200"
                          >
                            -
                          </button>
                          <span className="font-bold text-lg text-kfc-dark w-6 text-center">{cant}</span>
                          <button
                            onClick={() => actualizarCantidad(producto.id, cant + 1)}
                            className="w-8 h-8 rounded-full bg-kfc-red text-white font-bold flex items-center justify-center hover:bg-red-700 shadow-sm"
                          >
                            +
                          </button>
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

      {/* Botón Flotante */}
      <div onClick={() => setModalAbierto(true)}>
        <CarritoFlotante cantidad={totalItems} />
      </div>

      {/* Modal del Carrito */}
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
    </div>
  );
}

export default Cliente;