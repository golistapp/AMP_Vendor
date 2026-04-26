// admin/js/product-manager.js

let allVendorsList = []; // Global array for searching

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadVendorsForProducts();
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

// 🔍 SMART VENDOR DROPDOWN LOGIC
function loadVendorsForProducts() {
    db.ref('vendors').on('value', (snapshot) => {
        allVendorsList = [];
        if(snapshot.exists()) {
            snapshot.forEach(child => {
                allVendorsList.push(child.val());
            });
        }
        renderVendorDropdown(allVendorsList);
    });
}

function renderVendorDropdown(vendors) {
    const dropdown = document.getElementById('vendorDropdown');
    dropdown.innerHTML = '';

    if (vendors.length === 0) {
        dropdown.innerHTML = `<div style="padding: 12px; color: red; text-align: center;">No vendors found</div>`;
        return;
    }

    vendors.forEach(vend => {
        const safeShop = vend.shop.replace(/'/g, "\\'");
        const safeName = vend.name.replace(/'/g, "\\'");
        
        // Custom UI for each dropdown item
        dropdown.innerHTML += `
            <div onclick="selectVendor('${vend.id}', '${safeShop}', '${safeName}')" style="padding: 12px 15px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; flex-direction: column; transition: 0.2s;" onmouseover="this.style.background='#f0e6c8'" onmouseout="this.style.background='#fff'">
                <b style="color: var(--primary-green); font-size: 0.95rem;">${vend.shop} <span style="font-size: 0.8rem; color: #888;">(${vend.name})</span></b>
                <small style="color: var(--accent-gold); font-weight: bold;">📞 ${vend.mobile} | ID: ${vend.id}</small>
            </div>
        `;
    });
}

function showVendorDropdown() {
    document.getElementById('vendorDropdown').style.display = 'block';
}

function filterVendors() {
    const query = document.getElementById('prodVendorDisplay').value.toLowerCase();
    const filtered = allVendorsList.filter(v => 
        v.shop.toLowerCase().includes(query) || 
        v.name.toLowerCase().includes(query) || 
        v.mobile.includes(query)
    );
    renderVendorDropdown(filtered);
    showVendorDropdown();
}

function selectVendor(id, shop, name) {
    // Set visible input
    document.getElementById('prodVendorDisplay').value = `${shop} (${name})`;
    // Set hidden inputs for database
    document.getElementById('prodVendorId').value = id;
    document.getElementById('prodVendorName').value = shop;
    
    // Hide dropdown
    document.getElementById('vendorDropdown').style.display = 'none';
}

// Close dropdown if clicked outside
document.addEventListener('click', function(event) {
    const input = document.getElementById('prodVendorDisplay');
    const dropdown = document.getElementById('vendorDropdown');
    if (event.target !== input && event.target !== dropdown && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});


// 🟢 MAIN SUBMIT HANDLER (Add & Edit)
async function handleProductSubmit(e) {
    e.preventDefault();

    const vendorId = document.getElementById('prodVendorId').value;
    const vendorNameStr = document.getElementById('prodVendorName').value;

    // Validation: Check if vendor was actually selected from the list
    if (!vendorId) {
        alert("🚨 Please select a valid Vendor from the dropdown list!");
        return;
    }

    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing... ⏳";

    const editKey = document.getElementById('editProductKey').value;
    const existingImage = document.getElementById('existingProdImage').value;

    const id = document.getElementById('prodId').value.trim();
    const name = document.getElementById('prodName').value.trim();
    const custPrice = parseFloat(document.getElementById('prodCustPrice').value);
    const vendPrice = parseFloat(document.getElementById('prodVendPrice').value);
    const margin = custPrice - vendPrice;

    const fileInput = document.getElementById('prodImage');
    const file = fileInput.files[0];

    if (!editKey && !file) {
        alert("🚨 Please select an image for the new product!");
        resetProductBtn(submitBtn);
        return;
    }

    let imageUrl = existingImage;

    try {
        if (file) {
            submitBtn.innerText = "Uploading Image... ⏳";
            const newUploadedUrl = await uploadImageToFirebase(file);
            if (newUploadedUrl) imageUrl = newUploadedUrl;
        }

        if (!editKey) {
            const productData = {
                id, name, custPrice, vendPrice, margin,
                vendorId: vendorId,
                vendorName: vendorNameStr,
                image: imageUrl || "",
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            await db.ref('products').push(productData);
            alert('Product Added Successfully! 🚀');
        } else {
            const updateData = {
                id, name, custPrice, vendPrice, margin,
                vendorId: vendorId,
                vendorName: vendorNameStr,
                image: imageUrl || ""
            };
            await db.ref('products/' + editKey).update(updateData);
            alert('Product Updated Successfully! ✅');
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
        snapshot.forEach(child => productsArray.push({ key: child.key, ...child.val() }));
        productsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        productsArray.forEach(prod => {
            const safeName = prod.name.replace(/'/g, "\\'");
            const safeShop = prod.vendorName ? prod.vendorName.replace(/'/g, "\\'") : "";
            const safeImage = prod.image ? prod.image.replace(/'/g, "\\'") : "";

            productList.innerHTML += `
                <tr>
                    <td>
                        <img src="${prod.image}" onclick="openImageModal('${prod.image}')" style="width:45px; height:45px; border-radius:8px; object-fit:cover; border: 1px solid #ddd; cursor: zoom-in;">
                    </td>
                    <td><b style="color:var(--primary-green);">${prod.id}</b><br><small>${prod.name}</small></td>
                    <td>
                        <span style="background:rgba(242, 179, 40, 0.2); padding:2px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; color:var(--primary-green);">
                            ${prod.vendorId || "N/A"}
                        </span><br>
                        <small>${prod.vendorName || "Unknown"}</small>
                    </td>
                    <td>₹${prod.custPrice}</td>
                    <td>₹${prod.vendPrice}</td>
                    <td style="color:var(--primary-green); font-weight:bold;">₹${prod.margin}</td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button onclick="populateEditProduct('${prod.key}', '${prod.id}', '${safeName}', '${prod.vendorId}', '${safeShop}', '${prod.custPrice}', '${prod.vendPrice}', '${safeImage}')" style="background:#2563eb; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteProduct('${prod.key}')" style="background:red; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
}

// 🟢 EDIT FORM POPULATION
function populateEditProduct(key, id, name, vendorId, vendorShop, custPrice, vendPrice, image) {
    document.getElementById('editProductKey').value = key;
    document.getElementById('existingProdImage').value = image;
    
    document.getElementById('prodId').value = id;
    document.getElementById('prodName').value = name;
    
    // Set Vendor Search UI
    document.getElementById('prodVendorDisplay').value = `${vendorShop} (ID: ${vendorId})`;
    document.getElementById('prodVendorId').value = vendorId;
    document.getElementById('prodVendorName').value = vendorShop;

    document.getElementById('prodCustPrice').value = custPrice;
    document.getElementById('prodVendPrice').value = vendPrice;

    document.getElementById('productFormTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-gold"></i> Edit Product: ${id}`;
    const submitBtn = document.getElementById('submitProductBtn');
    submitBtn.innerText = "Update Product";
    submitBtn.style.background = "#2563eb"; 
    document.getElementById('cancelEditProductBtn').style.display = "block";

    if (image) {
        document.getElementById('imagePreview').src = image;
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
    document.getElementById('prodVendorId').value = "";
    document.getElementById('prodVendorName').value = "";
    
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
