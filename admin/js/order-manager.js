// admin/js/order-manager.js

document.addEventListener('DOMContentLoaded', loadAdminOrders);

let globalProducts = [];
let globalVendors = [];

function loadAdminOrders() {
    const orderList = document.getElementById('adminOrderList');
    if(!orderList) return;

    // 1. Fetch Products
    db.ref('products').on('value', (pSnap) => {
        globalProducts = [];
        if(pSnap.exists()) pSnap.forEach(child => globalProducts.push(child.val()));

        // 2. Fetch Vendors
        db.ref('vendors').on('value', (vSnap) => {
            globalVendors = [];
            if(vSnap.exists()) {
                vSnap.forEach(child => {
                    let v = child.val();
                    v.key = child.key;
                    globalVendors.push(v);
                });
            }

            // 3. Fetch Orders
            db.ref('orders').on('value', (oSnap) => {
                orderList.innerHTML = '';
                
                if(!oSnap.exists()) {
                    orderList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No orders found in the system.</td></tr>';
                    return;
                }

                let ordersArray = [];
                oSnap.forEach(child => ordersArray.push({ key: child.key, ...child.val() }));
                ordersArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Latest first

                ordersArray.forEach(order => {
                    // Match Product & Vendor Details
                    let prod = globalProducts.find(p => p.id === order.productId) || {};
                    let vend = globalVendors.find(v => v.id === order.vendorId) || {};

                    // Images (Default fallback if no image)
                    let prodImg = prod.image ? `<img src="${prod.image}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid #ddd;">` : `<div style="width:40px; height:40px; border-radius:6px; background:#eee; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-box"></i></div>`;
                    
                    let vendImg = vend.image ? `<img src="${vend.image}" style="width:35px; height:35px; border-radius:50%; object-fit:cover; border:2px solid var(--accent-gold);">` : `<div style="width:35px; height:35px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; border:2px solid var(--accent-gold);"><i class="fa-solid fa-store"></i></div>`;

                    let statusColor = '#333'; let statusBg = '#eee'; let actionBtn = '';

                    if(order.status === 'Assigned') { statusColor = '#d97706'; statusBg = '#fef3c7'; }
                    else if(order.status === 'Accepted') { statusColor = '#2563eb'; statusBg = '#dbeafe'; }
                    else if(order.status === 'Dispatched') { 
                        statusColor = '#16a34a'; statusBg = '#dcfce7'; 
                        actionBtn = `<button onclick="markOrderDelivered('${order.key}', '${order.productId}')" style="background: var(--primary-green); color: white; border: none; padding: 6px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size:0.8rem; margin-bottom:5px;"><i class="fa-solid fa-check-double"></i> Delivered</button><br>`;
                    }
                    else if(order.status === 'Delivered') { statusColor = '#16a34a'; statusBg = '#dcfce7'; }
                    else if(order.status === 'Rejected') { statusColor = '#dc2626'; statusBg = '#fee2e2'; }

                    // Details Button (Always visible)
                    let safeOrder = encodeURIComponent(JSON.stringify(order));
                    let detailsBtn = `<button onclick="openOrderDetails('${safeOrder}')" style="background: #f3f4f6; color: #333; border: 1px solid #ddd; padding: 6px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size:0.8rem;"><i class="fa-solid fa-circle-info text-gold"></i> Details</button>`;

                    orderList.innerHTML += `
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td>
                                <b style="color:var(--text-dark); font-size:1.05rem;">#${order.orderId}</b><br>
                                <small style="color:#888;">${order.date || 'N/A'}</small>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    ${prodImg}
                                    <div>
                                        <b style="color:var(--primary-green);">${order.productName}</b><br>
                                        <small style="color:#666;"><i class="fa-solid fa-location-dot text-gold"></i> PIN: <b>${order.pincode}</b></small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="display:flex; align-items:center; gap:8px; background: rgba(242, 179, 40, 0.1); padding: 5px 8px; border-radius: 8px;">
                                    ${vendImg}
                                    <div>
                                        <span style="color: #b47f00; font-size: 0.85rem; font-weight: bold;">${order.vendorId}</span><br>
                                        <span style="font-size: 0.75rem; color:#666;">${vend.shop || 'Unknown'}</span>
                                    </div>
                                </div>
                            </td>
                            <td><span style="color:${statusColor}; background:${statusBg}; padding:5px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">${order.status}</span></td>
                            <td style="vertical-align: middle; text-align:center;">${actionBtn} ${detailsBtn}</td>
                        </tr>
                    `;
                });
            });
        });
    });
}

