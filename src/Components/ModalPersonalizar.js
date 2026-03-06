import React, { useState } from 'react';
import { IconClose, IconCheck } from './Icons';

// Customization options per category
const OPCIONES_POR_CATEGORIA = {
  hamburguesas: [
    { id: 'sin_verduras', label: 'Sin Verduras', desc: 'Sin lechuga, tomate ni cebolla' },
    { id: 'sin_salsa', label: 'Sin Salsa', desc: 'Sin salsa ni aderezos' },
    { id: 'extra_queso', label: 'Extra Queso', desc: 'Doble porción de queso' },
    { id: 'sin_pepinillos', label: 'Sin Pepinillos', desc: 'Sin pickles' },
    { id: 'pan_sin_semillas', label: 'Pan sin semillas', desc: 'Pan liso' },
    { id: 'extra_carne', label: 'Extra Carne', desc: 'Doble porción de carne', extra: 2.00 },
  ],
  pizzas: [
    { id: 'borde_queso', label: 'Borde de Queso', desc: 'Borde relleno de queso', extra: 1.50 },
    { id: 'masa_delgada', label: 'Masa Delgada', desc: 'Masa extra fina y crujiente' },
    { id: 'sin_aceitunas', label: 'Sin Aceitunas', desc: 'Quitar aceitunas' },
    { id: 'extra_pepperoni', label: 'Extra Pepperoni', desc: 'Doble pepperoni', extra: 1.00 },
    { id: 'sin_cebolla', label: 'Sin Cebolla', desc: 'Quitar cebolla' },
  ],
  pollo: [
    { id: 'extra_salsa', label: 'Extra Salsa', desc: 'Porción adicional de salsa' },
    { id: 'sin_picante', label: 'Sin Picante', desc: 'Versión suave' },
    { id: 'salsa_bbq', label: 'Salsa BBQ', desc: 'Cambiar a salsa BBQ' },
    { id: 'salsa_ranch', label: 'Salsa Ranch', desc: 'Cambiar a salsa ranch' },
    { id: 'extra_crispy', label: 'Extra Crispy', desc: 'Más crujiente' },
  ],
  perros: [
    { id: 'sin_mostaza', label: 'Sin Mostaza', desc: 'Quitar mostaza' },
    { id: 'sin_ketchup', label: 'Sin Ketchup', desc: 'Quitar ketchup' },
    { id: 'extra_queso', label: 'Extra Queso', desc: 'Agregar queso derretido', extra: 0.50 },
    { id: 'con_jalapeños', label: 'Con Jalapeños', desc: 'Agregar jalapeños' },
    { id: 'sin_cebolla', label: 'Sin Cebolla', desc: 'Quitar cebolla' },
  ],
  tacos: [
    { id: 'sin_cilantro', label: 'Sin Cilantro', desc: 'Quitar cilantro' },
    { id: 'sin_cebolla', label: 'Sin Cebolla', desc: 'Quitar cebolla' },
    { id: 'extra_picante', label: 'Extra Picante', desc: 'Salsa picante adicional' },
    { id: 'con_guacamole', label: 'Con Guacamole', desc: 'Agregar guacamole', extra: 1.00 },
    { id: 'tortilla_harina', label: 'Tortilla de Harina', desc: 'Cambiar a tortilla de harina' },
  ],
  ensaladas: [
    { id: 'sin_aderezo', label: 'Sin Aderezo', desc: 'Aderezo aparte' },
    { id: 'sin_crutones', label: 'Sin Crutones', desc: 'Quitar crutones' },
    { id: 'extra_proteina', label: 'Extra Proteína', desc: 'Pollo o carne extra', extra: 2.00 },
    { id: 'sin_queso', label: 'Sin Queso', desc: 'Quitar queso' },
  ],
  bebidas: [
    { id: 'sin_hielo', label: 'Sin Hielo', desc: 'Bebida sin hielo' },
    { id: 'extra_hielo', label: 'Extra Hielo', desc: 'Mucho hielo' },
    { id: 'sin_azucar', label: 'Sin Azúcar', desc: 'Versión sin azúcar' },
  ],
  postres: [
    { id: 'sin_crema', label: 'Sin Crema', desc: 'Quitar crema batida' },
    { id: 'extra_chocolate', label: 'Extra Chocolate', desc: 'Más salsa de chocolate' },
    { id: 'con_helado', label: 'Con Helado', desc: 'Agregar helado de vainilla', extra: 1.50 },
  ],
  combos: [
    { id: 'papas_grandes', label: 'Papas Grandes', desc: 'Agrandar las papas', extra: 1.00 },
    { id: 'bebida_grande', label: 'Bebida Grande', desc: 'Agrandar la bebida', extra: 0.50 },
    { id: 'cambiar_bebida', label: 'Cambiar Bebida', desc: 'Cambiar por limonada' },
  ],
};

