import React from 'react';
import { IconClose, IconPlus, IconMinus, IconNote } from './Icons';
import { useTasa } from '../hooks/useTasa';

function ModalCarrito({ abierto, cerrar, productos, actualizarCantidad, eliminar, irACheckout }) {
  const { tasa, aBs } = useTasa();
  if (!abierto) return null;

  const total = productos.reduce((acc, p) => acc + (Number(p.precio) + (p.extraTotal || 0)) * (p.cantidad || 1), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={cerrar}>
      <div
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col font-sans animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-kfc-dark">Tu Pedido</h2>
          <button onClick={cerrar} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <IconClose className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">Tu carrito está vacío</p>
              <p className="text-gray-300 text-sm mt-1">Agrega algo delicioso</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productos.map((item) => {
                const itemKey = item.cartId || item.id;
                const precioItem = (Number(item.precio) + (item.extraTotal || 0)) * (item.cantidad || 1);
                return (
                  <div key={itemKey} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    <div className="flex items-center gap-3">
                      {item.imagen && (
                        <img src={item.imagen} alt={item.nombre} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-kfc-red font-bold text-sm">${(Number(precioItem) || 0).toFixed(2)}</p>
                        {tasa > 0 && (
                          <p className="text-gray-400 text-xs font-medium">Bs {aBs(Number(precioItem))}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if ((item.cantidad || 1) <= 1) {
                              eliminar(itemKey);
                            } else {
                              actualizarCantidad(itemKey, (item.cantidad || 1) - 1);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-white text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-kfc-red shadow-sm border border-gray-100 btn-press"
                        >
                          <IconMinus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-sm w-5 text-center text-kfc-dark">{item.cantidad || 1}</span>
                        <button
                          onClick={() => actualizarCantidad(itemKey, (item.cantidad || 1) + 1)}
                          className="w-7 h-7 rounded-lg bg-kfc-red text-white flex items-center justify-center hover:bg-red-700 shadow-sm btn-press"
                        >
                          <IconPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Customizations */}
                    {item.personalizaciones && item.personalizaciones.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.personalizaciones.map(p => (
                          <span key={p.id} className="text-xs bg-white text-gray-500 px-2 py-1 rounded-lg border border-gray-100 font-medium">
                            {p.label}
                            {p.extra > 0 && <span className="text-green-600 ml-1">+${(Number(p.extra) || 0).toFixed(2)}</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {item.nota && (
                      <p className="mt-2 text-xs text-gray-400 italic bg-white px-2 py-1.5 rounded-lg border border-gray-100 flex items-start gap-1">
                        <IconNote className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {item.nota}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white">
          <div className="flex justify-between items-center mb-1">
            <span className="text-lg font-extrabold text-gray-700">Total:</span>
            <div className="text-right">
              <p className="text-lg font-extrabold text-kfc-red">${(Number(total) || 0).toFixed(2)}</p>
              {tasa > 0 && (
                <p className="text-sm text-gray-400 font-semibold">Bs {aBs(Number(total))}</p>
              )}
            </div>
          </div>
          <button
            disabled={productos.length === 0}
            onClick={irACheckout}
            className="w-full bg-kfc-red text-white py-3.5 rounded-xl font-bold text-base hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-float btn-press mt-3"
          >
            Continuar al Pago
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCarrito;
