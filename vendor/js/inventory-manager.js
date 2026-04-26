// vendor/js/inventory-manager.js

// Jab Stock tab par click ho, tab data fetch karein
function loadInventoryData() {
    if(!loggedInVendor) return;

    const stockList = document.getElementById('vendorStockList');
    if(!stockList) return;

    // Real-time listener sirf products ke liye
    db.ref('products').on('value', (snapshot) => {
        stockList.innerHTML = '';

        if(!snapshot.exists()) {
            stockList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #888;">
                    <i class="fa-solid fa-boxes-stacked" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
                    <p>No products assigned to your shop yet.</p>
                </div>`;
            return;
        }

        let myProducts = [];
        snapshot.forEach(child => {
            const prod = child.val();
            prod.key = child.key; 
            
            // Sirf is vendor ke products filter karein
            if(prod.vendorId === loggedInVendor.id) {
                myProducts.push(prod);
            }
        });

        if(myProducts.length === 0) {
            stockList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No stock found.</p>`;
            return;
        }

        myProducts.forEach(prod => {
            const currentStock = prod.stock || 0;
            // Agar stock 0 hai toh red border, nahi toh green
            const stockColor = currentStock > 0 ? '#16a34a' : '#dc2626'; 

            stockList.innerHTML += `
                <div style="background:var(--card-bg); padding:15px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 10px rgba(0,0,0,0.04); border-left: 4px solid ${stockColor};">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${prod.image}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
                        <div style="flex-grow: 1;">
                            <h4 style="color:var(--primary-green); margin-bottom: 2px;">${prod.name}</h4>
                            <p style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">ID: <b>${prod.id}</b></p>
                            <span style="background: rgba(242, 179, 40, 0.2); color: var(--primary-green); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">Shop Price: ₹${prod.vendPrice}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed #ddd; padding-top: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label style="font-size: 0.85rem; color: #666; font-weight: bold;">Stock Qty:</label>
                            
                            <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; background: #fff;">
                                <button onclick="changeStockVal('${prod.key}', -1)" style="background:#f9f9f9; border:none; padding:6px 12px; cursor:pointer; color:#dc2626; font-weight:bold; font-size:1.1rem;">-</button>
                                <input type="number" id="stockInput_${prod.key}" value="${currentStock}" min="0" style="width: 50px; padding: 6px; border: none; text-align: center; outline: none; font-weight: bold; border-left: 1px solid #ddd; border-right: 1px solid #ddd; background: #fff;" readonly>
                                <button onclick="changeStockVal('${prod.key}', 1)" style="background:#f9f9f9; border:none; padding:6px 12px; cursor:pointer; color:#16a34a; font-weight:bold; font-size:1.1rem;">+</button>
                            </div>
                        </div>

                        <button onclick="saveStock('${prod.key}')" id="saveBtn_${prod.key}" style="background: var(--primary-green); color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 5px rgba(24,65,36,0.2);">
                            <i class="fa-solid fa-floppy-disk"></i> Update
                        </button>
                    </div>
                </div>`;
        });
    });
}

// 🟢 Function: + / - Button par click karne se value change hogi
function changeStockVal(key, change) {
    const input = document.getElementById(`stockInput_${key}`);
    if(input) {
        let newVal = parseInt(input.value) + change;
        if(newVal < 0) newVal = 0; // Stock negative nahi ho sakta
        input.value = newVal;
    }
}

// 🟢 Function: Naya stock Firebase me save karein
async function saveStock(productKey) {
    const input = document.getElementById(`stockInput_${productKey}`);
    const btn = document.getElementById(`saveBtn_${productKey}`);
    
    if(!input || !btn) return;
    
    const newStock = parseInt(input.value);
    
    // Button ko loading state me daalein
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    btn.disabled = true;

    try {
        // Firebase me real-time update
        await db.ref('products/' + productKey).update({ stock: newStock });
        
        // 🔴 FIX: Update hone ke baad button wapas theek hoga aur Notification aayega
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update`;
        btn.disabled = false;
        alert("✅ Stock Updated Successfully!");
        
    } catch(error) {
        console.error("Stock update error:", error);
        alert("🚨 Failed to update stock: " + error.message);
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update`;
        btn.disabled = false;
    }
}
