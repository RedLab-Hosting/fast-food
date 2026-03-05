import React from 'react';

function CarritoFlotante({ cantidad }) {
  if (cantidad === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-kfc-red text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-red-700 transition-all border-2 border-white">
      <span className="text-2xl">🛒</span>
      <span className="font-bold font-sans">Ver Pedido ({cantidad})</span>
    </div>
  );
}

export default CarritoFlotante;
