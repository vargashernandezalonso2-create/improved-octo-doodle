-- ===================================
-- script de base de datos panaderia la desesperanza -bynd
-- para supabase/postgresql
-- NOTA: este script borra todo y recrea las tablas -bynd
-- ===================================

-- primero borramos todo para evitar errores -bynd
DROP VIEW IF EXISTS vista_alertas_inventario CASCADE;
DROP VIEW IF EXISTS vista_dashboard CASCADE;
DROP VIEW IF EXISTS vista_productos CASCADE;

DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS carrito CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS temas CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP SEQUENCE IF EXISTS pedido_codigo_seq CASCADE;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generar_codigo_pedido() CASCADE;
DROP FUNCTION IF EXISTS actualizar_rating_producto() CASCADE;

-- extension para uuid -bynd
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- tabla de usuarios -bynd
-- ===================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de categorias -bynd
-- ===================================
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  imagen VARCHAR(500),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de temas (temporadas) -bynd
-- ===================================
CREATE TABLE temas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de productos -bynd
-- ===================================
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL,
  precio_original DECIMAL(10, 2),
  imagen VARCHAR(500),
  categoria_id INTEGER REFERENCES categorias(id),
  tema_id INTEGER REFERENCES temas(id),
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 10,
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  destacado BOOLEAN DEFAULT false,
  badge VARCHAR(50),
  descuento INTEGER,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de pedidos -bynd
-- ===================================
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  subtotal DECIMAL(10, 2) NOT NULL,
  envio DECIMAL(10, 2) DEFAULT 0,
  descuento DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesando', 'enviado', 'completado', 'cancelado')),
  direccion_envio TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de items del pedido -bynd
-- ===================================
CREATE TABLE pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de reviews -bynd
-- ===================================
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comentario TEXT,
  aprobado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- tabla de carrito (persistente) -bynd
-- ===================================
CREATE TABLE carrito (
  id SERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, producto_id)
);

-- ===================================
-- tabla de configuracion de la tienda -bynd
-- ===================================
CREATE TABLE configuracion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- indices para mejor rendimiento -bynd
-- ===================================
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_tema ON productos(tema_id);
CREATE INDEX idx_productos_destacado ON productos(destacado);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(created_at);
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX idx_reviews_producto ON reviews(producto_id);
CREATE INDEX idx_carrito_usuario ON carrito(usuario_id);

-- ===================================
-- funcion para actualizar updated_at -bynd
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- triggers para updated_at -bynd
CREATE TRIGGER trigger_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_carrito_updated_at
  BEFORE UPDATE ON carrito
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================================
-- funcion para generar codigo de pedido -bynd
-- ===================================
CREATE SEQUENCE IF NOT EXISTS pedido_codigo_seq START 1;

CREATE OR REPLACE FUNCTION generar_codigo_pedido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.codigo = 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('pedido_codigo_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pedido_codigo
  BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION generar_codigo_pedido();

-- ===================================
-- funcion para actualizar rating del producto -bynd
-- ===================================
CREATE OR REPLACE FUNCTION actualizar_rating_producto()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE productos
  SET 
    rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE producto_id = NEW.producto_id AND aprobado = true),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE producto_id = NEW.producto_id AND aprobado = true)
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION actualizar_rating_producto();

-- ===================================
-- datos iniciales - categorias -bynd
-- ===================================
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Panes', 'Panes tradicionales y especiales'),
  ('Pasteles', 'Pasteles para toda ocasion'),
  ('Galletas', 'Galletas decoradas y clasicas'),
  ('Postres', 'Postres variados y deliciosos');

-- ===================================
-- datos iniciales - temas (solo navidad y temporada) -bynd
-- ===================================
INSERT INTO temas (nombre, descripcion, fecha_inicio, fecha_fin) VALUES
  ('Navidad', 'Productos tematicos de Navidad', '2025-11-15', '2025-12-31'),
  ('Temporada', 'Productos de temporada regular', NULL, NULL);

-- ===================================
-- datos iniciales - usuarios -bynd
-- ===================================
INSERT INTO usuarios (email, password, nombre, rol) VALUES
  ('admin@ladesesperanza.com', 'admin123', 'Administrador', 'admin'),
  ('cliente@test.com', 'cliente123', 'Cliente Test', 'cliente');

