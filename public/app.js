// ey este es el js principal de la panaderia -bynd

// estado global de la app -bynd
const AppState = {
  usuario: null,
  carrito: [],
  productos: []
};

// inicializar app -bynd
document.addEventListener('DOMContentLoaded', () => {
  cargarEstadoLocal();
  actualizarUI();
  cargarProductosDestacados();
  configurarEventos();
});

// cargar estado desde localStorage -bynd
function cargarEstadoLocal() {
  try {
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      AppState.usuario = JSON.parse(usuario);
    }
    
    const carrito = localStorage.getItem('carrito');
    if (carrito) {
      AppState.carrito = JSON.parse(carrito);
    }
  } catch (error) {
    console.error('Error cargando estado local:', error);
  }
}

// guardar estado en localStorage -bynd
function guardarEstadoLocal() {
  try {
    if (AppState.usuario) {
      localStorage.setItem('usuario', JSON.stringify(AppState.usuario));
    } else {
      localStorage.removeItem('usuario');
    }
    localStorage.setItem('carrito', JSON.stringify(AppState.carrito));
  } catch (error) {
    console.error('Error guardando estado local:', error);
  }
}

// actualizar elementos de la UI segun el estado -bynd
function actualizarUI() {
  // actualizar badge del carrito -bynd
  const cartBadge = document.getElementById('cartBadge');
  if (cartBadge) {
    const totalItems = AppState.carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
  }
  
  // actualizar boton de usuario -bynd
  const userBtn = document.getElementById('userBtn');
  if (userBtn) {
    if (AppState.usuario) {
      userBtn.textContent = AppState.usuario.nombre;
      userBtn.href = '#';
      userBtn.onclick = (e) => {
        e.preventDefault();
        cerrarSesion();
      };
    } else {
      userBtn.textContent = 'Iniciar Sesión';
      userBtn.href = 'login.html';
      userBtn.onclick = null;
    }
  }
  
  // mostrar link de admin si es admin -bynd
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    if (AppState.usuario && AppState.usuario.rol === 'admin') {
      adminLink.style.display = 'inline-block';
    } else {
      adminLink.style.display = 'none';
    }
  }
}

// cargar productos destacados desde el API -bynd
async function cargarProductosDestacados() {
  const grid = document.getElementById('featuredProductsGrid');
  if (!grid) return;
  
  try {
    const response = await fetch('/api/productos/destacados');
    const productos = await response.json();
    AppState.productos = productos;
    
    grid.innerHTML = productos.map(producto => crearProductoCard(producto)).join('');
    
    // agregar eventos a los botones -bynd
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const producto = productos.find(p => p.id === id);
        if (producto) {
          agregarAlCarrito(producto);
        }
      });
    });
  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.innerHTML = '<p>Error cargando productos. Intenta de nuevo.</p>';
  }
}

// crear HTML de un producto card -bynd
function crearProductoCard(producto) {
  const estrellas = '*'.repeat(Math.floor(producto.rating));
  
  return `
    <div class="product-card">
      <div class="product-image">
        <img src="${producto.imagen}" alt="${producto.nombre}">
        ${producto.badge ? `<span class="product-badge">${producto.badge}</span>` : ''}
        ${producto.descuento ? `<span class="product-discount">-${producto.descuento}%</span>` : ''}
      </div>
      <div class="product-info">
        <h3>${producto.nombre}</h3>
        <p class="description">${producto.descripcion}</p>
        <div class="product-rating">
          <span class="stars">${estrellas}</span>
          <span class="count">(${producto.reviews})</span>
        </div>
        <div class="product-footer">
          <div class="product-price">
            ${producto.precioOriginal ? `<span class="original">$${parseFloat(producto.precioOriginal).toFixed(2)}</span>` : ''}
            <span class="current">$${parseFloat(producto.precio).toFixed(2)}</span>
          </div>
          <button class="add-to-cart-btn" data-id="${producto.id}">+</button>
        </div>
      </div>
    </div>
  `;
}

// agregar producto al carrito -bynd
function agregarAlCarrito(producto, cantidad = 1) {
  const itemExistente = AppState.carrito.find(item => item.id === producto.id);
  
  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    AppState.carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: cantidad
    });
  }
  
  guardarEstadoLocal();
  actualizarUI();
  mostrarToast(`${producto.nombre} agregado al carrito`);
}

// remover producto del carrito -bynd
function removerDelCarrito(productoId) {
  AppState.carrito = AppState.carrito.filter(item => item.id !== productoId);
  guardarEstadoLocal();
  actualizarUI();
}

// actualizar cantidad en el carrito -bynd
function actualizarCantidad(productoId, nuevaCantidad) {
  if (nuevaCantidad <= 0) {
    removerDelCarrito(productoId);
    return;
  }
  
  const item = AppState.carrito.find(item => item.id === productoId);
  if (item) {
    item.cantidad = nuevaCantidad;
    guardarEstadoLocal();
    actualizarUI();
  }
}

// obtener total del carrito -bynd
function obtenerTotalCarrito() {
  return AppState.carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

// mostrar toast notification -bynd
function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  if (toast && toastMessage) {
    toastMessage.textContent = mensaje;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

// configurar eventos globales -bynd
function configurarEventos() {
  // menu movil -bynd
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      mobileMenuBtn.innerHTML = mobileMenu.classList.contains('active') ? 'X' : '=';
    });
  }
}

// funciones de autenticacion -bynd

// login -bynd
async function login(email, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      AppState.usuario = data.usuario;
      guardarEstadoLocal();
      actualizarUI();
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// registro -bynd
async function registro(nombre, email, password) {
  try {
    const response = await fetch('/api/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombre, email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      AppState.usuario = data.usuario;
      guardarEstadoLocal();
      actualizarUI();
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error en registro:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

// cerrar sesion -bynd
function cerrarSesion() {
  AppState.usuario = null;
  guardarEstadoLocal();
  actualizarUI();
  mostrarToast('Sesión cerrada');
  
  // si estamos en admin, redirigir -bynd
  if (window.location.pathname.includes('admin')) {
    window.location.href = 'index.html';
  }
}

// verificar si el usuario es admin -bynd
function esAdmin() {
  return AppState.usuario && AppState.usuario.rol === 'admin';
}

// exponer funciones globalmente para usar en otras paginas -bynd
window.AppState = AppState;
window.agregarAlCarrito = agregarAlCarrito;
window.removerDelCarrito = removerDelCarrito;
window.actualizarCantidad = actualizarCantidad;
window.obtenerTotalCarrito = obtenerTotalCarrito;
window.mostrarToast = mostrarToast;
window.login = login;
window.registro = registro;
window.cerrarSesion = cerrarSesion;
window.esAdmin = esAdmin;
window.cargarEstadoLocal = cargarEstadoLocal;
window.guardarEstadoLocal = guardarEstadoLocal;
window.actualizarUI = actualizarUI;
window.crearProductoCard = crearProductoCard;
