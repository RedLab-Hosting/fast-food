// Script para agregar productos de prueba a Firebase
// Ejecutar: node scripts/seed-products.js

// const admin = require('firebase-admin'); // unused

// Usa la configuración del proyecto
// Para ejecutar esto necesitas configurar las credenciales de Firebase Admin
// O puedes copiar estos productos manualmente desde el panel admin

const PRODUCTOS_DEMO = [
  // HAMBURGUESAS
  { nombre: 'Classic Burger', precio: 5.50, descripcion: 'Carne 150g, lechuga, tomate, cebolla y salsa especial', categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
  { nombre: 'Double Smash', precio: 8.00, descripcion: 'Doble carne smash, queso americano derretido, pickles y salsa BBQ', categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop' },
  { nombre: 'Bacon Supreme', precio: 9.50, descripcion: 'Carne 200g, bacon crocante, queso cheddar, aros de cebolla', categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop' },
  { nombre: 'Chicken Burger', precio: 6.50, descripcion: 'Pechuga crispy, lechuga, tomate y mayo de chipotle', categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop' },

  // PIZZAS
  { nombre: 'Pizza Pepperoni', precio: 12.00, descripcion: 'Masa artesanal, salsa de tomate, mozzarella y pepperoni', categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop' },
  { nombre: 'Pizza Hawaiana', precio: 11.00, descripcion: 'Jamón, piña, mozzarella y salsa de tomate', categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop' },
  { nombre: 'Pizza BBQ Chicken', precio: 13.50, descripcion: 'Pollo desmenuzado, cebolla caramelizada, cilantro y salsa BBQ', categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop' },

  // POLLO
  { nombre: 'Wings BBQ (8 pcs)', precio: 7.50, descripcion: '8 alitas de pollo bañadas en salsa BBQ ahumada', categoria: 'pollo', imagen: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop' },
  { nombre: 'Nuggets (12 pcs)', precio: 5.00, descripcion: '12 nuggets de pollo crujientes con dip a elegir', categoria: 'pollo', imagen: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop' },
  { nombre: 'Pollo Frito (4 pcs)', precio: 8.00, descripcion: '4 piezas de pollo crujiente estilo southern con coleslaw', categoria: 'pollo', imagen: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop' },

  // HOT DOGS
  { nombre: 'Hot Dog Clásico', precio: 3.50, descripcion: 'Salchicha premium, mostaza, ketchup y cebolla picada', categoria: 'perros', imagen: 'https://images.unsplash.com/photo-1612392062126-2f5b24fc7ae0?w=400&h=300&fit=crop' },
  { nombre: 'Perro con Todo', precio: 5.00, descripcion: 'Salchicha, papas fritas, queso, jalapeños y guacamole', categoria: 'perros', imagen: 'https://images.unsplash.com/photo-1619740455993-9e612b50a022?w=400&h=300&fit=crop' },

  // TACOS
  { nombre: 'Tacos de Carne (3)', precio: 6.50, descripcion: '3 tacos de carne asada con cilantro, cebolla y salsa verde', categoria: 'tacos', imagen: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop' },
  { nombre: 'Tacos de Pollo (3)', precio: 6.00, descripcion: '3 tacos de pollo marinado con pico de gallo y crema', categoria: 'tacos', imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop' },

  // ENSALADAS
  { nombre: 'Ensalada César', precio: 5.50, descripcion: 'Lechuga romana, crutones, parmesano y aderezo césar', categoria: 'ensaladas', imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
  { nombre: 'Ensalada Tropical', precio: 6.00, descripcion: 'Mix de lechugas, mango, aguacate, tomate cherry y vinagreta', categoria: 'ensaladas', imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop' },

  // BEBIDAS
  { nombre: 'Coca-Cola 500ml', precio: 1.50, descripcion: 'Coca-Cola original bien fría', categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop' },
  { nombre: 'Limonada Natural', precio: 2.00, descripcion: 'Limonada natural con hielo y hierbabuena', categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop' },
  { nombre: 'Milkshake Oreo', precio: 4.00, descripcion: 'Batido cremoso de galletas Oreo con helado', categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop' },

  // POSTRES
  { nombre: 'Brownie con Helado', precio: 4.50, descripcion: 'Brownie de chocolate caliente con helado de vainilla', categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop' },
  { nombre: 'Churros (6 pcs)', precio: 3.00, descripcion: '6 churros con azúcar y canela + salsa de chocolate', categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1624371414361-e670edf4672e?w=400&h=300&fit=crop' },

  // COMBOS
  { nombre: 'Combo Burger + Papas + Refresco', precio: 9.50, descripcion: 'Classic Burger + Papas fritas + Coca-Cola 500ml', categoria: 'combos', imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop' },
  { nombre: 'Combo Familiar', precio: 22.00, descripcion: '2 Burgers + Pizza mediana + 4 Refrescos + Churros', categoria: 'combos', imagen: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop' },
];

console.log('📋 Productos de demo para copiar como JSON:');
console.log(JSON.stringify(PRODUCTOS_DEMO, null, 2));
console.log('\n✅ Copia estos productos y agrégalos desde el panel Admin');
console.log('   o usa la consola de Firebase para importarlos.');
