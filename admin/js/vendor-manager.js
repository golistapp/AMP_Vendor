// admin/js/vendor-manager.js

document.addEventListener('DOMContentLoaded', loadVendors);

// 🟢 MODAL LOGIC (Show / Hide Form)
function showVendorForm() {
    document.getElementById('vendorFormModal').style.display = 'flex';
}

function hideVendorForm() {
    document.getElementById('vendorFormModal').style.display = 'none';
    cancelVendorEdit(); // Reset form when closed
}

// 🟢 Image Preview Logic for Vendor
document.getElementById('vendImage')?.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function() {
            document.getElementById('vendImagePreview').src = reader.result;
            document.getElementById('vendorImagePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// 📍 GET LIVE LOCATION API
function getVendorLocation() {
    const statusText = document.getElementById('locationStatus');
    const latInput = document.getElementById('vendLat');
    const lngInput = document.getElementById('vendLng');

    if (!navigator.geolocation) {
        statusText.innerText = "🚨 Geolocation is not supported by your browser.";
        statusText.style.color = "red";
        return;
    }

    statusText.innerText = "Locating... ⏳ Please allow location access.";
    statusText.style.color = "orange";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            latInput.value = lat;
            lngInput.value = lng;
            
            statusText.innerText = `✅ Location captured! Accuracy: ${Math.round(position.coords.accuracy)} meters.`;
            statusText.style.color = "green";
        },
        (error) => {
            statusText.innerText = `🚨 Error: ${error.message}`;
            statusText.style.color = "red";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// 🟢 MAIN SUBMIT HANDLER (Handles Add & Edit)
async function handleVendorSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitVendorBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing... ⏳";

    const editKey = document.getElementById('editVendorKey').value;
    const existingImage = document.getElementById('existingVendImage').value;

    const name = document.getElementById('vendName').value.trim();
    const shop = document.getElementById('vendShop').value.trim();
    const mobile = document.getElementById('vendMobile').value.trim();
    const pincode = document.getElementById('vendPincode').value.trim();
    const password = document.getElementById('vendPassword').value.trim();
    
       // Get Location Values
    const lat = document.getElementById('vendLat').value.trim();
    const lng = document.getElementById('vendLng').value.trim();

    // Location is now OPTIONAL, so we removed the strict check block here.
    
    const fileInput = document.getElementById('vendImage');

    const file = fileInput.files[0];

    let imageUrl = existingImage;

    try {
        if (file) {
            submitBtn.innerText = "Uploading Image... ⏳";
            const newUploadedUrl = await uploadImageToFirebase(file);
            if (newUploadedUrl) imageUrl = newUploadedUrl;
        }

        if (!editKey) {
            const namePrefix = name.substring(0, 4).toUpperCase().replace(/\s/g, ''); 
            const randomDigits = Math.floor(1000 + Math.random() * 9000);
            const vendorId = `AMP${namePrefix}${randomDigits}`;

            const vendorData = { 
                id: vendorId, 
                name, shop, mobile, pincode, password, 
                lat, lng, 
                image: imageUrl || "", 
                rating: 5.0, 
                totalOrders: 0,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            await db.ref('vendors').push(vendorData);
            alert(`Vendor Registered Successfully! 🏬\nID: ${vendorId}`);
        } else {
            const updateData = {
                name, shop, mobile, pincode, password,
                lat, lng, 
                image: imageUrl || ""
            };
            await db.ref('vendors/' + editKey).update(updateData);
            alert('Vendor Updated Successfully! ✅');
        }

        // Form submit hone ke baad Modal close kar do
        hideVendorForm();

    } catch (error) {
        console.error("Error saving vendor: ", error);
        alert("🚨 Failed to save vendor.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = document.getElementById('editVendorKey').value ? "Update Vendor" : "Register Vendor";
    }
}

// 🟢 REAL-TIME LISTENER FOR VENDORS
function loadVendors() {
    const vendorList = document.getElementById('vendorList');
    if(!vendorList) return;

    db.ref('vendors').on('value', (snapshot) => {
        vendorList.innerHTML = '';

        if(!snapshot.exists()) {
            vendorList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No vendors found.</td></tr>';
            return;
        }

        let vendorsArray = [];
        snapshot.forEach(child => vendorsArray.push({ key: child.key, ...child.val() }));
        vendorsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        vendorsArray.forEach(vend => {
            const imgHtml = vend.image ? 
                `<img src="${vend.image}" style="width:45px; height:45px; border-radius:8px; object-fit:cover; margin-right:12px; border:1px solid #ddd;">` : 
                `<div style="width:45px; height:45px; border-radius:8px; background:rgba(24, 65, 36, 0.1); display:inline-flex; align-items:center; justify-content:center; margin-right:12px; color:var(--primary-green);"><i class="fa-solid fa-store"></i></div>`;

            // Escaping quotes safely for HTML attributes
            const safeName = vend.name.replace(/'/g, "\\'");
            const safeShop = vend.shop.replace(/'/g, "\\'");
            const safeImage = vend.image ? vend.image.replace(/'/g, "\\'") : "";
            const safeLat = vend.lat || "";
            const safeLng = vend.lng || "";

            const locationIcon = (vend.lat && vend.lng) ? `<i class="fa-solid fa-map-pin" style="color: green; margin-left: 5px;" title="Location Captured"></i>` : '';

            vendorList.innerHTML += `
                <tr>
                    <td style="display:flex; align-items:center;">
                        ${imgHtml}
                        <div>
                            <b style="color:var(--primary-green);">${vend.shop} ${locationIcon}</b><br>
                            <small style="color:var(--accent-gold); font-weight:bold;">${vend.id}</small><br>
                            <small style="color:#666;">${vend.name}</small>
                        </div>
                    </td>
                    <td>${vend.mobile}</td>
                    <td><span style="background:#f3f4f6; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; color:#333;">${vend.pincode}</span></td>
                    <td>⭐ ${vend.rating.toFixed(1)}</td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button onclick="populateEditVendor('${vend.key}', '${safeName}', '${safeShop}', '${vend.mobile}', '${vend.pincode}', '${vend.password}', '${safeImage}', '${safeLat}', '${safeLng}')" style="background:#2563eb; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deleteVendor('${vend.key}')" style="background:red; color:white; border:none; width:30px; height:30px; border-radius:5px; cursor:pointer;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
}

// 🟢 FILL FORM FOR EDITING
function populateEditVendor(key, name, shop, mobile, pincode, password, image, lat, lng) {
    document.getElementById('editVendorKey').value = key;
    document.getElementById('existingVendImage').value = image;
    
    document.getElementById('vendName').value = name;
    document.getElementById('vendShop').value = shop;
    document.getElementById('vendMobile').value = mobile;
    document.getElementById('vendPincode').value = pincode;
    document.getElementById('vendPassword').value = password;
    
    document.getElementById('vendLat').value = lat;
    document.getElementById('vendLng').value = lng;
    document.getElementById('locationStatus').innerText = lat ? "Location loaded from database." : "Location not available. Click 'Live Location'.";
    document.getElementById('locationStatus').style.color = lat ? "green" : "#666";

    document.getElementById('vendorFormTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-gold"></i> Edit Vendor: ${shop}`;
    document.getElementById('submitVendorBtn').innerText = "Update Vendor";
    document.getElementById('submitVendorBtn').style.background = "#2563eb"; 
    document.getElementById('cancelEditVendorBtn').style.display = "block";

    if (image) {
        document.getElementById('vendImagePreview').src = image;
        document.getElementById('vendorImagePreviewContainer').style.display = 'block';
    } else {
        document.getElementById('vendorImagePreviewContainer').style.display = 'none';
    }

    showVendorForm(); // Form me data bharne ke baad modal open karein
}

// 🟢 CANCEL EDIT & RESET
function cancelVendorEdit() {
    document.getElementById('addVendorForm').reset();
    document.getElementById('editVendorKey').value = "";
    document.getElementById('existingVendImage').value = "";
    
    document.getElementById('vendLat').value = "";
    document.getElementById('vendLng').value = "";
    document.getElementById('locationStatus').innerText = "Click 'Live Location' while present at the shop.";
    document.getElementById('locationStatus').style.color = "#666";
    
    document.getElementById('vendorFormTitle').innerHTML = `<i class="fa-solid fa-store text-gold"></i> Register New Vendor`;
    document.getElementById('submitVendorBtn').innerText = "Register Vendor";
    document.getElementById('submitVendorBtn').style.background = "var(--primary-green)";
    document.getElementById('cancelEditVendorBtn').style.display = "none";
    document.getElementById('vendorImagePreviewContainer').style.display = 'none';
}

async function deleteVendor(vendorKey) {
    if(confirm('Are you sure you want to remove this vendor?')) {
        try {
            await db.ref('vendors/' + vendorKey).remove();
        } catch (error) {
            alert("🚨 Error removing vendor.");
        }
    }
}