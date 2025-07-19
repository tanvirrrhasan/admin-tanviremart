import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const mainContent = document.getElementById('main-content');
const loginError = document.getElementById('login-error');

const ALLOWED_ADMIN_EMAIL = 'tanvirrrhasan@gmail.com';

// --- Authentication Logic ---

const provider = new GoogleAuthProvider();

document.getElementById('google-signin-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            // Check if the signed-in user's email is the allowed one
            if (user.email !== ALLOWED_ADMIN_EMAIL) {
                loginError.textContent = 'This Google account is not authorized for admin access.';
                // Immediately sign out the unauthorized user
                signOut(auth);
            } else {
                loginError.textContent = ''; // Clear any previous errors
                showToast('Admin login successful!');
            }
        }).catch((error) => {
            console.error("Google Sign-In Error:", error);
            loginError.textContent = `Error: ${error.message}`;
        });
});

onAuthStateChanged(auth, (user) => {
    if (user && user.email === ALLOWED_ADMIN_EMAIL) {
        // User is signed in AND is the authorized admin.
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'flex';
        initializeAdminPanel();
    } else {
        // User is signed out or is not the authorized admin.
        loginContainer.style.display = 'flex';
        adminPanel.style.display = 'none';
    }
});

const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        showToast('Logged out successfully.');
    }).catch((error) => {
        showToast('Logout failed.', true);
    });
});


// --- Admin Panel Initialization ---
function initializeAdminPanel() {
    // Navigation (sidebar)
    document.querySelectorAll('#sidebar li[data-nav]').forEach(li => {
      li.addEventListener('click', (e) => {
        document.querySelectorAll('#sidebar li').forEach(x => x.classList.remove('active'));
        li.classList.add('active');
        loadSection(li.getAttribute('data-nav'));
      });
    });

    // Set default active section
    const initialSection = 'dashboard';
    loadSection(initialSection);
    document.querySelector(`#sidebar li[data-nav="${initialSection}"]`).classList.add('active');

    // Sidebar mobile toggle logic
    const menuBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (menuBtn && sidebar && overlay) {
      menuBtn.onclick = function() {
        if (sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
          overlay.style.display = 'none';
          menuBtn.textContent = '☰';
        } else {
          sidebar.classList.add('active');
          overlay.style.display = 'block';
          menuBtn.textContent = '✕';
        }
      };
      overlay.onclick = function() {
        sidebar.classList.remove('active');
        overlay.style.display = 'none';
        menuBtn.textContent = '☰';
      };
      sidebar.onclick = function(e) {
        if (window.innerWidth <= 700 && e.target.tagName === 'LI') {
          sidebar.classList.remove('active');
          overlay.style.display = 'none';
          menuBtn.textContent = '☰';
        }
      };
    }
}


function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = isError ? '#e53935' : '#43a047';
  toast.style.color = '#fff';
  toast.style.padding = '1rem 2rem';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  toast.style.zIndex = 9999;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function showProgress(percent) {
  let progress = document.getElementById('upload-progress');
  if (!progress) {
    progress = document.createElement('div');
    progress.id = 'upload-progress';
    progress.style.position = 'fixed';
    progress.style.top = '30px';
    progress.style.left = '50%';
    progress.style.transform = 'translateX(-50%)';
    progress.style.background = '#ff9800';
    progress.style.color = '#fff';
    progress.style.padding = '0.5rem 1.5rem';
    progress.style.borderRadius = '8px';
    progress.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    progress.style.zIndex = 9999;
    document.body.appendChild(progress);
  }
  progress.textContent = `Uploading images: ${percent}%`;
  if (percent >= 100) setTimeout(() => progress.remove(), 1000);
}

async function uploadImages(files) {
  const imageUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const uniqueName = `product-${Date.now()}-${Math.floor(Math.random()*1e6)}-${file.name}`;
    const storageRef = ref(storage, `products/${uniqueName}`);
    console.log(`Attempting to upload file: ${file.name} to path: products/${uniqueName}`);
    try {
      showProgress(0);
      console.log('Sending upload request...');
      await uploadBytes(storageRef, file);
      console.log('Upload complete for:', file.name);
      showProgress(100);
      const url = await getDownloadURL(storageRef);
      imageUrls.push(url);
      console.log('Generated Download URL:', url);
    } catch (err) {
      showProgress(0);
      console.error('Detailed Upload Error for', file.name, ':', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      if (err.customData) {
        console.error('Error custom data:', err.customData);
      }
      throw err; // Re-throw to propagate to the form handler
    }
  }
  return imageUrls;
}

