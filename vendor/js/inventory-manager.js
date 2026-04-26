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
            stockList.innerHTML += `
                <div style="background:var(--card-bg); padding:15px; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 6px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 15px;">
                    <img src="${prod.image}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
                    <div style="flex-grow: 1;">
                        <h4 style="color:var(--primary-green); margin-bottom: 2px;">${prod.name}</h4>
                        <p style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">ID: <b>${prod.id}</b></p>
                        <span style="background: rgba(242, 179, 40, 0.2); color: var(--primary-green); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold;">Shop Price: ₹${prod.vendPrice}</span>
                    </div>
                </div>`;
        });
    });
}
