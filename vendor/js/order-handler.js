// vendor/js/order-handler.js

document.addEventListener('DOMContentLoaded', loadVendorData);

function loadVendorData() {
    if(!loggedInVendor) return;

    // 1. Pehle Products load karo (Earnings, Names aur Images ke liye)
    db.ref('products').once('value', (prodSnapshot) => {
        const allProducts = [];
        if(prodSnapshot.exists()) {
            prodSnapshot.forEach(child => { allProducts.push(child.val()); });
        }

        // 2. Ab Orders ko Real-time listen karo
        db.ref('orders').on('value', (orderSnapshot) => {
            const vendorOrders = [];
            
            if(orderSnapshot.exists()) {
                orderSnapshot.forEach(child => {
                    const order = child.val();
                    order.key = child.key; 
                    
                    // Sirf is logged-in vendor ke orders filter karo
                    if(order.vendorId === loggedInVendor.id) {
                        vendorOrders.push(order);
                    }
                });
            }

            renderVendorOrders(vendorOrders, allProducts);
            updateVendorDashboard(vendorOrders, allProducts);
        });
    });
}

// ----------------------------------------------------
// 1. RENDER ORDERS LIST (With Product Image)
// ----------------------------------------------------
function renderVendorOrders(orders, products) {
    const orderList = document.getElementById('vendorOrderList');
    if(!orderList) return;
    
    orderList.innerHTML = '';

    if(orders.length === 0) {
        orderList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #888;">
                <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
                <p>No orders assigned to you yet.</p>
            </div>
        `;
        return;
    }

    // Latest orders top par dikhane ke liye sort karein
    orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    orders.forEach(order => {
        let actionButtons = '';
        let statusColor = '#333';
        let statusBg = '#eee';

        if(order.status === 'Assigned') {
            statusColor = '#d97706'; 
            statusBg = '#fef3c7';
            actionButtons = `
                <button onclick="updateOrderStatus('${order.key}', 'Accepted')" style="flex:1; background:var(--primary-green); color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                    <i class="fa-solid fa-check"></i> Accept
                </button>
                <button onclick="updateOrderStatus('${order.key}', 'Rejected')" style="flex:1; background:#dc2626; color:white; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer;">
                    <i class="fa-solid fa-xmark"></i> Reject
                </button>
            `;
        } else if(order.status === 'Accepted') {
            statusColor = '#2563eb';
            statusBg = '#dbeafe';
            actionButtons = `
                <button onclick="updateOrderStatus('${order.key}', 'Dispatched')" style="width:100%; background:var(--accent-gold); color:#000; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer;">
                    <i class="fa-solid fa-truck-fast"></i> Mark Dispatched
                </button>
            `;
        } else if(order.status === 'Dispatched') {
            statusColor = '#16a34a';
            statusBg = '#dcfce7';
            actionButtons = `
                <div style="width:100%; text-align:center; background:#f3f4f6; color:#9ca3af; padding:12px; border-radius:8px; font-weight:600;">
                    <i class="fa-solid fa-clock"></i> Waiting for Delivery
                </div>
            `;
        } else if(order.status === 'Delivered') {
            statusColor = '#16a34a';
            statusBg = '#dcfce7';
            actionButtons = `<p style="text-align:center; width:100%; color:var(--primary-green); font-weight:bold;">Delivery Complete ✅</p>`;
        }

        // 🖼️ Pata lagao ki is order ka product kaunsa hai taaki Image nikal sakein
        let productDetails = products.find(p => p.id === order.productId);
        let productImg = productDetails && productDetails.image ? productDetails.image : '';

        // Image ka HTML (Agar image nahi hai to default box icon dikhayega)
        let imgHtml = productImg ? 
            `<img src="${productImg}" style="width: 75px; height: 75px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">` : 
            `<div style="width: 75px; height: 75px; border-radius: 8px; background: #f3f4f6; display:flex; align-items:center; justify-content:center; color:#9ca3af; border: 1px solid #eee;"><i class="fa-solid fa-box" style="font-size: 1.5rem;"></i></div>`;

        orderList.innerHTML += `
            <div style="background:var(--card-bg); padding:18px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.04); border-left: 5px solid ${statusColor};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <span style="font-weight:800; color:var(--text-dark); font-size:1.1rem;">#${order.orderId}</span>
                    <span style="font-size:0.75rem; font-weight:700; color:${statusColor}; background:${statusBg}; padding:5px 12px; border-radius:12px;">
                        ${order.status.toUpperCase()}
                    </span>
                </div>
                
                <div style="display:flex; gap: 15px; margin-bottom: 18px; align-items: center;">
                    ${imgHtml}
                    <div>
                        <h4 style="color:var(--primary-green); margin-bottom:4px; font-size: 1.05rem;">${order.productName}</h4>
                        <p style="font-size:0.85rem; color:#666; margin:0;">
                            <i class="fa-solid fa-location-dot" style="color:var(--accent-gold);"></i> Pincode: <b>${order.pincode}</b><br>
                            <small>Date: ${order.date || 'N/A'}</small>
                        </p>
                    </div>
                </div>
                
                <div style="display:flex; gap:10px;">${actionButtons}</div>
            </div>
        `;
    });
}

// ----------------------------------------------------
// 2. STATUS UPDATE (Realtime Database Update)
// ----------------------------------------------------
async function updateOrderStatus(orderKey, newStatus) {
    if(newStatus === 'Rejected' && !confirm("Reject this order? Admin will be notified.")) return;

    try {
        await db.ref('orders/' + orderKey).update({ status: newStatus });
        if(newStatus === 'Dispatched') alert('🎉 Order Dispatched!');
    } catch (error) {
        alert("🚨 Status update failed.");
    }
}

// ----------------------------------------------------
// 3. DASHBOARD STATS
// ----------------------------------------------------
function updateVendorDashboard(orders, products) {
    let totalOrders = orders.length;
    let pendingOrders = orders.filter(o => o.status === 'Assigned' || o.status === 'Accepted').length;
    let earnings = 0;

    orders.forEach(order => {
        if(order.status === 'Dispatched' || order.status === 'Delivered') {
            let product = products.find(p => p.id === order.productId);
            if(product) earnings += parseFloat(product.vendPrice);
        }
    });

    const elTotal = document.getElementById('vendor-total-orders');
    const elPending = document.getElementById('vendor-pending-orders');
    const elEarnings = document.getElementById('vendor-earnings');

    if(elTotal) elTotal.innerText = totalOrders;
    if(elPending) elPending.innerText = pendingOrders;
    if(elEarnings) elEarnings.innerText = '₹' + earnings.toLocaleString('en-IN');
}
