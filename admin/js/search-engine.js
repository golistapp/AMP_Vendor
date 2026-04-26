// admin/js/search-engine.js

document.addEventListener('DOMContentLoaded', runMasterSearch);

function runMasterSearch() {
    const searchInput = document.getElementById('masterSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const searchList = document.getElementById('masterSearchList');
    
    if(!searchInput || !statusFilter || !searchList) return;

    let query = searchInput.value.toLowerCase().trim();
    let filterVal = statusFilter.value;

    let orders = JSON.parse(localStorage.getItem('amp_orders')) || [];
    let vendors = JSON.parse(localStorage.getItem('amp_vendors')) || [];

    // Clear current list
    searchList.innerHTML = '';

    // Filter Logic
    let filteredOrders = orders.filter(order => {
        // Get Vendor Details to enable searching by Vendor Name or Mobile
        let vendor = vendors.find(v => v.id === order.vendorId) || { name: 'Unknown', mobile: 'N/A' };
        
        let matchQuery = order.orderId.toLowerCase().includes(query) || 
                         order.productName.toLowerCase().includes(query) ||
                         vendor.name.toLowerCase().includes(query) ||
                         vendor.mobile.includes(query);

        let matchStatus = (filterVal === 'All') || (order.status === filterVal);

        return matchQuery && matchStatus;
    });

    if(filteredOrders.length === 0) {
        searchList.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">No records found</td></tr>`;
        return;
    }

    // Render Results
    filteredOrders.forEach(order => {
        let vendor = vendors.find(v => v.id === order.vendorId) || { name: 'Unknown', mobile: '' };
        
        // Dynamic status color
        let statusColor = '#333';
        if(order.status === 'Assigned') statusColor = 'orange';
        if(order.status === 'Dispatched') statusColor = 'blue';
        if(order.status === 'Delivered') statusColor = 'green';
        if(order.status === 'Return') statusColor = 'red';

        searchList.innerHTML += `
            <tr>
                <td><b>#${order.orderId}</b></td>
                <td>${order.productName}</td>
                <td>${vendor.name} <br><small>${vendor.mobile}</small></td>
                <td>${order.date}</td>
                <td style="color: ${statusColor}; font-weight: 600;">${order.status}</td>
                <td>
                    <button onclick="updateOrderStatus('${order.orderId}')" class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem; background: var(--primary-green);">
                        Update Status
                    </button>
                    <a href="https://wa.me/91${vendor.mobile}" target="_blank" class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem; background: #25D366; text-decoration:none;">
                        <i class="fa-brands fa-whatsapp"></i> Chat
                    </a>
                </td>
            </tr>
        `;
    });
}

function updateOrderStatus(orderId) {
    let orders = JSON.parse(localStorage.getItem('amp_orders')) || [];
    let orderIndex = orders.findIndex(o => o.orderId === orderId);

    if(orderIndex !== -1) {
        let newStatus = prompt("Enter new status (Assigned, Dispatched, Delivered, Return):", orders[orderIndex].status);
        
        if(newStatus) {
            orders[orderIndex].status = newStatus;
            localStorage.setItem('amp_orders', JSON.stringify(orders));
            runMasterSearch(); // Reload table
            updateDashboardStats(); // Refresh Dashboard stats
            alert(`Order #${orderId} status updated to ${newStatus}`);
        }
    }
}