async function loadSection(section) {
  if (section === 'dashboard') {
    mainContent.innerHTML = `<div class="card"><h2>Welcome, Admin!</h2><div id="dashboard-products"></div></div>`;
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        document.getElementById('dashboard-products').innerHTML = '<p>No products found.</p>';
        return;
      }
      let html = '';
      snap.forEach(docSnap => {
        const d = docSnap.data();
                  html += `<div class="product-card" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:1rem;width:220px;display:flex;flex-direction:column;align-items:center;min-width:0;">
          <div style="height:120px;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            ${(d.imageUrls && d.imageUrls.length) ? `<img src="${d.imageUrls[0]}" style="max-width:100%;max-height:100%;border-radius:8px;" />` : '<span style="color:#aaa;font-size:2rem;">No Image</span>'}
          </div>
          <div style="margin-top:1rem;font-weight:bold;word-break:break-word;text-align:center;">${d.name}</div>
          <div style="color:#ff9800;font-size:1.1rem;">৳${d.price}${d.regularPrice ? ` <span style='color:#888;text-decoration:line-through;font-size:0.95em;'>৳${d.regularPrice}</span>` : ''}</div>
          <div style="color:#888;font-size:0.95em;">${d.category}</div>
        </div>`;
      });
      document.getElementById('dashboard-products').innerHTML = html;
    } catch (err) {
      document.getElementById('dashboard-products').innerHTML = `<p style="color:#e53935">${err.message}</p>`;
    }
  } else if (section === 'add-product') {
    // Fetch categories for dropdown
    let categories = [];
    try {
      const catSnap = await getDocs(collection(db, 'categories'));
      categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      showToast('Failed to load categories', true);
    }
    const categoryOptions = categories.length
      ? categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')
      : '<option value="">No categories found</option>';

    mainContent.innerHTML = `
      <div class="card">
        <h2>Add Product</h2>
        <form id="add-product-form">
          <input type="text" id="product-name" placeholder="Product Name" required />
          <textarea id="product-description" placeholder="Description" required></textarea>
          <input type="number" id="product-price" placeholder="Price (৳)" required />
          <input type="number" id="product-regular-price" placeholder="Regular Price (optional)" />
          <label style="font-weight:600;">Categories</label>
          <div id="category-list" style="margin-bottom:6px;"></div>
          <div style="display:flex;gap:6px;align-items:center;">
            <select id="category-input-select" style="flex:1;">
              <option value="">Select Category</option>
              ${categoryOptions}
            </select>
            <button type="button" id="add-category-btn" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
          </div>
          <input type="number" id="product-stock" placeholder="Stock Quantity" required />
          <input type="file" id="product-images" accept="image/*" multiple />
          <div id="variant-section" style="margin-top:18px;">
            <label style="font-weight:600;">Available Colors</label>
            <div id="color-list" style="margin-bottom:6px;"></div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
              <input type="text" id="color-input-text" placeholder="Type or select color" style="flex:1;" />
              <select id="color-input-select" style="flex:1;">
                <option value="">Select color</option>
                <option>Red</option>
                <option>Blue</option>
                <option>Green</option>
                <option>Black</option>
                <option>White</option>
                <option>Yellow</option>
                <option>Orange</option>
                <option>Pink</option>
                <option>Purple</option>
                <option>Gray</option>
                <option>Brown</option>
                <option>Navy</option>
                <option>Maroon</option>
                <option>Olive</option>
                <option>Teal</option>
              </select>
              <button type="button" id="add-color-btn" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
            </div>
            <label style="font-weight:600;">Available Sizes</label>
            <div id="size-list" style="margin-bottom:6px;"></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="text" id="size-input-text" placeholder="Type or select size" style="flex:1;" />
              <select id="size-input-select" style="flex:1;">
                <option value="">Select size</option>
                <option>XS</option>
                <option>S</option>
                <option>M</option>
                <option>L</option>
                <option>XL</option>
                <option>XXL</option>
                <option>3XL</option>
                <option>4XL</option>
                <option>Free Size</option>
              </select>
              <button type="button" id="add-size-btn" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
            </div>
            <label style="font-weight:600; margin-top: 18px;">Short Bullet Description</label>
            <div id="bullet-list" style="margin-bottom:6px;"></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="text" id="bullet-input-text" placeholder="Type a bullet point and click + Add" style="flex:1;" />
              <button type="button" id="add-bullet-btn" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
            </div>
            <label style="font-weight:600; margin-top: 18px;">Warranty</label>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom: 18px;">
              <input type="text" id="warranty-input-text" placeholder="Type or select warranty" style="flex:1;" />
              <select id="warranty-input-select" style="flex:1;">
                <option value="">Select warranty period</option>
                <option>7 Days</option>
                <option>14 Days</option>
                <option>1 Month</option>
                <option>3 Months</option>
                <option>6 Months</option>
                <option>12 Months</option>
              </select>
            </div>

            <label style="font-weight:600; margin-top: 18px;">Return Day</label>
            <select id="product-return-day" required>
              <option value="7 Days" selected>7 Days Return</option>
              <option value="14 Days">14 Days Return</option>
            </select>

            <label style="font-weight:600; margin-top: 18px;">Delivery Time</label>
            <select id="product-delivery-time" required>
              <option value="3-5 Working Days">3 to 5 Working Days</option>
              <option value="5-10 Working Days" selected>5 to 10 Working Days</option>
              <option value="10-15 Working Days">10 to 15 Working Days</option>
            </select>
          </div>
          <div id="add-product-error" class="error"></div>
        </form>
        <div class="sticky-save-btn-wrapper">
          <button type="submit" form="add-product-form">Save Product</button>
        </div>
      </div>
    `;

    // --- ALL ADD PRODUCT PAGE JAVASCRIPT LOGIC MOVED HERE ---
    // These variables and functions need to be defined AFTER the HTML is loaded into mainContent

    let colors = [];
    let sizes = [];
    let selectedCategories = []; // Initialize here when section is loaded

    function renderColorList() {
      document.getElementById('color-list').innerHTML = colors.map((c, i) =>
        `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">
          ${c} <button type="button" data-index="${i}" class="remove-color" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button>
        </span>`
      ).join('');
    }

    function renderSizeList() {
      document.getElementById('size-list').innerHTML = sizes.map((s, i) =>
        `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">
          ${s} <button type="button" data-index="${i}" class="remove-size" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button>
        </span>`
      ).join('');
    }

    function renderCategoryList() {
      document.getElementById('category-list').innerHTML = selectedCategories.map((cat, i) =>
        `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">
          ${cat} <button type="button" data-index="${i}" class="remove-category" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button>
        </span>`
      ).join('');
    }

    // Attach event listeners after HTML is loaded
    document.getElementById('add-color-btn').onclick = function() {
      const input = document.getElementById('color-input-text');
      const select = document.getElementById('color-input-select');
      let val = input.value.trim();
      if (!val) val = select.value;
      if (val && !colors.includes(val)) {
        colors.push(val);
        renderColorList();
        input.value = '';
        select.value = '';
      }
    };
    document.getElementById('color-list').onclick = function(e) {
      if (e.target.classList.contains('remove-color')) {
        colors.splice(Number(e.target.dataset.index), 1);
        renderColorList();
      }
    };
    document.getElementById('add-size-btn').onclick = function() {
      const input = document.getElementById('size-input-text');
      const select = document.getElementById('size-input-select');
      let val = input.value.trim();
      if (!val) val = select.value;
      if (val && !sizes.includes(val)) {
        sizes.push(val);
        renderSizeList();
        input.value = '';
        select.value = '';
      }
    };
    document.getElementById('size-list').onclick = function(e) {
      if (e.target.classList.contains('remove-size')) {
        sizes.splice(Number(e.target.dataset.index), 1);
        renderSizeList();
      }
    };
    document.getElementById('add-bullet-btn').onclick = function() {
      const input = document.getElementById('bullet-input-text');
      const bulletList = document.getElementById('bullet-list');
      let val = input.value.trim();
      if (val) {
        bulletList.innerHTML += `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">${val} <button type="button" class="remove-bullet" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button></span>`;
        input.value = '';
      }
    };
    document.getElementById('bullet-list').onclick = function(e) {
      if (e.target.classList.contains('remove-bullet')) {
        e.target.closest('span').remove();
      }
    };
    document.getElementById('add-category-btn').onclick = function() {
      const select = document.getElementById('category-input-select');
      const val = select.value;
      if (val && !selectedCategories.includes(val)) {
        selectedCategories.push(val);
        renderCategoryList();
        select.value = '';
      }
    };
    document.getElementById('category-list').onclick = function(e) {
      if (e.target.classList.contains('remove-category')) {
        const idx = Number(e.target.dataset.index);
        const removed = selectedCategories[idx];
        selectedCategories.splice(idx, 1);
        renderCategoryList();
      }
    };

    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
      e.preventDefault(); // Ensure default form submission is prevented first

      try {
        const name = document.getElementById('product-name').value.trim();
        const description = document.getElementById('product-description').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const regularPriceInput = document.getElementById('product-regular-price').value;
        const regularPrice = regularPriceInput ? parseFloat(regularPriceInput) : null;
        const stock = parseInt(document.getElementById('product-stock').value);
        const imagesInput = document.getElementById('product-images');
        const errorDiv = document.getElementById('add-product-error');
        errorDiv.textContent = ''; // Clear previous errors

        const warrantyInputText = document.getElementById('warranty-input-text').value.trim();
        const warrantyInputSelect = document.getElementById('warranty-input-select').value;
        const warranty = warrantyInputText || warrantyInputSelect || null;

        const returnDay = document.getElementById('product-return-day').value;
        const deliveryTime = document.getElementById('product-delivery-time').value;

        // --- Validation Checks ---
        if (!name || !description || isNaN(price) || isNaN(stock) || !returnDay || !deliveryTime) {
          errorDiv.textContent = 'Please fill in all required text/number fields.';
          showToast('Please fill in all required text/number fields.', true);
          return; // Stop execution
        }

        if (selectedCategories.length === 0) {
          errorDiv.textContent = 'Please select at least one category.';
          showToast('Please select at least one category.', true);
          return; // Stop execution
        }

        if (imagesInput.files.length === 0) {
          errorDiv.textContent = 'Please upload at least one image.';
          showToast('Please upload at least one image.', true);
          return; // Stop execution
        }
        // --- End Validation Checks ---

        let imageUrls = [];
        if (imagesInput.files.length > 0) {
          imageUrls = await uploadImages(imagesInput.files);
        }

        // Collect bullet points
        const bulletListSpans = document.querySelectorAll('#bullet-list span');
        const bulletDescriptions = Array.from(bulletListSpans).map(span => span.childNodes[0].textContent.trim()).filter(Boolean);

        const productData = {
          name,
          description,
          price,
          regularPrice,
          categories: selectedCategories,
          stock,
          imageUrls,
          colors,
          sizes,
          warranty,
          returnDay,
          deliveryTime,
          createdAt: new Date()
        };
        if (bulletDescriptions.length > 0) productData.bulletDescriptions = bulletDescriptions;
        await addDoc(collection(db, 'products'), productData);
        showToast('Product added successfully!');
        // Clear form
        e.target.reset();
        colors = [];
        sizes = [];
        renderColorList();
        renderSizeList();
        document.getElementById('bullet-list').innerHTML = '';
        selectedCategories = []; // Clear selected categories on success
        renderCategoryList();
      } catch (err) {
        console.error("Form submission error:", err); // Log the error for debugging
        errorDiv.textContent = err.message + (err.code === 'storage/unauthorized' ? ' (Check your Firebase Storage Rules)' : '');
        showToast('Error adding product: ' + err.message, true); // Show a toast for the error
      }
    });

    // --- END ALL ADD PRODUCT PAGE JAVASCRIPT LOGIC ---

  } else if (section === 'manage-products') {
    mainContent.innerHTML = `<div class="card"><h2>Manage Products</h2><div id="products-list">Loading...</div></div>`;
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        document.getElementById('products-list').innerHTML = '<p>No products found.</p>';
        return;
      }
      // Fetch categories for edit dropdown
      let categories = [];
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch {}
      let html = `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Name</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Price</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Category</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Stock</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Warranty</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Actions</th></tr></thead><tbody>`;
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const docId = docSnap.id;
        // Show small image left of name, but keep td as normal (not flex)
        let imgHtml = (d.imageUrls && d.imageUrls.length) ? `<img src="${d.imageUrls[0]}" style="height:32px;width:32px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle;display:inline-block;" />` : '';
        html += `<tr id="product-row-${docId}">
          <td class="product-name-table" style="padding:8px;border-bottom:1px solid #f3f3f3;max-width:unset;" title="${d.name}">${imgHtml}<span style="vertical-align:middle;display:inline-block;">${d.name}</span></td>
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">৳${d.price}${d.regularPrice ? ` <span style='color:#888;text-decoration:line-through'>৳${d.regularPrice}</span>` : ''}</td>
          <td class="product-category-table" style="padding:8px;border-bottom:1px solid #f3f3f3">${d.category}</td>
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">${d.stock}</td>
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">${d.warranty || 'N/A'}</td>
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">
            <button data-id="${docId}" class="edit-product-btn">Edit</button>
            <button data-id="${docId}" class="delete-product-btn">Delete</button>
          </td>
        </tr>
        <tr id="edit-row-${docId}" style="display:none;background:#fffbe7"><td colspan="5">
          <form class="edit-product-form" data-id="${docId}" data-product-colors='${JSON.stringify(d.colors || [])}' data-product-sizes='${JSON.stringify(d.sizes || [])}' data-product-warranty='${d.warranty || ''}'>
            <input type="text" name="name" value="${d.name}" required style="margin:0.5rem" />
            <textarea name="description" required style="margin:0.5rem">${d.description}</textarea>
            <input type="number" name="price" value="${d.price}" required placeholder="Price" style="margin:0.5rem" />
            <input type="number" name="regularPrice" value="${d.regularPrice ?? ''}" placeholder="Regular Price (optional)" style="margin:0.5rem" />
            <select name="category" required style="margin:0.5rem">
              <option value="">Select Category</option>
              ${categories.map(cat => `<option value="${cat.name}" ${cat.name === d.category ? 'selected' : ''}>${cat.name}</option>`).join('')}
            </select>
            <input type="number" name="stock" value="${d.stock}" required placeholder="Stock" style="margin:0.5rem" />
            <input type="file" name="images" accept="image/*" multiple style="margin:0.5rem" />
            <div class="variant-edit-section" style="margin-top:18px;">
              <label style="font-weight:600;">Available Colors</label>
              <div class="color-list" data-id="${docId}" style="margin-bottom:6px;">${(d.colors || []).map((c, i) => `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">${c} <button type="button" data-index="${i}" class="remove-color-edit" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button></span>`).join('')}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
                <input type="text" class="color-input-text" placeholder="Type or select color" style="flex:1;" />
                <select class="color-input-select" style="flex:1;">
                  <option value="">Select color</option>
                  <option>Red</option>
                  <option>Blue</option>
                  <option>Green</option>
                  <option>Black</option>
                  <option>White</option>
                  <option>Yellow</option>
                  <option>Orange</option>
                  <option>Pink</option>
                  <option>Purple</option>
                  <option>Gray</option>
                  <option>Brown</option>
                  <option>Navy</option>
                  <option>Maroon</option>
                  <option>Olive</option>
                  <option>Teal</option>
                </select>
                <button type="button" class="add-color-btn-edit" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
              </div>
              <label style="font-weight:600;">Available Sizes</label>
              <div class="size-list" data-id="${docId}" style="margin-bottom:6px;">${(d.sizes || []).map((s, i) => `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">${s} <button type="button" data-index="${i}" class="remove-size-edit" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button></span>`).join('')}</div>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" class="size-input-text" placeholder="Type or select size" style="flex:1;" />
                <select class="size-input-select" style="flex:1;">
                  <option value="">Select size</option>
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                  <option>XXL</option>
                  <option>3XL</option>
                  <option>4XL</option>
                  <option>Free Size</option>
                </select>
                <button type="button" class="add-size-btn-edit" style="background:#f38124;color:#231910;padding:6px 12px;border-radius:6px;font-weight:bold;">+ Add</button>
              </div>
              <label style="font-weight:600; margin-top: 18px;">Warranty</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" class="warranty-input-text" placeholder="Type or select warranty" style="flex:1;" value="${d.warranty || ''}" />
                <select class="warranty-input-select" style="flex:1;">
                  <option value="">Select warranty period</option>
                  <option>7 Days</option>
                  <option>14 Days</option>
                  <option>1 Month</option>
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>12 Months</option>
                </select>
              </div>
            </div>
            <button type="submit">Save</button>
            <button type="button" class="cancel-edit-btn">Cancel</button>
            <span class="edit-error" style="color:#e53935;margin-left:1rem"></span>
          </form>
          <div style="margin:0.5rem 0">Current Images:<br>${(d.imageUrls||[]).map(url => `<img src="${url}" style="height:40px;margin:2px;border-radius:4px;" />`).join('')}</div>
        </td></tr>`;
      });
      html += '</tbody></table>';
      document.getElementById('products-list').innerHTML = html;
      // Edit button event
      document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = btn.getAttribute('data-id');
          document.getElementById(`edit-row-${id}`).style.display = '';
        });
      });
      // Cancel edit
      document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const form = btn.closest('form');
          const id = form.getAttribute('data-id');
          document.getElementById(`edit-row-${id}`).style.display = 'none';
        });
      });
      // Edit form submit
      document.querySelectorAll('.edit-product-form').forEach(form => {
        let editColors = (JSON.parse(form.getAttribute('data-product-colors')) || []);
        let editSizes = (JSON.parse(form.getAttribute('data-product-sizes')) || []);
        let editWarranty = form.getAttribute('data-product-warranty');

        function renderEditColorList() {
          form.querySelector('.color-list').innerHTML = editColors.map((c, i) =>
            `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">
              ${c} <button type="button" data-index="${i}" class="remove-color-edit" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button>
            </span>`
          ).join('');
        }

        function renderEditSizeList() {
          form.querySelector('.size-list').innerHTML = editSizes.map((s, i) =>
            `<span style="display:inline-block;background:#493422;color:#fff;padding:2px 8px;border-radius:6px;margin:2px;font-size:0.95em;">
              ${s} <button type="button" data-index="${i}" class="remove-size-edit" style="background:none;border:none;color:#f38124;font-weight:bold;cursor:pointer;">x</button>
            </span>`
          ).join('');
        }

        // Initial render for edit forms
        renderEditColorList();
        renderEditSizeList();

        form.querySelector('.add-color-btn-edit').onclick = function() {
          const input = form.querySelector('.color-input-text');
          const select = form.querySelector('.color-input-select');
          let val = input.value.trim();
          if (!val) val = select.value;
          if (val && !editColors.includes(val)) {
            editColors.push(val);
            renderEditColorList();
            input.value = '';
            select.value = '';
          }
        };
        form.querySelector('.color-list').onclick = function(e) {
          if (e.target.classList.contains('remove-color-edit')) {
            editColors.splice(Number(e.target.dataset.index), 1);
            renderEditColorList();
          }
        };
        form.querySelector('.add-size-btn-edit').onclick = function() {
          const input = form.querySelector('.size-input-text');
          const select = form.querySelector('.size-input-select');
          let val = input.value.trim();
          if (!val) val = select.value;
          if (val && !editSizes.includes(val)) {
            editSizes.push(val);
            renderEditSizeList();
            input.value = '';
            select.value = '';
          }
        };
        form.querySelector('.size-list').onclick = function(e) {
          if (e.target.classList.contains('remove-size-edit')) {
            editSizes.splice(Number(e.target.dataset.index), 1);
            renderEditSizeList();
          }
        };

        form.addEventListener('submit', async e => {
          e.preventDefault();
          const id = form.getAttribute('data-id');
          const name = form.elements['name'].value.trim();
          const description = form.elements['description'].value.trim();
          const price = parseFloat(form.elements['price'].value);
          const regularPriceInput = form.elements['regularPrice'].value;
          const regularPrice = regularPriceInput ? parseFloat(regularPriceInput) : null;
          const category = form.elements['category'].value;
          const stock = parseInt(form.elements['stock'].value);
          const imagesInput = form.elements['images'];
          const errorSpan = form.querySelector('.edit-error');
          errorSpan.textContent = '';

          const warrantyInputText = form.querySelector('.warranty-input-text').value.trim();
          const warrantyInputSelect = form.querySelector('.warranty-input-select').value;
          const warranty = warrantyInputText || warrantyInputSelect || null;

          if (!name || !description || isNaN(price) || !category || isNaN(stock)) {
            errorSpan.textContent = 'All required fields must be filled.';
            return;
          }
          if (regularPrice !== null && regularPrice < price) {
            errorSpan.textContent = 'Regular price should be greater than or equal to price.';
            return;
          }
          let imageUrls = null;
          try {
            if (imagesInput.files.length) {
              imageUrls = await uploadImages(imagesInput.files);
            }
            const updateData = { name, description, price, category, stock };
            if (regularPrice !== null) updateData.regularPrice = regularPrice;
            else updateData.regularPrice = null;
            if (imageUrls) updateData.imageUrls = imageUrls;
            updateData.colors = editColors;
            updateData.sizes = editSizes;
            updateData.warranty = warranty;
            await updateDoc(doc(db, 'products', id), updateData);
            showToast('Product updated!');
            loadSection('manage-products');
          } catch (err) {
            errorSpan.textContent = err.message + (err.code === 'storage/unauthorized' ? ' (Check your Firebase Storage Rules)' : '');
          }
        });
      });
      // Delete button event
      document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Are you sure you want to delete this product?')) return;
          try {
            await deleteDoc(doc(db, 'products', id));
            showToast('Product deleted!');
            loadSection('manage-products');
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    } catch (err) {
      document.getElementById('products-list').innerHTML = `<p style="color:#e53935">${err.message}</p>`;
    }
  } else if (section === 'add-category') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Add Category</h2>
        <form id="add-category-form">
          <input type="text" id="category-name" placeholder="Category Name" required />
          <button type="submit">Save Category</button>
          <div id="add-category-error" class="error"></div>
        </form>
      </div>
    `;
    document.getElementById('add-category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('category-name').value.trim();
      const errorDiv = document.getElementById('add-category-error');
      errorDiv.textContent = '';
      if (!name) {
        errorDiv.textContent = 'Category name is required.';
        return;
      }
      try {
        await addDoc(collection(db, 'categories'), {
          name,
          createdAt: new Date()
        });
        showToast('Category added successfully!');
        e.target.reset();
      } catch (err) {
        errorDiv.textContent = err.message;
      }
    });
  } else if (section === 'manage-categories') {
    mainContent.innerHTML = `<div class="card"><h2>Manage Categories</h2><div id="categories-list">Loading...</div></div>`;
    try {
      const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        document.getElementById('categories-list').innerHTML = '<p>No categories found.</p>';
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Name</th><th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Actions</th></tr></thead><tbody>`;
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const docId = docSnap.id;
        html += `<tr id="category-row-${docId}">
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">${d.name}</td>
          <td style="padding:8px;border-bottom:1px solid #f3f3f3">
            <button data-id="${docId}" class="edit-category-btn">Edit</button>
            <button data-id="${docId}" class="delete-category-btn">Delete</button>
          </td>
        </tr>
        <tr id="edit-category-row-${docId}" style="display:none;background:#fffbe7"><td colspan="2">
          <form class="edit-category-form" data-id="${docId}" style="display:flex;gap:1rem;align-items:center;">
            <input type="text" name="name" value="${d.name}" required style="margin:0.5rem" />
            <button type="submit">Save</button>
            <button type="button" class="cancel-edit-category-btn">Cancel</button>
            <span class="edit-category-error" style="color:#e53935;margin-left:1rem"></span>
          </form>
        </td></tr>`;
      });
      html += '</tbody></table>';
      document.getElementById('categories-list').innerHTML = html;
      // Edit button event
      document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = btn.getAttribute('data-id');
          document.getElementById(`edit-category-row-${id}`).style.display = '';
        });
      });
      // Cancel edit
      document.querySelectorAll('.cancel-edit-category-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const form = btn.closest('form');
          const id = form.getAttribute('data-id');
          document.getElementById(`edit-category-row-${id}`).style.display = 'none';
        });
      });
      // Edit form submit
      document.querySelectorAll('.edit-category-form').forEach(form => {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          const id = form.getAttribute('data-id');
          const name = form.elements['name'].value.trim();
          const errorSpan = form.querySelector('.edit-category-error');
          errorSpan.textContent = '';
          if (!name) {
            errorSpan.textContent = 'Category name is required.';
            return;
          }
          try {
            await updateDoc(doc(db, 'categories', id), { name });
            showToast('Category updated!');
            loadSection('manage-categories');
          } catch (err) {
            errorSpan.textContent = err.message;
          }
        });
      });
      // Delete button event
      document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Are you sure you want to delete this category?')) return;
          try {
            await deleteDoc(doc(db, 'categories', id));
            showToast('Category deleted!');
            loadSection('manage-categories');
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    } catch (err) {
      document.getElementById('categories-list').innerHTML = `<p style="color:#e53935">${err.message}</p>`;
    }
  } else if (section === 'orders') {
    mainContent.innerHTML = `<div class="card"><h2>Orders Management</h2><div id="orders-list">Loading...</div></div>`;
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        document.getElementById('orders-list').innerHTML = '<p>No orders found.</p>';
        return;
      }
      
      let html = `
        <div style="margin-bottom: 20px;">
          <select id="status-filter" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Order #</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Customer</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Items</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Total</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Status</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Date</th>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #eee">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      snap.forEach(docSnap => {
        const order = docSnap.data();
        const docId = docSnap.id;
        const orderDate = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'N/A';
        const itemCount = order.items ? order.items.length : 0;
        
        html += `
          <tr class="order-row" data-status="${order.status}">
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              <strong>${order.orderNumber}</strong>
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              <div><strong>${order.customerName}</strong></div>
              <div style="font-size: 0.9em; color: #666;">${order.customerPhone}</div>
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              ${itemCount} items
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              <strong>৳${order.total?.toFixed(2) || '0.00'}</strong>
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              <span class="status-badge status-${order.status}">${order.status}</span>
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              ${orderDate}
            </td>
            <td style="padding:8px;border-bottom:1px solid #f3f3f3">
              <button data-id="${docId}" class="view-order-btn">View</button>
              <button data-id="${docId}" class="update-status-btn">Update Status</button>
            </td>
          </tr>
        `;
      });
      
      html += '</tbody></table>';
      document.getElementById('orders-list').innerHTML = html;
      
      // Add status filter functionality
      document.getElementById('status-filter').addEventListener('change', (e) => {
        const filterValue = e.target.value;
        const rows = document.querySelectorAll('.order-row');
        
        rows.forEach(row => {
          if (!filterValue || row.getAttribute('data-status') === filterValue) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
      
      // View order details
      document.querySelectorAll('.view-order-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-id');
          const orderDoc = await getDocs(query(collection(db, 'orders'), where('__name__', '==', id)));
          const order = orderDoc.docs[0]?.data();
          
          if (order) {
            const itemsHtml = order.items.map(item => `
              <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="width: 50px; height: 50px; margin-right: 15px;">
                  ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">` : '<div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.8em; color: #999;">No Image</div>'}
                </div>
                <div style="flex: 1;">
                  <div><strong>${item.name}</strong></div>
                  <div style="color: #666;">৳${item.price} x ${item.quantity}</div>
                </div>
              </div>
            `).join('');
            
            const modalHtml = `
              <div id="order-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Order Details - ${order.orderNumber}</h3>
                    <button onclick="document.getElementById('order-modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                  </div>
                  
                  <div style="margin-bottom: 20px;">
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${order.customerName}</p>
                    <p><strong>Phone:</strong> ${order.customerPhone}</p>
                    <p><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
                    <p><strong>Address:</strong> ${order.deliveryAddress}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                    ${order.mobileNumber ? `<p><strong>Mobile Number:</strong> ${order.mobileNumber}</p>` : ''}
                  </div>
                  
                  <div style="margin-bottom: 20px;">
                    <h4>Order Items</h4>
                    ${itemsHtml}
                  </div>
                  
                  <div style="margin-bottom: 20px;">
                    <h4>Order Summary</h4>
                    <p><strong>Subtotal:</strong> ৳${order.subtotal?.toFixed(2) || '0.00'}</p>
                    <p><strong>Delivery Fee:</strong> ৳${order.deliveryFee || '0.00'}</p>
                    <p><strong>Total:</strong> ৳${order.total?.toFixed(2) || '0.00'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
                    ${order.orderNotes ? `<p><strong>Notes:</strong> ${order.orderNotes}</p>` : ''}
                  </div>
                </div>
              </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
          }
        });
      });
      
      // Update order status
      document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-id');
          const row = btn.closest('tr');
          const currentStatus = row.getAttribute('data-status');
          
          showStatusUpdateModal(id, currentStatus);
        });
      });
      
    } catch (err) {
      document.getElementById('orders-list').innerHTML = `<p style="color:#e53935">${err.message}</p>`;
    }
  }
}

