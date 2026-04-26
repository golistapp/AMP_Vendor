// admin/js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', loadDashboardStats);

function loadDashboardStats() {
    // 1. Live Orders & Revenue Stats
    db.ref('orders').on('value', (ordersSnap) => {
        let totalOrders = 0;
        let pendingOrders = 0;
        let totalRevenue = 0;
        let ordersArray = [];

        if (ordersSnap.exists()) {
            ordersSnap.forEach(child => {
                let order = child.val();
                ordersArray.push(order);
                totalOrders++;
                
                if (order.status === 'Pending' || order.status === 'Assigned') {
                    pendingOrders++;
                }
            });
        }

        // Products load karo margin calculate karne ke liye
        db.ref('products').once('value', (prodSnap) => {
            let productsArray = [];
            if (prodSnap.exists()) {
                prodSnap.forEach(child => productsArray.push(child.val()));
            }

            ordersArray.forEach(order => {
                let product = productsArray.find(p => p.id === order.productId);
                if (product) {
                    totalRevenue += parseFloat(product.margin || 0);
                }
            });

            // Update UI
            const statTotal = document.getElementById('stat-total-orders');
            const statPending = document.getElementById('stat-pending');
            const statRev = document.getElementById('stat-revenue');

            if (statTotal) statTotal.innerText = totalOrders;
            if (statPending) statPending.innerText = pendingOrders;
            if (statRev) statRev.innerText = '₹' + totalRevenue.toLocaleString('en-IN');
        });
    });

    // 2. Live Vendor Count Stat (NEW 4th Box)
    db.ref('vendors').on('value', (vendSnap) => {
        let totalVendors = 0;
        if (vendSnap.exists()) {
            totalVendors = vendSnap.numChildren();
        }
        
        const vendorStatEl = document.getElementById('stat-total-vendors');
        if (vendorStatEl) vendorStatEl.innerText = totalVendors;
    });
}
