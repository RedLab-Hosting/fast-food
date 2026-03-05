import React, { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

function LoginDelivery({ onLogin }) {
  const [modo, setModo] = useState('login'); // login o registro
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (!userDoc.exists() || userDoc.data().rol !== 'delivery') {
        setError('Esta cuenta no es de repartidor.');
        await auth.signOut();
      } else if (!userDoc.data().aprobado) {
        setError('Tu cuenta aún no ha sido aprobada por el administrador. Espera la confirmación.');
        await auth.signOut();
      } else {
        onLogin(cred.user);
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
    setCargando(false);
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Crear perfil en Firestore
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        uid: cred.user.uid,
        email: email,
        nombre: nombre,
        rol: 'delivery',
        disponible: false,
        aprobado: false,
        fecha: serverTimestamp(),
      });
      await auth.signOut();
      setRegistroExitoso(true);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Intenta iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Error al registrar: ' + err.message);
      }
    }
    setCargando(false);
  };

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-kfc-dark flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-extrabold mb-2 text-gray-800">¡Registro Exitoso!</h2>
          <p className="text-gray-500 mb-6 font-medium">Tu solicitud fue enviada. El administrador debe aprobar tu cuenta antes de que puedas iniciar sesión.</p>
          <button
            onClick={() => { setRegistroExitoso(false); setModo('login'); }}
            className="w-full bg-kfc-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kfc-dark flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-extrabold text-center mb-2 text-gray-800">🛵 Delivery</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Panel de Repartidores</p>

        {/* Toggle Login/Registro */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setModo('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${modo === 'login' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500'
              }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setModo('registro'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${modo === 'registro' ? 'bg-white text-kfc-dark shadow-sm' : 'text-gray-500'
              }`}
          >
            Registrarse
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
          <div className="space-y-4">
            {modo === 'registro' && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
                required
              />
            )}
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-kfc-red outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-6 bg-kfc-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors shadow-sm"
          >
            {cargando ? 'Cargando...' : (modo === 'login' ? 'Entrar' : 'Crear Cuenta')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginDelivery;