function showStatusUpdateModal(orderId, currentStatus) {
  // Remove existing modal if any
  const existingModal = document.getElementById('status-update-modal');
  if (existingModal) {
    existingModal.remove();
  }

  let selectedStatus = currentStatus;
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  const modalHtml = `
    <div id="status-update-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">Update Order Status</h3>
          <button id="close-status-modal-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
        </div>
        
        <div id="status-options-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px;">
          ${statuses.map(status => `
            <button class="status-option-btn" data-status="${status}" style="padding: 8px 15px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; background: ${currentStatus === status ? '#493422' : '#f0f0f0'}; color: ${currentStatus === status ? 'white' : 'black'};">
              ${status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          `).join('')}
        </div>
        
        <div style="text-align: right;">
          <button id="final-update-status-btn" style="background: #43a047; color: white; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;">Update Status</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // --- Add Modal Logic ---
  const modal = document.getElementById('status-update-modal');
  const closeBtn = document.getElementById('close-status-modal-btn');
  const finalUpdateBtn = document.getElementById('final-update-status-btn');
  const statusButtons = document.querySelectorAll('.status-option-btn');

  const closeModal = () => modal.remove();

  closeBtn.onclick = closeModal;

  // Close modal when clicking on the background overlay
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'status-update-modal') {
      closeModal();
    }
  });

  statusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update selected status variable
      selectedStatus = btn.getAttribute('data-status');
      
      // Update styles for all buttons
      statusButtons.forEach(b => {
        b.style.background = '#f0f0f0';
        b.style.color = 'black';
      });
      
      // Highlight the clicked button
      btn.style.background = '#493422';
      btn.style.color = 'white';
    });
  });

  finalUpdateBtn.addEventListener('click', async () => {
    if (selectedStatus === currentStatus) {
      showToast('Please select a different status to update.', true);
      return;
    }
    
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: selectedStatus });
      showToast('Order status updated successfully!');
      closeModal();
      loadSection('orders');
    } catch (err) {
      showToast('Error updating status: ' + err.message, true);
    }
  });
} 