// admin/js/order-engine.js

async function findVendors(e) {
    e.preventDefault();
    
    const prodId = document.getElementById('searchProdId').value.trim();
    const pincode = document.getElementById('searchPincode').value.trim();
    const btn = e.target.querySelector('button');
    const originalBtnText = btn.innerHTML;
    
    // UI Loading State
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Finding Best Options...`;

    const container = document.getElementById('suggestedVendorsContainer');
    const list = document.getElementById('vendorSuggestionList');
    container.style.display = 'none';

    try {
        // 1. Ek hi ID wale saare products dhundho (Multi-Vendor System)
        const prodSnapshot = await db.ref('products').orderByChild('id').equalTo(prodId).once('value');
        if (!prodSnapshot.exists()) {
            alert("🚨 Error: No product found with this ID!");
            return;
        }
        
        let matchingProducts = [];
        prodSnapshot.forEach(child => {
            matchingProducts.push(child.val());
        });

        // 2. Customer Location nikaalo Pincode se
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&countrycodes=IN&format=json`);
        const geoData = await geoResponse.json();

        let customerLat = null;
        let customerLng = null;

        if (geoData && geoData.length > 0) {
            customerLat = parseFloat(geoData[0].lat);
            customerLng = parseFloat(geoData[0].lon);
        }

        // 3. Saare Vendors Fetch karo
        const vendSnapshot = await db.ref('vendors').once('value');
        if (!vendSnapshot.exists()) {
            alert("🚨 No vendors registered in the system!");
            return;
        }

        let allVendors = [];
        vendSnapshot.forEach(child => {
            let v = child.val();
            v.key = child.key;
            allVendors.push(v);
        });

        // 4. Products aur unke Vendors ko match karo aur Distance nikalo
        let suggestions = [];

        matchingProducts.forEach(prod => {
            // Find vendor who owns this specific product entry
            let vendor = allVendors.find(v => v.id === prod.vendorId);
            
            if (vendor) {
                let distance = 9999;
                
                if (customerLat && customerLng && vendor.lat && vendor.lng) {
                    // Geo-Location Distance in KM
                    distance = calculateDistance(customerLat, customerLng, parseFloat(vendor.lat), parseFloat(vendor.lng));
                } else if (vendor.pincode === pincode) {
                    distance = 0; // Exact pincode match
                }

                // Sirf serviceable area (50km) wale vendors dikhao
                if (distance <= 50 || vendor.pincode === pincode) {
                    suggestions.push({
                        product: prod,
                        vendor: vendor,
                        distance: distance
                    });
                }
            }
        });

        // 5. SMART SORTING LOGIC: (1st Priority: Nearest, 2nd Priority: Lowest Price)
        suggestions.sort((a, b) => {
            // Distance ko round off kiya taaki agar distance almost same ho toh price kaam aaye
            let distA = Math.round(a.distance);
            let distB = Math.round(b.distance);
            
            if (distA !== distB) {
                return distA - distB; // Pehle paas wala vendor
            }
            // Agar distance barabar hai, toh sasta vendor upar aayega
            return parseFloat(a.product.vendPrice || 0) - parseFloat(b.product.vendPrice || 0);
        });

        // 6. RENDER THE LIST
        renderSuggestedVendors(suggestions, pincode);

    } catch (error) {
        console.error("Order Engine Error:", error);
        alert("🚨 System Error: Please check your internet connection.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
    }
}

// 📐 HAVERSINE FORMULA (Distance Calculation in KM)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