// 🟢 MODAL LOGIC & WHATSAPP INTEGRATION
function openOrderDetails(encodedOrder) {
    const order = JSON.parse(decodeURIComponent(encodedOrder));
    const prod = globalProducts.find(p => p.id === order.productId) || {};
    const vend = globalVendors.find(v => v.id === order.vendorId) || {};

    const content = document.getElementById('orderDetailsContent');
    
    // 🔴 BUG FIX: Properly formatted and URL encoded WhatsApp Message
    let quantity = order.quantity || 1; // Default to 1 if quantity is not explicitly set
    
    let rawMessage = `Hello ${vend.name || 'Vendor'},

*Order Update from AMP KART*
Order ID: ${order.orderId}
Product ID: ${order.productId}
Product Name: ${order.productName}
Quantity: ${quantity}

Please confirm this order: Accept or Reject.`;

    // encodeURIComponent converts special characters like spaces, newlines, and '#' into web-safe formats
    let waLink = vend.mobile ? `https://wa.me/91${vend.mobile}?text=${encodeURIComponent(rawMessage)}` : '#';

    // Google Maps Link
    let mapLink = (vend.lat && vend.lng) ? `https://www.google.com/maps/search/?api=1&query=${vend.lat},${vend.lng}` : '#';
    let mapBtnHtml = (vend.lat && vend.lng) ? `<a href="${mapLink}" target="_blank" style="background:#eef2ff; color:#2563eb; padding:8px 12px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:0.85rem; display:inline-block; margin-top:5px;"><i class="fa-solid fa-map-location-dot"></i> Check Map Location</a>` : `<span style="color:#dc2626; font-size:0.8rem;">📍 Location Not Linked</span>`;

    content.innerHTML = `
        <div style="margin-bottom: 15px;">
            <p style="font-size:0.85rem; color:#888; margin-bottom:3px;">Product Info</p>
            <div style="display:flex; align-items:center; gap:15px; background:#f9fbf9; padding:10px; border-radius:8px; border:1px solid #eee;">
                ${prod.image ? `<img src="${prod.image}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;">` : ''}
                <div>
                    <h4 style="color:var(--primary-green); margin:0;">${order.productName}</h4>
                    <p style="margin:0; font-size:0.85rem; color:#666;">ID: ${order.productId}</p>
                    <p style="margin:0; font-size:0.85rem; color:#666;">Quantity: <b>${quantity}</b></p>
                    <p style="margin:0; font-size:0.85rem; color:#666;">Customer PIN: <b>${order.pincode}</b></p>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <p style="font-size:0.85rem; color:#888; margin-bottom:3px;">Assigned Vendor</p>
            <div style="background:#fffaf0; padding:10px; border-radius:8px; border:1px solid #fde68a;">
                <h4 style="color:#b47f00; margin:0 0 5px 0;">${vend.shop || 'Shop Unknown'} (${order.vendorId})</h4>
                <p style="margin:0; font-size:0.9rem;">👤 Owner: <b>${vend.name || 'N/A'}</b></p>
                <p style="margin:0; font-size:0.9rem;">📞 Mobile: <b>${vend.mobile || 'N/A'}</b></p>
                ${mapBtnHtml}
            </div>
        </div>

        <a href="${waLink}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:10px; background:#16a34a; color:white; text-decoration:none; padding:12px; border-radius:8px; font-weight:bold; box-shadow:0 4px 6px rgba(22,163,74,0.2);">
            <i class="fa-brands fa-whatsapp" style="font-size:1.2rem;"></i> Send WhatsApp Message
        </a>
    `;

    document.getElementById('orderDetailsModal').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

// 🟢 ADMIN ACTION: Mark Delivered + Deduct Stock Logic
async function markOrderDelivered(orderKey, productId) {
    if(confirm("Confirm delivery? This will also automatically DEDUCT 1 QUANTITY from the product's stock.")) {
        try {
            // 1. Update Order Status
            await db.ref('orders/' + orderKey).update({ status: 'Delivered' });

            // 2. Auto-Deduct Inventory Stock
            const prodRef = db.ref('products').orderByChild('id').equalTo(productId);
            prodRef.once('value', snapshot => {
                if(snapshot.exists()) {
                    snapshot.forEach(child => {
                        let currentStock = child.val().stock || 0;
                        let newStock = currentStock > 0 ? currentStock - 1 : 0; // Negative na ho
                        db.ref('products/' + child.key).update({ stock: newStock });
                    });
                }
            });

            alert("✅ Order marked as Delivered & 1 Stock Deducted!");
        } catch(error) {
            alert("🚨 Error updating order: " + error.message);
        }
    }
}
