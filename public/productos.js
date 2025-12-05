// ey este es el js del catalogo de productos -bynd

let todosLosProductos = [];
let productosFiltrados = [];

// filtros actuales -bynd
let filtros = {
  busqueda: '',
  categoria: 'all',
  tema: 'all',
  precioMax: 1000,
  ordenar: 'destacados'
};

// inicializar pagina de productos -bynd
document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  configurarFiltros();
});

// cargar todos los productos desde el API -bynd
async function cargarProductos() {
  const grid = document.getElementById('productsGrid');
  
  try {
    const response = await fetch('/api/productos');
    todosLosProductos = await response.json();
    productosFiltrados = [...todosLosProductos];
    
    aplicarFiltros();
  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error cargando productos. Intenta de nuevo.</p>';
  }
}

// configurar eventos de filtros -bynd
function configurarFiltros() {
  // busqueda -bynd
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    filtros.busqueda = e.target.value.toLowerCase();
    aplicarFiltros();
  });
  
  // ordenar -bynd
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', (e) => {
    filtros.ordenar = e.target.value;
    aplicarFiltros();
  });
  
  // categoria -bynd
  document.querySelectorAll('input[name="categoria"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      filtros.categoria = e.target.value;
      aplicarFiltros();
    });
  });
  
  // tema -bynd
  document.querySelectorAll('input[name="tema"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      filtros.tema = e.target.value;
      aplicarFiltros();
    });
  });
  
  // precio -bynd
  const priceRange = document.getElementById('priceRange');
  const priceValue = document.getElementById('priceValue');
  priceRange.addEventListener('input', (e) => {
    filtros.precioMax = parseInt(e.target.value);
    priceValue.textContent = filtros.precioMax;
    aplicarFiltros();
  });
  
  // limpiar filtros -bynd
  const clearBtn = document.getElementById('clearFiltersBtn');
  clearBtn.addEventListener('click', limpiarFiltros);
}

// aplicar todos los filtros -bynd
function aplicarFiltros() {
  productosFiltrados = todosLosProductos.filter(producto => {
    // filtro de busqueda -bynd
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda;
      const nombreMatch = producto.nombre.toLowerCase().includes(busqueda);
      const descripcionMatch = producto.descripcion.toLowerCase().includes(busqueda);
      if (!nombreMatch && !descripcionMatch) return false;
    }
    
    // filtro de categoria -bynd
    if (filtros.categoria !== 'all' && producto.categoria !== filtros.categoria) {
      return false;
    }
    
    // filtro de tema -bynd
    if (filtros.tema !== 'all' && producto.tema !== filtros.tema) {
      return false;
    }
    
    // filtro de precio -bynd
    if (producto.precio > filtros.precioMax) {
      return false;
    }
    
    return true;
  });
  
  // ordenar productos -bynd
  switch (filtros.ordenar) {
    case 'precio-menor':
      productosFiltrados.sort((a, b) => a.precio - b.precio);
      break;
    case 'precio-mayor':
      productosFiltrados.sort((a, b) => b.precio - a.precio);
      break;
    case 'recientes':
      productosFiltrados.sort((a, b) => b.id - a.id);
      break;
    case 'destacados':
    default:
      productosFiltrados.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
      break;
  }
  
  renderizarProductos();
}

// renderizar productos en el grid -bynd
function renderizarProductos() {
  const grid = document.getElementById('productsGrid');
  const resultCount = document.getElementById('resultCount');
  
  resultCount.textContent = productosFiltrados.length;
  
  if (productosFiltrados.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem; color: var(--color-muted);">?</div>
        <h2>No se encontraron productos</h2>
        <p style="color: var(--color-muted); margin-bottom: 1.5rem;">Intenta ajustar tus filtros o búsqueda</p>
        <button onclick="limpiarFiltros()" class="btn-primary">Limpiar Filtros</button>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = productosFiltrados.map(producto => crearProductoCard(producto)).join('');
  
  // agregar eventos a los botones -bynd
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const producto = productosFiltrados.find(p => p.id === id);
      if (producto) {
        agregarAlCarrito(producto);
      }
    });
  });
}

// limpiar todos los filtros -bynd
function limpiarFiltros() {
  filtros = {
    busqueda: '',
    categoria: 'all',
    tema: 'all',
    precioMax: 1000,
    ordenar: 'destacados'
  };
  
  // resetear UI -bynd
  document.getElementById('searchInput').value = '';
  document.getElementById('sortSelect').value = 'destacados';
  document.getElementById('cat-all').checked = true;
  document.getElementById('tema-all').checked = true;
  document.getElementById('priceRange').value = 1000;
  document.getElementById('priceValue').textContent = '1000';
  
  aplicarFiltros();
}

// exponer funcion globalmente -bynd
window.limpiarFiltros = limpiarFiltros;
