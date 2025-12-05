// servidor principal de la panaderia con postgresql -bynd
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// configuracion de postgresql -bynd
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// verificar conexion a la base de datos -bynd
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.stack);
  } else {
    console.log('Conectado a Supabase PostgreSQL');
    release();
  }
});

// middleware basico -bynd
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================================
// API ENDPOINTS - PRODUCTOS -bynd
// ===================================

// obtener todos los productos -bynd
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.precio_original as "precioOriginal",
        p.imagen,
        c.nombre as categoria,
        t.nombre as tema,
        p.stock,
        p.rating,
        p.reviews_count as reviews,
        p.destacado,
        p.badge,
        p.descuento
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN temas t ON p.tema_id = t.id
      WHERE p.activo = true
      ORDER BY p.destacado DESC, p.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// obtener productos destacados -bynd
app.get('/api/productos/destacados', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.precio_original as "precioOriginal",
        p.imagen,
        c.nombre as categoria,
        t.nombre as tema,
        p.stock,
        p.rating,
        p.reviews_count as reviews,
        p.destacado,
        p.badge,
        p.descuento
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN temas t ON p.tema_id = t.id
      WHERE p.activo = true AND p.destacado = true
      ORDER BY p.id ASC
      LIMIT 8
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo productos destacados:', error);
    res.status(500).json({ error: 'Error al obtener productos destacados' });
  }
});

// obtener producto por id -bynd
app.get('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.precio_original as "precioOriginal",
        p.imagen,
        c.nombre as categoria,
        t.nombre as tema,
        p.stock,
        p.rating,
        p.reviews_count as reviews,
        p.destacado,
        p.badge,
        p.descuento
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN temas t ON p.tema_id = t.id
      WHERE p.id = $1 AND p.activo = true
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// obtener categorias -bynd
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE activa = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorias' });
  }
});

// obtener temas -bynd
app.get('/api/temas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM temas WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo temas:', error);
    res.status(500).json({ error: 'Error al obtener temas' });
  }
});

// ===================================
// API ENDPOINTS - AUTENTICACION -bynd
// ===================================

// login -bynd
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, email, nombre, rol FROM usuarios WHERE email = $1 AND password = $2 AND activo = true',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales invalidas' });
    }
    
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, error: 'Error de servidor' });
  }
});

// registro -bynd
app.post('/api/registro', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;
    
    // verificar si el email ya existe -bynd
    const existeResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existeResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya esta registrado' });
    }
    
    // crear usuario -bynd
    const result = await pool.query(
      'INSERT INTO usuarios (email, password, nombre, rol) VALUES ($1, $2, $3, $4) RETURNING id, email, nombre, rol',
      [email, password, nombre, 'cliente']
    );
    
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, error: 'Error de servidor' });
  }
});

// ===================================
// API ENDPOINTS - PEDIDOS -bynd
// ===================================

// crear pedido -bynd
app.post('/api/pedidos', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { usuario_id, items, direccion_envio, notas } = req.body;
    
    await client.query('BEGIN');
    
    // calcular totales -bynd
    let subtotal = 0;
    for (const item of items) {
      const productoResult = await client.query('SELECT precio FROM productos WHERE id = $1', [item.producto_id]);
      if (productoResult.rows.length > 0) {
        subtotal += productoResult.rows[0].precio * item.cantidad;
      }
    }
    
    const envio = subtotal >= 500 ? 0 : 50;
    const total = subtotal + envio;
    
    // crear pedido -bynd
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (usuario_id, subtotal, envio, total, direccion_envio, notas)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, codigo
    `, [usuario_id, subtotal, envio, total, direccion_envio, notas]);
    
    const pedido = pedidoResult.rows[0];
    
    // crear items del pedido -bynd
    for (const item of items) {
      const productoResult = await client.query('SELECT precio FROM productos WHERE id = $1', [item.producto_id]);
      const precio = productoResult.rows[0]?.precio || 0;
      
      await client.query(`
        INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [pedido.id, item.producto_id, item.cantidad, precio, precio * item.cantidad]);
      
      // actualizar stock -bynd
      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, pedido: { ...pedido, total } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando pedido:', error);
    res.status(500).json({ success: false, error: 'Error al crear pedido' });
  } finally {
    client.release();
  }
});

