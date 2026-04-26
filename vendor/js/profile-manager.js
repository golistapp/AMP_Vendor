// vendor/js/profile-manager.js

// 🟢 CATCH GOOGLE REDIRECT RESULT
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().getRedirectResult().then(async (result) => {
        if (result && result.user) {
            if (localStorage.getItem('is_linking_google') === 'true') {
                localStorage.removeItem('is_linking_google'); 
                
                const userEmail = result.user.email;
                if(loggedInVendor) {
                    try {
                        await db.ref('vendors/' + loggedInVendor.key).update({ linkedEmail: userEmail });
                        loggedInVendor.linkedEmail = userEmail;
                        localStorage.setItem('amp_logged_in_vendor', JSON.stringify(loggedInVendor));
                        
                        alert(`✅ Success!\nGmail (${userEmail}) has been linked to your shop.`);
                        
                        if(typeof switchVendorView === 'function') {
                            switchVendorView('profile');
                        }
                    } catch (error) {
                        alert("🚨 Database update failed: " + error.message);
                    }
                }
            }
        }
    }).catch((error) => {
        if(localStorage.getItem('is_linking_google') === 'true') {
            localStorage.removeItem('is_linking_google');
            alert("🚨 Failed to link Google Account: " + error.message);
        }
    });
});

function loadVendorProfile() {
    if(!loggedInVendor) return;

    const profileContainer = document.getElementById('profileContainer');
    if(!profileContainer) return;

    // 🖼️ Added onclick for full view image
    const imgHtml = loggedInVendor.image ? 
        `<img src="${loggedInVendor.image}" onclick="openProfileImageModal('${loggedInVendor.image}')" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-gold); box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin: 0 auto; display: block; cursor: pointer;" title="Click to view full image">` : 
        `<div style="width: 100px; height: 100px; border-radius: 50%; background: rgba(24,65,36,0.1); color: var(--primary-green); display: flex; justify-content: center; align-items: center; font-size: 3rem; margin: 0 auto; border: 3px solid var(--accent-gold);"><i class="fa-solid fa-store"></i></div>`;

    let locationStatus = '';
    let updateLocationBtn = '';

    if (loggedInVendor.lat && loggedInVendor.lng) {
        locationStatus = `<span style="color: #16a34a; font-weight: bold;">Linked <i class="fa-solid fa-circle-check"></i></span>`;
    } else {
        locationStatus = `<span style="color: #d97706; font-weight: bold;">Not Linked <i class="fa-solid fa-triangle-exclamation"></i></span>`;
        updateLocationBtn = `
            <button id="updateLocBtn" onclick="updateVendorGeoLocation()" style="width: 100%; margin-top: 15px; padding: 12px; background: var(--accent-gold); color: #000; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <i class="fa-solid fa-map-pin"></i> Update My Shop Location
            </button>
        `;
    }

    let gmailSyncHtml = '';
    if (loggedInVendor.linkedEmail) {
        gmailSyncHtml = `
            <p style="margin-top: 12px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                <span><img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" style="width:16px; margin-right: 5px;"> Gmail Auth</span> 
                <span style="color: #16a34a; font-weight: bold; font-size: 0.8rem;">Linked ✅</span>
            </p>
            <p style="font-size: 0.75rem; color: #888; text-align: right; margin-top: -5px;">${loggedInVendor.linkedEmail}</p>
        `;
    } else {
        gmailSyncHtml = `
            <div style="height: 1px; background: #eee; margin-top: 12px; margin-bottom: 12px;"></div>
            <p style="margin-bottom: 10px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                <span><img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" style="width:16px; margin-right: 5px;"> Gmail Auth</span> 
                <span style="color: #d97706; font-weight: bold; font-size: 0.8rem;">Not Linked ⚠️</span>
            </p>
            <button id="syncGoogleBtn" onclick="syncGoogleAccount()" style="width: 100%; padding: 10px; background: #fff; color: #333; border: 1px solid #ddd; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                Link Gmail for Quick Login
            </button>
        `;
    }

    profileContainer.innerHTML = `
        <div style="background: #fff; padding: 25px 20px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; margin-bottom: 20px;">
            ${imgHtml}
            <h2 style="color: var(--primary-green); margin-top: 15px; font-size: 1.4rem;">${loggedInVendor.shop}</h2>
            <p style="background: rgba(242, 179, 40, 0.2); color: var(--primary-green); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; display: inline-block; margin-top: 5px; margin-bottom: 20px;">
                ID: ${loggedInVendor.id}
            </p>
            
            <div style="text-align: left; background: #f9fbf9; padding: 15px; border-radius: 12px; border: 1px solid #eee;">
                <p style="margin-bottom: 12px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-user" style="color: #888; width: 25px;"></i> Owner</span> 
                    <b>${loggedInVendor.name}</b>
                </p>
                <div style="height: 1px; background: #eee; margin-bottom: 12px;"></div>
                <p style="margin-bottom: 12px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-phone" style="color: #888; width: 25px;"></i> Mobile</span> 
                    <b>${loggedInVendor.mobile}</b>
                </p>
                <div style="height: 1px; background: #eee; margin-bottom: 12px;"></div>
                <p style="margin-bottom: 12px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-location-dot" style="color: #888; width: 25px;"></i> Pincode</span> 
                    <b>${loggedInVendor.pincode}</b>
                </p>
                <div style="height: 1px; background: #eee; margin-bottom: 12px;"></div>
                <p style="margin-bottom: 0; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-map-pin" style="color: #888; width: 25px;"></i> Geo-Map</span> 
                    ${locationStatus}
                </p>
                
                ${gmailSyncHtml}
            </div>
            
            ${updateLocationBtn}
        </div>

        <button onclick="openPasswordModal()" style="width: 100%; padding: 12px; margin-bottom: 15px; background: #fff; color: var(--primary-green); border: 2px solid var(--primary-green); border-radius: 12px; font-size: 1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s;">
            <i class="fa-solid fa-lock"></i> Change Password
        </button>

        <button onclick="vendorLogout()" style="width: 100%; padding: 15px; margin-bottom: 30px; background: #dc2626; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(220,38,38,0.2); display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class="fa-solid fa-right-from-bracket"></i> Secure Logout
        </button>
    `;
}

