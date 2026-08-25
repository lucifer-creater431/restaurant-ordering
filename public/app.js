let lastOrderCount = 0;

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const json = await res.json();
    const tbody = document.getElementById('orders-list');
    if (!tbody) return;

    let orders = json.data || json || [];

    // Sound alert on new incoming order
    if (orders.length > lastOrderCount && lastOrderCount !== 0) {
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
    }
    lastOrderCount = orders.length;

    if (!Array.isArray(orders) || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-orders">No active orders.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.customer_phone || 'N/A'}</td>
        <td>${order.delivery_address || 'N/A'}</td>
        <td>Rs. ${order.total_amount || 0}</td>
        <td><span class="status ${order.status}">${(order.status || 'pending').toUpperCase()}</span></td>
        <td>
          <button onclick="updateStatus(${order.id}, 'confirmed')">Confirm</button>
          <button onclick="updateStatus(${order.id}, 'delivered')">Deliver</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

async function updateStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchOrders();
  } catch (err) {
    console.error('Update status error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchOrders();
  setInterval(fetchOrders, 3000);
});