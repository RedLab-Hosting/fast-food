import React from 'react';

function ModalCarrito({ abierto, cerrar, productos, actualizarCantidad, eliminar, irACheckout }) {
  if (!abierto) return null;

  const total = productos.reduce((acc, p) => acc + Number(p.precio) * (p.cantidad || 1), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-xl flex flex-col p-6 animate-slide-in font-sans">
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-2xl font-bold text-kfc-dark">Tu Pedido</h2>
          <button onClick={cerrar} className="text-gray-500 text-2xl font-bold">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {productos.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Tu carrito está vacío 🍕</p>
          ) : (
            productos.map((item) => (
              <div key={item.id} className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-lg">
                {item.imagen && (
                  <img src={item.imagen} alt={item.nombre} className="w-14 h-14 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.nombre}</p>
                  <p className="text-kfc-red font-semibold text-sm">${(item.precio * (item.cantidad || 1)).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if ((item.cantidad || 1) <= 1) {
                        eliminar(item.id);
                      } else {
                        actualizarCantidad(item.id, (item.cantidad || 1) - 1);
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-gray-200 text-kfc-dark font-bold flex items-center justify-center hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="font-bold text-lg w-6 text-center text-kfc-dark">{item.cantidad || 1}</span>
                  <button
                    onClick={() => actualizarCantidad(item.id, (item.cantidad || 1) + 1)}
                    className="w-8 h-8 rounded-full bg-kfc-red text-white font-bold flex items-center justify-center hover:bg-red-700"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between text-xl font-bold mb-4">
            <span>Total:</span>
            <span className="text-kfc-red">${total.toFixed(2)}</span>
          </div>
          <button
            disabled={productos.length === 0}
            onClick={irACheckout}
            className="w-full bg-kfc-red text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors shadow-sm"
          >
            Continuar al Pago
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCarrito;