// 🖼️ PROFILE IMAGE MODAL LOGIC
function openProfileImageModal(imgSrc) {
    document.getElementById('modalProfileImg').src = imgSrc;
    document.getElementById('profileImageModal').style.display = 'flex';
}

function closeProfileImageModal() {
    document.getElementById('profileImageModal').style.display = 'none';
    document.getElementById('modalProfileImg').src = "";
}

// 🔒 CHANGE PASSWORD MODAL LOGIC
function openPasswordModal() {
    document.getElementById('oldPwd').value = '';
    document.getElementById('newPwd').value = '';
    document.getElementById('confirmPwd').value = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

async function submitNewPassword() {
    const oldPwd = document.getElementById('oldPwd').value.trim();
    const newPwd = document.getElementById('newPwd').value.trim();
    const confirmPwd = document.getElementById('confirmPwd').value.trim();

    if(!oldPwd || !newPwd || !confirmPwd) {
        alert("🚨 Please fill all password fields!");
        return;
    }

    if(oldPwd !== loggedInVendor.password) {
        alert("🚨 Current Password is incorrect!");
        return;
    }

    if(newPwd !== confirmPwd) {
        alert("🚨 New Passwords do not match!");
        return;
    }

    try {
        // Update in Firebase Realtime Database
        await db.ref('vendors/' + loggedInVendor.key).update({ password: newPwd });
        
        // Update local session
        loggedInVendor.password = newPwd;
        localStorage.setItem('amp_logged_in_vendor', JSON.stringify(loggedInVendor));
        
        alert("✅ Password changed successfully!");
        closePasswordModal();
    } catch (error) {
        console.error("Password Update Error:", error);
        alert("🚨 Error changing password: " + error.message);
    }
}

// 🔴 SYNC GMAIL USING POPUP
function syncGoogleAccount() {
    const btn = document.getElementById('syncGoogleBtn');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Redirecting to Google...`;
    btn.disabled = true;

    localStorage.setItem('is_linking_google', 'true'); 
    
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
}

async function updateVendorGeoLocation() {
    const btn = document.getElementById('updateLocBtn');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Fetching Location...`;
    btn.disabled = true;

    if (!navigator.geolocation) {
        alert("🚨 Geolocation is not supported by your browser.");
        btn.innerHTML = `<i class="fa-solid fa-map-pin"></i> Update My Shop Location`;
        btn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            try {
                await db.ref('vendors/' + loggedInVendor.key).update({ lat: lat, lng: lng });
                loggedInVendor.lat = lat;
                loggedInVendor.lng = lng;
                localStorage.setItem('amp_logged_in_vendor', JSON.stringify(loggedInVendor));
                alert("✅ Location Successfully Updated!");
                loadVendorProfile();
            } catch (error) {
                console.error("Error updating location:", error);
                alert("🚨 Failed to save location in database.");
                btn.innerHTML = `<i class="fa-solid fa-map-pin"></i> Update My Shop Location`;
                btn.disabled = false;
            }
        },
        (error) => {
            alert(`🚨 Location Error: ${error.message}`);
            btn.innerHTML = `<i class="fa-solid fa-map-pin"></i> Update My Shop Location`;
            btn.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function vendorLogout() {
    if(confirm('Are you sure you want to log out from AMP KART?')) {
        localStorage.removeItem('amp_logged_in_vendor');
        window.location.href = 'login.html';
    }
}
