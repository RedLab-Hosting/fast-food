import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { IconClose, IconCheck, IconPlus, IconWarning, IconEdit } from './Icons';

const CATEGORIAS = [
  { value: 'hamburguesas', label: 'Hamburguesas' },
  { value: 'pizzas', label: 'Pizzas' },
  { value: 'pollo', label: 'Pollo' },
  { value: 'perros', label: 'Hot Dogs' },
  { value: 'tacos', label: 'Tacos' },
  { value: 'ensaladas', label: 'Ensaladas' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'combos', label: 'Combos' },
  { value: 'otros', label: 'Otros' },
];

const IMG_SUGERIDAS = {
  hamburguesas: [
    { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', label: 'Burger clásica' },
    { url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop', label: 'Doble burger' },
    { url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop', label: 'Bacon burger' },
    { url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop', label: 'Chicken burger' },
  ],
  pizzas: [
    { url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop', label: 'Pepperoni' },
    { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', label: 'Hawaiana' },
    { url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', label: 'BBQ' },
  ],
  pollo: [
    { url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop', label: 'Wings' },
    { url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop', label: 'Nuggets' },
    { url: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop', label: 'Frito' },
  ],
  perros: [
    { url: 'https://images.unsplash.com/photo-1612392062126-2f5b24fc7ae0?w=400&h=300&fit=crop', label: 'Clásico' },
    { url: 'https://images.unsplash.com/photo-1619740455993-9e612b50a022?w=400&h=300&fit=crop', label: 'Loaded' },
  ],
  bebidas: [
    { url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', label: 'Refresco' },
    { url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', label: 'Limonada' },
    { url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop', label: 'Milkshake' },
  ],
  postres: [
    { url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop', label: 'Brownie' },
    { url: 'https://images.unsplash.com/photo-1624371414361-e670edf4672e?w=400&h=300&fit=crop', label: 'Churros' },
  ],
  tacos: [
    { url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop', label: 'Tacos carne' },
    { url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop', label: 'Tacos pollo' },
  ],
  ensaladas: [
    { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', label: 'César' },
    { url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop', label: 'Tropical' },
  ],
  combos: [
    { url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop', label: 'Combo burger' },
    { url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop', label: 'Combo familiar' },
  ],
};

function FormularioProducto({ cerrar, productoEditar }) {
  const editando = !!productoEditar;
  const [form, setForm] = useState({
    nombre: productoEditar?.nombre || '',
    precio: productoEditar?.precio || '',
    descripcion: productoEditar?.descripcion || '',
    categoria: productoEditar?.categoria || 'hamburguesas',
    imagen: productoEditar?.imagen || '',
    disponible: productoEditar?.disponible !== false,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    if (!form.precio || Number(form.precio) <= 0) {
      setError('Ingresa un precio válido mayor a 0');
      return;
    }
    if (!form.categoria) {
      setError('Selecciona una categoría');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria,
        imagen: form.imagen.trim(),
        disponible: form.disponible,
      };

      if (editando) {
        await updateDoc(doc(db, "productos", productoEditar.id), datos);
      } else {
        await addDoc(collection(db, "productos"), datos);
      }
      cerrar();
    } catch (err) {
      setError("Error al guardar: " + err.message);
    }
    setGuardando(false);
  };

  const imgsSugeridas = IMG_SUGERIDAS[form.categoria] || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={cerrar}>
      <form
        onSubmit={guardar}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            {editando ? <><IconEdit className="w-6 h-6" /> Editar Plato</> : <><IconPlus className="w-6 h-6" /> Nuevo Plato</>}
          </h2>
          <button type="button" onClick={cerrar} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <IconClose className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200 flex items-center gap-2">
              <IconWarning className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nombre del plato *</label>
            <input
              placeholder="Ej: Burger Especial, Pizza Pepperoni"
              className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none bg-gray-50 font-medium transition-all"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          {/* Price + Category in row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Precio ($) *</label>
              <input
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
                className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none bg-gray-50 font-bold text-lg transition-all"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoría *</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none bg-gray-50 font-medium transition-all"
              >
                {CATEGORIAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Descripción</label>
            <textarea
              placeholder="Ingredientes, tamaño, notas especiales..."
              className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none bg-gray-50 resize-none transition-all"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Imagen</label>
            <input
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none bg-gray-50 text-sm transition-all"
              value={form.imagen}
              onChange={(e) => setForm({ ...form, imagen: e.target.value })}
            />

            {/* Image preview */}
            {form.imagen && (
              <div className="mt-2 relative rounded-xl overflow-hidden h-32">
                <img
                  src={form.imagen}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = ''; e.target.parentElement.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Suggested images based on category */}
            {imgsSugeridas.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Imágenes sugeridas para {CATEGORIAS.find(c => c.value === form.categoria)?.label || form.categoria}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {imgsSugeridas.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, imagen: img.url })}
                      className={`rounded-xl overflow-hidden h-16 border-2 transition-all btn-press ${
                        form.imagen === img.url ? 'border-kfc-red ring-2 ring-kfc-red/30' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Availability toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <p className="font-bold text-sm text-gray-800">Disponible para venta</p>
              <p className="text-xs text-gray-400">El producto aparecerá en el menú del cliente</p>
            </div>
            <div
              onClick={() => setForm({ ...form, disponible: !form.disponible })}
              className={`w-12 h-7 rounded-full p-1 transition-all cursor-pointer ${
                form.disponible ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                form.disponible ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={cerrar}
            className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 py-3 bg-kfc-red text-white rounded-xl font-bold shadow-float hover:bg-red-700 disabled:bg-gray-300 transition-all btn-press flex items-center justify-center gap-2"
          >
            {guardando ? (
              <span className="animate-pulse-soft">Guardando...</span>
            ) : (
              <>
                <IconCheck className="w-5 h-5" />
                {editando ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioProducto;
