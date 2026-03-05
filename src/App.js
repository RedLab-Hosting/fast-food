import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

// Importamos nuestras "habitaciones"
import Cliente from './views/Cliente';
import Admin from './views/Admin';
import Delivery from './views/Delivery';

function App() {
  return (
    <Router>
      <Routes>
        {/* Aquí definimos los caminos */}
        <Route path="/" element={<Cliente />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/delivery" element={<Delivery />} />
      </Routes>
    </Router>
  );
}

export default App;