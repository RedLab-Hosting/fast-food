import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

const CATEGORIAS = [
  { value: 'hamburguesas', label: '🍔 Hamburguesas' },
  { value: 'pizzas', label: '🍕 Pizzas' },
  { value: 'pollo', label: '🍗 Pollo' },
  { value: 'perros', label: '🌭 Perros Calientes' },
  { value: 'bebidas', label: '🥤 Bebidas' },
  { value: 'postres', label: '🍰 Postres' },
  { value: 'otros', label: '📦 Otros' },
];

function FormularioProducto({ cerrar, productoEditar }) {
  const editando = !!productoEditar;
  const [form, setForm] = useState({
    nombre: productoEditar?.nombre || '',
    precio: productoEditar?.precio || '',
    descripcion: productoEditar?.descripcion || '',
    categoria: productoEditar?.categoria || 'hamburguesas',
    imagen: productoEditar?.imagen || '',
  });

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const datos = {
        ...form,
        precio: Number(form.precio),
      };

      if (editando) {
        await updateDoc(doc(db, "productos", productoEditar.id), datos);
      } else {
        await addDoc(collection(db, "productos"), datos);
      }
      cerrar();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={guardar} className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {editando ? '✏️ Editar Plato' : '➕ Agregar Plato'}
        </h2>

        <div className="space-y-4">
          <input
            placeholder="Nombre (ej: Burger Especial)"
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            placeholder="Precio ($)"
            type="number"
            step="0.01"
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripción e ingredientes"
            className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none bg-white"
            >
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Imagen URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen (URL)</label>
            <input
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
              value={form.imagen}
              onChange={(e) => setForm({ ...form, imagen: e.target.value })}
            />
            {form.imagen && (
              <img
                src={form.imagen}
                alt="Preview"
                className="mt-2 h-24 w-full object-cover rounded-lg"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={cerrar} className="flex-1 py-3 font-bold text-gray-500 hover:text-gray-800 transition-colors">Cancelar</button>
          <button type="submit" className="flex-1 py-3 bg-kfc-red text-white rounded-xl font-bold shadow-md hover:bg-red-700 transition-colors">
            {editando ? 'Actualizar' : 'Guardar Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioProducto;