// obtener pedidos de un usuario -bynd
app.get('/api/pedidos/usuario/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT id, codigo, subtotal, envio, total, estado, created_at
      FROM pedidos
      WHERE usuario_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// ===================================
// API ENDPOINTS - ADMIN DASHBOARD -bynd
// ===================================

// datos del dashboard admin -bynd
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // metricas -bynd
    const ventasHoy = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cantidad
      FROM pedidos
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    
    const ventasAyer = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM pedidos
      WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    `);
    
    const productosDestacados = await pool.query('SELECT COUNT(*) FROM productos WHERE destacado = true AND activo = true');
    
    const alertasInventario = await pool.query('SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo AND activo = true');
    
    // calcular cambio porcentual -bynd
    const ventasHoyVal = parseFloat(ventasHoy.rows[0].total);
    const ventasAyerVal = parseFloat(ventasAyer.rows[0].total);
    const cambioPorcentual = ventasAyerVal > 0 ? ((ventasHoyVal - ventasAyerVal) / ventasAyerVal * 100).toFixed(1) : 0;
    
    const metricas = [
      { 
        id: 'ventas-dia', 
        titulo: 'Ventas del Dia', 
        valor: '$' + ventasHoyVal.toFixed(2), 
        cambio: (cambioPorcentual >= 0 ? '+' : '') + cambioPorcentual + '%', 
        tipo: cambioPorcentual >= 0 ? 'positivo' : 'negativo' 
      },
      { 
        id: 'pedidos', 
        titulo: 'Pedidos Totales', 
        valor: ventasHoy.rows[0].cantidad.toString(), 
        cambio: '+0', 
        tipo: 'positivo' 
      },
      { 
        id: 'productos-pop', 
        titulo: 'Productos Destacados', 
        valor: productosDestacados.rows[0].count.toString(), 
        cambio: '+0', 
        tipo: 'positivo' 
      },
      { 
        id: 'alertas', 
        titulo: 'Alertas Inventario', 
        valor: alertasInventario.rows[0].count.toString(), 
        cambio: '-0', 
        tipo: 'negativo' 
      }
    ];
    
    // pedidos recientes -bynd
    const pedidosRecientes = await pool.query(`
      SELECT 
        p.codigo as id,
        u.nombre as cliente,
        (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as items,
        p.total,
        p.estado,
        TO_CHAR(p.created_at, 'DD/MM/YYYY') as fecha
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    // alertas de inventario -bynd
    const alertas = await pool.query(`
      SELECT 
        id,
        nombre as producto,
        stock as "stockActual",
        stock_minimo as "stockMinimo",
        CASE 
          WHEN stock <= stock_minimo * 0.3 THEN 'critico'
          ELSE 'advertencia'
        END as severidad,
        CASE 
          WHEN stock <= stock_minimo * 0.3 THEN 'Stock critico - Reabastecer inmediatamente'
          ELSE 'Stock bajo - Considerar reabastecimiento'
        END as mensaje
      FROM productos
      WHERE stock <= stock_minimo AND activo = true
      ORDER BY stock ASC
      LIMIT 5
    `);
    
    res.json({
      metricas,
      pedidosRecientes: pedidosRecientes.rows,
      alertasInventario: alertas.rows
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

// actualizar estado de pedido -bynd
app.put('/api/admin/pedidos/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// actualizar stock de producto -bynd
app.put('/api/admin/productos/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    await pool.query('UPDATE productos SET stock = $1 WHERE id = $2', [stock, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando stock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

// ===================================
// API ENDPOINTS - CONFIGURACION -bynd
// ===================================

// obtener configuracion -bynd
app.get('/api/config/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const result = await pool.query('SELECT valor FROM configuracion WHERE clave = $1', [clave]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuracion no encontrada' });
    }
    res.json({ valor: result.rows[0].valor });
  } catch (error) {
    console.error('Error obteniendo configuracion:', error);
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
});

// ruta principal redirige a landing -bynd
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// iniciar servidor -bynd
app.listen(PORT, () => {
  console.log(`Servidor de La Desesperanza corriendo en http://localhost:${PORT}`);
});
