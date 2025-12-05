// ey este es el js del admin dashboard -bynd

// inicializar pagina de admin -bynd
document.addEventListener('DOMContentLoaded', () => {
  verificarAcceso();
});

// verificar si el usuario tiene acceso de admin -bynd
function verificarAcceso() {
  const accessDenied = document.getElementById('accessDenied');
  const dashboardContent = document.getElementById('dashboardContent');
  
  if (!esAdmin()) {
    accessDenied.style.display = 'block';
    dashboardContent.style.display = 'none';
    return;
  }
  
  accessDenied.style.display = 'none';
  dashboardContent.style.display = 'block';
  
  cargarDashboard();
}

// cargar datos del dashboard -bynd
async function cargarDashboard() {
  try {
    const response = await fetch('/api/admin/dashboard');
    const data = await response.json();
    
    renderizarMetricas(data.metricas);
    renderizarPedidos(data.pedidosRecientes);
    renderizarAlertas(data.alertasInventario);
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    mostrarToast('Error cargando datos del dashboard');
  }
}

// renderizar tarjetas de metricas -bynd
function renderizarMetricas(metricas) {
  const grid = document.getElementById('metricsGrid');
  
  const iconos = {
    'ventas-dia': '$',
    'pedidos': '#',
    'productos-pop': '*',
    'alertas': '!'
  };
  
  grid.innerHTML = metricas.map(metrica => `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">${metrica.titulo}</span>
        <div class="metric-icon">${iconos[metrica.id] || '?'}</div>
      </div>
      <div class="metric-value">${metrica.valor}</div>
      <div class="metric-change ${metrica.tipo}">
        ${metrica.tipo === 'positivo' ? '↑' : '↓'} ${metrica.cambio}
      </div>
    </div>
  `).join('');
}

// renderizar tabla de pedidos -bynd
function renderizarPedidos(pedidos) {
  const tbody = document.getElementById('ordersTableBody');
  
  tbody.innerHTML = pedidos.map(pedido => `
    <tr>
      <td><strong>${pedido.id}</strong></td>
      <td>${pedido.cliente}</td>
      <td>${pedido.items}</td>
      <td>$${pedido.total.toFixed(2)}</td>
      <td><span class="status-badge ${pedido.estado}">${pedido.estado}</span></td>
      <td>${pedido.fecha}</td>
    </tr>
  `).join('');
}

// renderizar alertas de inventario -bynd
function renderizarAlertas(alertas) {
  const lista = document.getElementById('alertsList');
  
  if (alertas.length === 0) {
    lista.innerHTML = '<p style="padding: 1.5rem; text-align: center; color: var(--color-muted);">No hay alertas de inventario</p>';
    return;
  }
  
  lista.innerHTML = alertas.map(alerta => `
    <div class="alert-item">
      <div class="alert-icon ${alerta.severidad}">
        ${alerta.severidad === 'critico' ? '!!' : '!'}
      </div>
      <div class="alert-content">
        <h4>${alerta.producto}</h4>
        <p>${alerta.mensaje}</p>
        <span class="stock">Stock actual: ${alerta.stockActual} / Mínimo: ${alerta.stockMinimo}</span>
      </div>
    </div>
  `).join('');
}