// Fallback for products without a category
const OPCIONES_GENERALES = [
  { id: 'sin_salsa', label: 'Sin Salsa', desc: 'Sin salsa ni aderezos' },
  { id: 'sin_cebolla', label: 'Sin Cebolla', desc: 'Quitar cebolla' },
  { id: 'sin_verduras', label: 'Sin Verduras', desc: 'Sin vegetales' },
  { id: 'extra_queso', label: 'Extra Queso', desc: 'Agregar queso extra' },
  { id: 'sin_picante', label: 'Sin Picante', desc: 'Versión suave' },
];

function ModalPersonalizar({ producto, onConfirmar, onCerrar }) {
  const [selecciones, setSelecciones] = useState([]);
  const [nota, setNota] = useState('');

  if (!producto) return null;

  // Use category-specific options, or fallback to general options
  const opciones = OPCIONES_POR_CATEGORIA[producto.categoria] || OPCIONES_GENERALES;
  const extraTotal = selecciones.reduce((sum, sel) => {
    const op = opciones.find(o => o.id === sel);
    return sum + (op?.extra || 0);
  }, 0);

  const toggle = (id) => {
    setSelecciones(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const confirmar = () => {
    const personalizaciones = selecciones.map(id => {
      const op = opciones.find(o => o.id === id);
      return { id, label: op?.label, extra: op?.extra || 0 };
    });
    onConfirmar({
      ...producto,
      cantidad: 1,
      personalizaciones,
      nota: nota.trim() || '',
      extraTotal,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with product image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src={producto.imagen || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'}
            alt={producto.nombre}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <button
            onClick={onCerrar}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <IconClose className="w-4 h-4 text-gray-700" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-bold text-xl text-white drop-shadow-lg">{producto.nombre}</h3>
            <p className="text-white/80 text-sm">${Number(producto.precio).toFixed(2)}</p>
          </div>
        </div>

        {/* Options - always shown */}
        <div className="overflow-y-auto max-h-[45vh] p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personaliza tu pedido</p>
          <div className="space-y-2">
            {opciones.map(op => {
              const isSelected = selecciones.includes(op.id);
              return (
                <button
                  key={op.id}
                  onClick={() => toggle(op.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left btn-press ${
                    isSelected
                      ? 'border-kfc-red bg-red-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'bg-kfc-red' : 'bg-gray-100'
                  }`}>
                    {isSelected && <IconCheck className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-kfc-red' : 'text-gray-800'}`}>{op.label}</p>
                    <p className="text-xs text-gray-400">{op.desc}</p>
                  </div>
                  {op.extra && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg shrink-0">
                      +${op.extra.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Note */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nota especial</p>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Ej: Sin sal, bien cocido, etc."
              className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red resize-none bg-gray-50 transition-all"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={confirmar}
            className="w-full bg-kfc-red text-white py-3.5 rounded-xl font-bold text-base hover:bg-red-700 transition-all shadow-float btn-press flex items-center justify-center gap-2"
          >
            <IconCheck className="w-5 h-5" />
            Agregar al pedido
            {extraTotal > 0 && (
              <span className="text-red-200 text-sm ml-1">(+${extraTotal.toFixed(2)})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalPersonalizar;
