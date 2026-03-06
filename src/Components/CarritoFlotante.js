import React from 'react';
import { IconCart } from './Icons';

function CarritoFlotante({ cantidad }) {
  if (cantidad === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-kfc-red text-white px-6 py-4 rounded-2xl shadow-float flex items-center gap-3 cursor-pointer hover:bg-red-700 transition-all border-2 border-white/20 btn-press z-40">
      <IconCart className="w-5 h-5" />
      <span className="font-bold font-sans text-sm">Ver Pedido ({cantidad})</span>
    </div>
  );
}

export default CarritoFlotante;
