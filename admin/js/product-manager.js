// admin/js/product-manager.js

let allVendorsList = []; 

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadVendorsForProducts();
    
    // Form load hote hi ek default block add karenge
    setTimeout(() => {
        if(document.getElementById('multiVendorContainer')) {
            addVendorBlock(); 
        }
    }, 100);
});

// 🖼️ Modal View Functions
function openImageModal(imgSrc) {
    document.getElementById('modalImage').src = imgSrc;
    document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    document.getElementById('modalImage').src = "";
}

// 🖼️ Preview selected image in form
function previewProductImage(event) {
    const file = event.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function() {
            document.getElementById('imagePreview').src = reader.result;
            document.getElementById('productImagePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// -----------------------------------------------------------
// 🔴 DYNAMIC MULTI-VENDOR BLOCKS LOGIC
// -----------------------------------------------------------
function addVendorBlock() {
    const container = document.getElementById('multiVendorContainer');
    const blockId = Date.now() + Math.floor(Math.random() * 1000); 
    
    const removeBtn = container.children.length > 0 ? 
        `<button type="button" onclick="removeVendorBlock(${blockId})" style="position:absolute; top: -10px; right: -10px; background: #fff; border: none; color: #dc2626; font-size: 1.5rem; cursor: pointer; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><i class="fa-solid fa-circle-minus"></i></button>` : '';

    const blockHtml = `
        <div class="vendor-price-block" id="block_${blockId}" style="background: #f9fbf9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 15px; position: relative;">
            ${removeBtn}
            <div class="input-group" style="position: relative; margin-top: 5px;">
                <input type="text" id="prodVendorDisplay_${blockId}" placeholder="🔍 Click to see all Vendors or search..." required autocomplete="off" onfocus="showVendorDropdown(${blockId})" onkeyup="filterVendors(${blockId})" style="width: 100%; padding: 12px 15px; border: 2px solid var(--primary-green); border-radius: 8px; outline: none; background: #fff;">
                <input type="hidden" id="prodVendorId_${blockId}" class="vendor-id-input" required>
                <input type="hidden" id="prodVendorName_${blockId}" required>
                <div id="vendorDropdown_${blockId}" class="vendor-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin-top: 5px;"></div>
            </div>

            <div class="input-group" style="margin-top: 15px;">
                <input type="number" id="prodCustPrice_${blockId}" placeholder="Customer Price (₹)" required style="background: #fff;">
                <input type="number" id="prodVendPrice_${blockId}" placeholder="Vendor Price (₹)" required style="background: #fff;">
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', blockHtml);
}

function removeVendorBlock(blockId) {
    const el = document.getElementById(`block_${blockId}`);
    if(el) el.remove();
}

// 🔍 SMART VENDOR DROPDOWN LOGIC (100% Crash-Proof)

function loadVendorsForProducts() {
    db.ref('vendors').on('value', (snapshot) => {
        allVendorsList = [];
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                // BUG FIX: Added curly braces to prevent implicit truthy return 
                // that cancels the Firebase loop.
                allVendorsList.push(child.val());
            });
        }
    });
}

function renderVendorDropdown(vendors, blockId) {
    const dropdown = document.getElementById(`vendorDropdown_${blockId}`);
    if(!dropdown) return;
    
    dropdown.innerHTML = ''; // Clear previous list

    if (!vendors || vendors.length === 0) {
        dropdown.innerHTML = `<div style="padding: 12px; color: red; text-align: center; font-weight: bold;">No vendors found</div>`;
        return;
    }

    vendors.forEach(vend => {
        try {
            // Force string conversion to prevent undefined crashes
            let vShop = String(vend.shop || "Unknown Shop");
            let vName = String(vend.name || "Unknown Owner");
            let vMobile = String(vend.mobile || "N/A");
            let vId = String(vend.id || "N/A");
            
            // Safe HTML element creation
            let item = document.createElement('div');
            item.style.cssText = "padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; flex-direction: column; transition: 0.2s;";
            item.onmouseover = () => item.style.background = '#f0e6c8';
            item.onmouseout = () => item.style.background = '#fff';
            
            item.innerHTML = `
                <b style="color: var(--primary-green); font-size: 0.95rem;">${vShop} <span style="font-size: 0.8rem; color: #888;">(${vName})</span></b>
                <small style="color: var(--accent-gold); font-weight: bold;">📞 ${vMobile} | ID: ${vId}</small>
            `;

            // Assign click handler directly to avoid HTML string breaking
            item.onclick = function() {
                let displayInput = document.getElementById(`prodVendorDisplay_${blockId}`);
                let idInput = document.getElementById(`prodVendorId_${blockId}`);
                let nameInput = document.getElementById(`prodVendorName_${blockId}`);
                
                if(displayInput) displayInput.value = `${vShop} (${vName})`;
                if(idInput) idInput.value = vId;
                if(nameInput) nameInput.value = vShop;
                
                dropdown.style.display = 'none';
            };

            dropdown.appendChild(item);
        } catch(e) {
            console.error("Dropdown rendering error for a vendor:", e);
        }
    });
}

function filterVendors(blockId) {
    const input = document.getElementById(`prodVendorDisplay_${blockId}`);
    if(!input) return;

    const query = input.value.toLowerCase().trim();
    
    // If input is empty, show all vendors
    if(query === '') {
        renderVendorDropdown(allVendorsList, blockId);
        document.getElementById(`vendorDropdown_${blockId}`).style.display = 'block';
        return;
    }

    // Filter Logic: Matches shop name, owner name, or mobile number
    const filtered = allVendorsList.filter(v => {
        const s = String(v.shop || "").toLowerCase();
        const n = String(v.name || "").toLowerCase();
        const m = String(v.mobile || "");
        return s.includes(query) || n.includes(query) || m.includes(query);
    });
    
    renderVendorDropdown(filtered, blockId);
    document.getElementById(`vendorDropdown_${blockId}`).style.display = 'block';
}


function filterVendors(blockId) {
    const input = document.getElementById(`prodVendorDisplay_${blockId}`);
    if(!input) return;

    const query = input.value.toLowerCase().trim();
    
    // Agar box khali hai (Cut/Delete karne ke baad), toh sab dikhao
    if(query === '') {
        renderVendorDropdown(allVendorsList, blockId);
        document.getElementById(`vendorDropdown_${blockId}`).style.display = 'block';
        return;
    }

    // 🔥 Filter Logic (Mobile Number aur Naam dono se jabardast search)
    const filtered = allVendorsList.filter(v => {
        const s = String(v.shop || "").toLowerCase();
        const n = String(v.name || "").toLowerCase();
        const m = String(v.mobile || "");
        return s.includes(query) || n.includes(query) || m.includes(query);
    });
    
    renderVendorDropdown(filtered, blockId);
    document.getElementById(`vendorDropdown_${blockId}`).style.display = 'block';
}



// Dropdown ke bahar click karne par usko band karo
document.addEventListener('click', function(event) {
    document.querySelectorAll('.vendor-dropdown').forEach(dropdown => {
        const blockId = dropdown.id.split('_')[1];
        const input = document.getElementById(`prodVendorDisplay_${blockId}`);
        if (event.target !== input && event.target !== dropdown && !dropdown.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
});

// 🟢 MAIN SUBMIT HANDLER
async function handleProductSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing... ⏳";

    const editKey = document.getElementById('editProductKey').value;
    const existingImage = document.getElementById('existingProdImage').value;

    const id = document.getElementById('prodId').value.trim();
    const name = document.getElementById('prodName').value.trim();
    
    const fileInput = document.getElementById('prodImage');
    const file = fileInput.files[0];

    if (!editKey && !file) {
        alert("🚨 Please select an image for the product!");
        resetProductBtn(submitBtn);
        return;
    }

    const blocks = document.querySelectorAll('.vendor-price-block');
    if(blocks.length === 0) {
        alert("🚨 Please add at least one vendor!");
        resetProductBtn(submitBtn);
        return;
    }

    let productsDataToSave = [];

    for(let block of blocks) {
        const blockId = block.id.split('_')[1];
        const vId = document.getElementById(`prodVendorId_${blockId}`).value;
        const vName = document.getElementById(`prodVendorName_${blockId}`).value;
        const cPrice = parseFloat(document.getElementById(`prodCustPrice_${blockId}`).value) || 0;
        const vPrice = parseFloat(document.getElementById(`prodVendPrice_${blockId}`).value) || 0;
        const margin = cPrice - vPrice;

        if(!vId) {
            alert("🚨 Please search and select a valid Vendor from the dropdown list!");
            resetProductBtn(submitBtn);
            return;
        }

        productsDataToSave.push({ vendorId: vId, vendorName: vName, custPrice: cPrice, vendPrice: vPrice, margin: margin });
    }

    let imageUrl = existingImage;

    try {
        if (file) {
            submitBtn.innerText = "Uploading Image... ⏳";
            const newUploadedUrl = await uploadImageToFirebase(file);
            if (newUploadedUrl) imageUrl = newUploadedUrl;
        }

        if (!editKey) {
            // 🆕 ADD MODE
            for(let pData of productsDataToSave) {
                const finalProductData = {
                    id, name,
                    custPrice: pData.custPrice, 
                    vendPrice: pData.vendPrice, 
                    margin: pData.margin,
                    vendorId: pData.vendorId,
                    vendorName: pData.vendorName,
                    image: imageUrl || "",
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                await db.ref('products').push(finalProductData);
            }
            alert(`✅ Product successfully linked to ${productsDataToSave.length} vendor(s)! 🚀`);
        } else {
            // ✏️ EDIT MODE (Purana update hoga, naye add honge)
            const pData = productsDataToSave[0]; 
            const updateData = {
                id, name, 
                custPrice: pData.custPrice, 
                vendPrice: pData.vendPrice, 
                margin: pData.margin,
                vendorId: pData.vendorId,
                vendorName: pData.vendorName,
                image: imageUrl || ""
            };
            await db.ref('products/' + editKey).update(updateData);

            if (productsDataToSave.length > 1) {
                for (let i = 1; i < productsDataToSave.length; i++) {
                    let extraData = productsDataToSave[i];
                    const extraProductData = {
                        id, name,
                        custPrice: extraData.custPrice, 
                        vendPrice: extraData.vendPrice, 
                        margin: extraData.margin,
                        vendorId: extraData.vendorId,
                        vendorName: extraData.vendorName,
                        image: imageUrl || "",
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    };
                    await db.ref('products').push(extraProductData);
                }
            }
            alert(`✅ Product Updated & Linked to ${productsDataToSave.length} Vendor(s)!`);
        }

        cancelProductEdit();

    } catch (error) {
        console.error("Error saving product: ", error);
        alert("🚨 Failed to save product.");
    } finally {
        resetProductBtn(submitBtn);
    }
}

function resetProductBtn(btn) {
    btn.disabled = false;
    btn.innerText = document.getElementById('editProductKey').value ? "Update Product" : "Add Product";
}

// 🟢 REAL-TIME LISTENER FOR PRODUCTS
function loadProducts() {
    const productList = document.getElementById('productList');
    if(!productList) return;

    db.ref('products').on('value', (snapshot) => {
        productList.innerHTML = '';

        if(!snapshot.exists()) {
            productList.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No products found.</td></tr>';
            return;
        }

        let productsArray = [];
        snapshot.forEach(child => {
            let pData = child.val();
            pData.key = child.key;
            productsArray.push(pData);
        });
        
        productsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        productsArray.forEach(prod => {
            try {
                let pId = String(prod.id || "N/A");
                let pName = String(prod.name || "Unknown Product");
                let pVendorId = String(prod.vendorId || "N/A");
                let pVendorName = String(prod.vendorName || "Unknown Vendor");
                let pCustPrice = parseFloat(prod.custPrice) || 0;
                let pVendPrice = parseFloat(prod.vendPrice) || 0;
                let pMargin = parseFloat(prod.margin) || 0;
                let pImage = String(prod.image || "");

                let safeProdData = encodeURIComponent(JSON.stringify(prod));

                let imgHtml = pImage ? 
                    `<img src="${pImage}" onclick="openImageModal('${pImage}')" style="width:45px; height:45px; border-radius:8px; object-fit:cover; border: 1px solid #ddd; cursor: zoom-in;">` : 
                    `<div style="width:45px; height:45px; border-radius:8px; background:#eee; display:flex; align-items:center; justify-content:center; border: 1px solid #ddd;"><i class="fa-solid fa-box"></i></div>`;

                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${imgHtml}</td>
                    <td><b style="color:var(--primary-green);">${pId}</b><br><small>${pName}</small></td>
                    <td>
                        <span style="background:rgba(242, 179, 40, 0.2); padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; color:var(--primary-green);">
                            ${pVendorId}
                        </span><br>
                        <small>${pVendorName}</small>
                    </td>
                    <td>₹${pCustPrice}</td>
                    <td>₹${pVendPrice}</td>
                    <td style="color:var(--primary-green); font-weight:bold;">₹${pMargin}</td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button onclick="populateEditProduct('${safeProdData}')" style="background:#2563eb; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteProduct('${prod.key}')" style="background:red; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                productList.appendChild(tr);
            } catch (err) {
                console.error("Skipped corrupt product rendering:", prod, err);
            }
        });
    });
}

// 🟢 EDIT FORM POPULATION
function populateEditProduct(encodedData) {
    const prod = JSON.parse(decodeURIComponent(encodedData));

    document.getElementById('editProductKey').value = prod.key || "";
    document.getElementById('existingProdImage').value = prod.image || "";
    
    document.getElementById('prodId').value = prod.id || "";
    document.getElementById('prodName').value = prod.name || "";
    
    const container = document.getElementById('multiVendorContainer');
    container.innerHTML = '';
    
    const blockId = Date.now();
    const blockHtml = `
        <div class="vendor-price-block" id="block_${blockId}" style="background: #f9fbf9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 15px; position: relative;">
            <div class="input-group" style="position: relative; margin-top: 5px;">
                <input type="text" id="prodVendorDisplay_${blockId}" placeholder="🔍 Search Vendor by Name or Mobile..." required autocomplete="off" onfocus="showVendorDropdown(${blockId})" onkeyup="filterVendors(${blockId})" style="width: 100%; padding: 12px 15px; border: 2px solid var(--primary-green); border-radius: 8px; outline: none; background:#fff;">
                <input type="hidden" id="prodVendorId_${blockId}" required>
                <input type="hidden" id="prodVendorName_${blockId}" required>
                <div id="vendorDropdown_${blockId}" class="vendor-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.15); margin-top: 5px;"></div>
            </div>
            <div class="input-group" style="margin-top: 15px;">
                <input type="number" id="prodCustPrice_${blockId}" placeholder="Customer Price (₹)" required style="background:#fff;">
                <input type="number" id="prodVendPrice_${blockId}" placeholder="Vendor Price (₹)" required style="background:#fff;">
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', blockHtml);

    let vShop = prod.vendorName || "Unknown";
    let vId = prod.vendorId || "";
    document.getElementById(`prodVendorDisplay_${blockId}`).value = vId ? `${vShop} (ID: ${vId})` : "";
    document.getElementById(`prodVendorId_${blockId}`).value = vId;
    document.getElementById(`prodVendorName_${blockId}`).value = vShop;
    document.getElementById(`prodCustPrice_${blockId}`).value = prod.custPrice || "";
    document.getElementById(`prodVendPrice_${blockId}`).value = prod.vendPrice || "";

    // Edit mode mein ab 'Add Another Vendor' ka button show hoga
    const addBtn = document.getElementById('addMoreVendorBtn');
    if(addBtn) addBtn.style.display = 'flex';

    document.getElementById('productFormTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-gold"></i> Edit Product: ${prod.id || "Unknown"}`;
    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.innerText = "Update Product";
    submitBtn.style.background = "#2563eb"; 
    document.getElementById('cancelEditProductBtn').style.display = "block";

    if (prod.image) {
        document.getElementById('imagePreview').src = prod.image;
        document.getElementById('productImagePreviewContainer').style.display = 'block';
    } else {
        document.getElementById('productImagePreviewContainer').style.display = 'none';
    }

    document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

// 🟢 CANCEL EDIT
function cancelProductEdit() {
    document.getElementById('addProductForm').reset();
    document.getElementById('editProductKey').value = "";
    document.getElementById('existingProdImage').value = "";
    
    document.getElementById('multiVendorContainer').innerHTML = '';
    addVendorBlock();
    
    const addBtn = document.getElementById('addMoreVendorBtn');
    if(addBtn) addBtn.style.display = 'flex';

    document.getElementById('productFormTitle').innerHTML = `<i class="fa-solid fa-box-open text-gold"></i> Add New Product`;
    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.innerText = "Add Product";
    submitBtn.style.background = "var(--primary-green)";
    document.getElementById('cancelEditProductBtn').style.display = "none";
    document.getElementById('productImagePreviewContainer').style.display = 'none';
}

async function deleteProduct(productKey) {
    if(confirm('Are you sure you want to delete this product?')) {
        try {
            await db.ref('products/' + productKey).remove();
        } catch (error) {
            alert("🚨 Error deleting product.");
        }
    }
}