// 📦 RENDER UI (Updated for Multiple Products)
function renderSuggestedVendors(suggestions, pincode) {
    const container = document.getElementById('suggestedVendorsContainer');
    const list = document.getElementById('vendorSuggestionList');
    
    container.style.display = 'block';
    list.innerHTML = '';

    if (suggestions.length === 0) {
        list.innerHTML = `<div style="color:red; padding:15px; background:#ffe6e6; border-radius:8px; border: 1px solid red;">🚨 No serviceable vendors found near Pincode: ${pincode} selling this product.</div>`;
        return;
    }

    suggestions.forEach(item => {
        const vend = item.vendor;
        const product = item.product;

        let distanceHtml = '';
        if (item.distance === 0 && vend.pincode === pincode) {
            distanceHtml = `<span style="color:green; font-weight:bold;">📍 Exact Pincode Match</span>`;
        } else if (item.distance < 9999) {
            distanceHtml = `<span style="color:#d97706; font-weight:bold;">📍 ${item.distance.toFixed(1)} km away</span>`;
        }

        // Safe Name Escape
        let safeVendName = vend.name ? vend.name.replace(/'/g, "\\'") : "Vendor";
        let safeProdName = product.name ? product.name.replace(/'/g, "\\'") : "Product";

        let prodImgHtml = product.image ? `<img src="${product.image}" style="width: 65px; height: 65px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">` : ``;

        list.innerHTML += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; gap: 15px; align-items: center;">
                    ${prodImgHtml}
                    <div>
                        <h4 style="color: var(--primary-green); margin-bottom: 5px;"><i class="fa-solid fa-store"></i> ${vend.shop}</h4>
                        <p style="font-size: 0.85rem; color: #666; margin-bottom: 3px;">${vend.name} | ⭐ ${(vend.rating || 5.0).toFixed(1)} | ${distanceHtml}</p>
                        <p style="font-size: 0.85rem; font-weight: bold; color: var(--accent-gold);">Product: ${product.name} <span style="background: rgba(22, 163, 74, 0.1); color: #16a34a; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">₹${product.vendPrice}</span></p>
                    </div>
                </div>
                <div>
                    <button onclick="openAssignModal('${vend.id}', '${product.id}', '${safeProdName}', '${pincode}', '${vend.mobile}', '${safeVendName}')" class="btn-primary" style="background: var(--accent-gold); color: #000; box-shadow: none;">
                        Assign Order
                    </button>
                </div>
            </div>
        `;
    });
}

// -----------------------------------------------------------------
// 🔴 CUSTOM POPUP & WHATSAPP LOGIC (Pehle Jaisa)
// -----------------------------------------------------------------
let pendingOrderData = null;

function openAssignModal(vendorId, productId, productName, pincode, vendorMobile, vendorName) {
    pendingOrderData = { vendorId, productId, productName, pincode, vendorMobile, vendorName };
    
    document.getElementById('modalOrderId').value = '';
    document.getElementById('modalQuantity').value = '1';
    
    document.getElementById('assignOrderModal').style.display = 'flex';
}

function closeAssignModal() {
    document.getElementById('assignOrderModal').style.display = 'none';
    pendingOrderData = null;
}

// 📲 FIREBASE ASSIGN & WHATSAPP TRIGGER
async function confirmOrderAssignment() {
    if(!pendingOrderData) return;

    let orderId = document.getElementById('modalOrderId').value.trim();
    let quantity = document.getElementById('modalQuantity').value.trim();

    if (!orderId) {
        alert("🚨 Please enter a valid Order ID!");
        return;
    }
    if (quantity <= 0) {
        alert("🚨 Quantity must be at least 1.");
        return;
    }

    const newOrder = {
        orderId: orderId,
        productId: pendingOrderData.productId,
        productName: pendingOrderData.productName,
        quantity: parseInt(quantity),
        vendorId: pendingOrderData.vendorId,
        pincode: pendingOrderData.pincode,
        status: 'Assigned',
        date: new Date().toLocaleDateString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save to Firebase RTDB
        await db.ref('orders').push(newOrder);

        // Formatted WhatsApp Message
        let rawMessage = `Hello ${pendingOrderData.vendorName},

*Order Update from AMP KART*
Order ID: ${orderId}
Product ID: ${pendingOrderData.productId}
Product Name: ${pendingOrderData.productName}
Quantity: ${quantity}

Please confirm this order: Accept or Reject.`;

        let whatsappUrl = `https://wa.me/91${pendingOrderData.vendorMobile}?text=${encodeURIComponent(rawMessage)}`;
        window.open(whatsappUrl, '_blank');

        document.getElementById('orderSearchForm').reset();
        document.getElementById('suggestedVendorsContainer').style.display = 'none';
        closeAssignModal();

    } catch (error) {
        console.error("Order Save Error: ", error);
        alert("🚨 Failed to assign order in database.");
    }
}