-- ===================================
-- datos iniciales - productos navidenos -bynd
-- ===================================
INSERT INTO productos (nombre, descripcion, precio, precio_original, imagen, categoria_id, tema_id, stock, rating, reviews_count, destacado, badge, descuento) VALUES
  ('Galletas de Jengibre', 'Galletas clasicas de jengibre con decoracion navidena', 55.00, NULL, 'resources/galletas-jengibre.png', 3, 1, 60, 4.7, 112, true, 'Navidad', NULL),
  ('Panettone Artesanal', 'Panettone italiano con frutas y chips de chocolate', 280.00, 320.00, 'resources/panettone.png', 1, 1, 20, 4.9, 78, true, 'Premium', 12),
  ('Buche de Navidad', 'Pastel de chocolate en forma de tronco navideno', 350.00, NULL, 'resources/buche-navidad.png', 2, 1, 12, 4.8, 56, true, 'Especial', NULL),
  ('Cupcakes Navidenos', 'Cupcakes decorados con temas navidenos', 38.00, NULL, 'resources/cupcakes-navidad.png', 4, 1, 40, 4.6, 89, true, 'Nuevo', NULL),
  ('Rosca de Reyes', 'Rosca tradicional con frutas cristalizadas para el Dia de Reyes', 220.00, 250.00, 'resources/rosca-muerto.png', 1, 1, 25, 4.9, 134, true, 'Mas Vendido', 12),
  ('Concha de Vainilla', 'Pan dulce tradicional mexicano con cobertura de vainilla', 18.00, NULL, 'resources/concha-vainilla.png', 1, 2, 100, 4.4, 234, false, NULL, NULL),
  ('Galletas de Mantequilla', 'Galletas clasicas de mantequilla con azucar glass', 45.00, NULL, 'resources/galletas-calavera.png', 3, 1, 50, 4.5, 67, true, NULL, NULL),
  ('Pastel Red Velvet Navidad', 'Pastel red velvet con betun de queso crema y decoracion festiva', 380.00, 420.00, 'resources/pastel-halloween.png', 2, 1, 10, 4.9, 89, true, 'Edicion Limitada', 10),
  ('Empanadas de Manzana', 'Empanadas dulces rellenas de manzana y canela', 28.00, NULL, 'resources/empanadas-calabaza.png', 1, 2, 45, 4.6, 78, false, NULL, NULL),
  ('Polvorones de Canela', 'Galletas tradicionales de mantequilla con canela', 42.00, NULL, 'resources/cakepops-fantasma.png', 3, 1, 55, 4.7, 92, true, 'Clasico', NULL),
  ('Pan de Nuez', 'Pan artesanal con nueces caramelizadas', 95.00, NULL, 'resources/pan-muerto.png', 1, 2, 30, 4.8, 56, true, NULL, NULL),
  ('Tronco de Chocolate Blanco', 'Tronco navideno de chocolate blanco con frutos rojos', 320.00, NULL, 'resources/hero-panaderia.png', 2, 1, 8, 4.8, 45, true, 'Premium', NULL);

-- ===================================
-- datos iniciales - configuracion -bynd
-- ===================================
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('nombre_tienda', 'La Desesperanza', 'Nombre de la tienda'),
  ('envio_gratis_minimo', '500', 'Monto minimo para envio gratis'),
  ('costo_envio', '50', 'Costo de envio estandar'),
  ('tema_actual', 'navidad', 'Tema visual actual de la tienda'),
  ('telefono', '+52 55 1234 5678', 'Telefono de contacto'),
  ('email', 'hola@ladesesperanza.com', 'Email de contacto'),
  ('direccion', 'Ciudad de Mexico', 'Direccion fisica');

-- ===================================
-- vista para productos con info completa -bynd
-- ===================================
CREATE VIEW vista_productos AS
SELECT 
  p.id,
  p.nombre,
  p.descripcion,
  p.precio,
  p.precio_original,
  p.imagen,
  c.nombre AS categoria,
  t.nombre AS tema,
  p.stock,
  p.stock_minimo,
  p.rating,
  p.reviews_count,
  p.destacado,
  p.badge,
  p.descuento,
  p.activo,
  p.created_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN temas t ON p.tema_id = t.id;

-- ===================================
-- vista para dashboard admin -bynd
-- ===================================
CREATE VIEW vista_dashboard AS
SELECT
  (SELECT COUNT(*) FROM pedidos WHERE DATE(created_at) = CURRENT_DATE) AS pedidos_hoy,
  (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE DATE(created_at) = CURRENT_DATE) AS ventas_hoy,
  (SELECT COUNT(*) FROM productos WHERE destacado = true) AS productos_destacados,
  (SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo) AS alertas_inventario;

-- ===================================
-- vista para alertas de inventario -bynd
-- ===================================
CREATE VIEW vista_alertas_inventario AS
SELECT 
  id,
  nombre AS producto,
  stock AS stock_actual,
  stock_minimo,
  CASE 
    WHEN stock <= stock_minimo * 0.3 THEN 'critico'
    WHEN stock <= stock_minimo THEN 'advertencia'
    ELSE 'info'
  END AS severidad,
  CASE 
    WHEN stock <= stock_minimo * 0.3 THEN 'Stock critico - Reabastecer inmediatamente'
    WHEN stock <= stock_minimo THEN 'Stock bajo - Considerar reabastecimiento'
    ELSE 'Proximo a agotarse'
  END AS mensaje
FROM productos
WHERE stock <= stock_minimo * 1.2 AND activo = true
ORDER BY 
  CASE 
    WHEN stock <= stock_minimo * 0.3 THEN 1
    WHEN stock <= stock_minimo THEN 2
    ELSE 3
  END;

-- ===================================
-- fin del script -bynd
-- ===================================
