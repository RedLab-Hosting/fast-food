import React, { useState } from 'react';
import { auth, db } from '../../services/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { IconLock } from '../../Components/Icons';

function LoginAdmin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Verificar que sea admin
      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (userDoc.exists() && userDoc.data().rol === 'admin') {
        onLogin(cred.user);
      } else {
        setError('No tienes permisos de administrador.');
        await auth.signOut();
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
    setCargando(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Ingresa tu correo electrónico primero.');
      return;
    }
    setError('');
    setMensaje('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMensaje('Se envió un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError('No se pudo enviar el correo. Verifica que el correo sea correcto.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-admin flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-black text-white">Fast Food</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de Administración</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-kfc-dark rounded-2xl mx-auto flex items-center justify-center mb-3">
              <IconLock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-800">Bienvenido</h2>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 font-medium border border-red-100">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4 font-medium border border-green-100">
              {mensaje}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none transition-all bg-gray-50"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 p-3.5 rounded-xl focus:ring-2 focus:ring-kfc-red/30 focus:border-kfc-red outline-none transition-all bg-gray-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-6 bg-kfc-red text-white py-3.5 rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 transition-all shadow-float btn-press"
          >
            {cargando ? 'Entrando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className="w-full mt-3 text-gray-400 text-sm font-medium hover:text-kfc-red bg-transparent border-none cursor-pointer transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginAdmin;
