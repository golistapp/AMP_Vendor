// admin/js/order-engine.js

async function findVendors(e) {
    e.preventDefault();
    
    const prodId = document.getElementById('searchProdId').value.trim();
    const pincode = document.getElementById('searchPincode').value.trim();
    const btn = e.target.querySelector('button');
    const originalBtnText = btn.innerHTML;
    
    // UI Loading State
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Calculating Distances...`;

    const container = document.getElementById('suggestedVendorsContainer');
    const list = document.getElementById('vendorSuggestionList');
    container.style.display = 'none';

    try {
        // 1. CHECK PRODUCT IN FIREBASE
        const prodSnapshot = await db.ref('products').orderByChild('id').equalTo(prodId).once('value');
        if (!prodSnapshot.exists()) {
            alert("🚨 Error: Product ID not found in system!");
            return;
        }
        
        let productData;
        prodSnapshot.forEach(child => productData = child.val());

        // 2. CONVERT PINCODE TO LAT/LNG (OpenStreetMap API - 100% Free)
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&countrycodes=IN&format=json`);
        const geoData = await geoResponse.json();

        let customerLat = null;
        let customerLng = null;

        // Agar pincode API me mil gaya
        if (geoData && geoData.length > 0) {
            customerLat = parseFloat(geoData[0].lat);
            customerLng = parseFloat(geoData[0].lon);
        }

        // 3. FETCH ALL VENDORS
        const vendSnapshot = await db.ref('vendors').once('value');
        if (!vendSnapshot.exists()) {
            alert("🚨 No vendors registered in the system!");
            return;
        }

        let vendors = [];
        vendSnapshot.forEach(child => {
            let v = child.val();
            v.key = child.key;
            vendors.push(v);
        });

        // 4. CALCULATE DISTANCE FOR EACH VENDOR
        vendors.forEach(v => {
            if (customerLat && customerLng && v.lat && v.lng) {
                // Geo-Location Distance in KM
                v.distance = calculateDistance(customerLat, customerLng, parseFloat(v.lat), parseFloat(v.lng));
            } else {
                // Fallback: Agar exact coordinates na mile, to direct pincode match karo
                v.distance = (v.pincode === pincode) ? 0 : 9999;
            }
        });

        // Sort by Shortest Distance
        vendors.sort((a, b) => a.distance - b.distance);

        // Sirf un vendors ko dikhao jo 50km ke andar hain, ya jinka exact pincode match ho
        let validVendors = vendors.filter(v => v.distance <= 50 || v.pincode === pincode);

        // 5. RENDER THE LIST
        renderSuggestedVendors(validVendors, productData, pincode);

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
    const R = 6371; // Earth's Radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Returns distance in KM
}

// 📦 RENDER UI
function renderSuggestedVendors(vendors, product, pincode) {
    const container = document.getElementById('suggestedVendorsContainer');
    const list = document.getElementById('vendorSuggestionList');
    
    container.style.display = 'block';
    list.innerHTML = '';

    if (vendors.length === 0) {
        list.innerHTML = `<div style="color:red; padding:15px; background:#ffe6e6; border-radius:8px; border: 1px solid red;">🚨 No serviceable vendors found near Pincode: ${pincode}</div>`;
        return;
    }

    vendors.forEach(vend => {
        let distanceHtml = '';
        if (vend.distance === 0 && vend.pincode === pincode) {
            distanceHtml = `<span style="color:green; font-weight:bold;">📍 Exact Pincode Match</span>`;
        } else if (vend.distance < 9999) {
            distanceHtml = `<span style="color:#d97706; font-weight:bold;">📍 ${vend.distance.toFixed(1)} km away</span>`;
        }

        list.innerHTML += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div>
                    <h4 style="color: var(--primary-green); margin-bottom: 5px;"><i class="fa-solid fa-store"></i> ${vend.shop}</h4>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 3px;">${vend.name} | ⭐ ${vend.rating.toFixed(1)} | ${distanceHtml}</p>
                    <p style="font-size: 0.85rem; font-weight: bold; color: var(--accent-gold);">Product: ${product.name}</p>
                </div>
                <div>
                    <button onclick="assignOrder('${vend.id}', '${product.id}', '${product.name}', '${pincode}', '${vend.mobile}')" class="btn-primary" style="background: var(--accent-gold); color: #000; box-shadow: none;">
                        Assign Order
                    </button>
                </div>
            </div>
        `;
    });
}

// 📲 FIREBASE ASSIGN & WHATSAPP TRIGGER
async function assignOrder(vendorId, productId, productName, pincode, vendorMobile) {
    let orderId = prompt("🚨 SYSTEM RULE: Enter Unique Order ID (e.g. ORD1001):");
    
    if (!orderId || orderId.trim() === "") {
        alert("Action Cancelled: Without Order ID, no action can be taken.");
        return;
    }

    const newOrder = {
        orderId: orderId,
        productId: productId,
        productName: productName,
        vendorId: vendorId,
        pincode: pincode,
        status: 'Assigned',
        date: new Date().toLocaleDateString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save to Firebase RTDB
        await db.ref('orders').push(newOrder);

        // Generate WhatsApp Message
        let message = `*AMP KART: New Order Assigned*%0A%0A*Order ID:* #${orderId}%0A*Product:* ${productName}%0A*Customer Pincode:* ${pincode}%0A%0A_Please check your AMP KART Vendor App and accept within 24 hours._`;
        let whatsappUrl = `https://wa.me/91${vendorMobile}?text=${message}`;
        window.open(whatsappUrl, '_blank');

        // Reset UI
        document.getElementById('orderSearchForm').reset();
        document.getElementById('suggestedVendorsContainer').style.display = 'none';

    } catch (error) {
        console.error("Order Save Error: ", error);
        alert("🚨 Failed to assign order in database.");
    }
}
