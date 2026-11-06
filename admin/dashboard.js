import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

import { products as starterProducts } from '../js/catalog.js';
import { firebaseConfig } from '../js/firebase-config.js';


/* =========================================
   FIREBASE INITIALIZATION
========================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const $ = selector => document.querySelector(selector);

let liveProducts = [];
let liveOrders = [];
let liveFeedback = [];
let notificationHistory = JSON.parse(localStorage.getItem('lc_admin_notifications') || '[]');
let ordersInitialised = false;
let feedbackInitialised = false;
let previousOrderStates = new Map();


/* =========================================
   NOTIFICATIONS
========================================= */

function notice(message) {
  $('#adminToast').textContent = message;
  $('#adminToast').classList.add('show');

  setTimeout(() => {
    $('#adminToast').classList.remove('show');
  }, 2500);
}


function pushAdminNotification(title, message, type = 'info') {
  const item = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, message, type, time: new Date().toISOString() };
  notificationHistory.unshift(item);
  notificationHistory = notificationHistory.slice(0, 50);
  localStorage.setItem('lc_admin_notifications', JSON.stringify(notificationHistory));
  renderAdminNotifications();
  notice(`${title}: ${message}`);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`Liquid Crafters · ${title}`, { body: message });
  }
}

function renderAdminNotifications() {
  const list = $('#adminNotificationList');
  if (!list) return;
  list.innerHTML = notificationHistory.map(item => `
    <article class="admin-notification-item">
      <strong>${esc(item.title)}</strong>
      <p>${esc(item.message)}</p>
      <small>${esc(new Date(item.time).toLocaleString())}</small>
    </article>
  `).join('') || '<p class="status-message">No notifications yet. New orders and feedback will appear here.</p>';
}

$('#enableBrowserNotifications')?.addEventListener('click', async () => {
  if (!('Notification' in window)) { notice('Browser notifications are not supported here.'); return; }
  const permission = await Notification.requestPermission();
  notice(permission === 'granted' ? 'Browser notifications enabled.' : 'Browser notification permission was not granted.');
});

$('#clearAdminNotifications')?.addEventListener('click', () => {
  notificationHistory = [];
  localStorage.removeItem('lc_admin_notifications');
  renderAdminNotifications();
});


/* =========================================
   HTML SAFETY
========================================= */

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}


/* =========================================
   DASHBOARD NAVIGATION
========================================= */

function showTab(name) {
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.toggle(
      'active',
      section.id === 'tab-' + name
    );
  });

  document.querySelectorAll('.admin-tab').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.tab === name
    );
  });
}

document.querySelectorAll('[data-tab]').forEach(button => {
  button.onclick = () => showTab(button.dataset.tab);
});

document.querySelectorAll('[data-jump]').forEach(button => {
  button.onclick = () => showTab(button.dataset.jump);
});


/* =========================================
   PRODUCT SIZE HELPERS
   Matches the original dashboard.html fields:
   #pPrice and #pSizes (comma-separated sizes)
========================================= */

function readProductSizes() {
  return ($('#pSizes')?.value || '')
    .split(',')
    .map(size => size.trim())
    .filter(Boolean);
}

function writeProductSizes(sizes = []) {
  const field = $('#pSizes');
  if (field) {
    field.value = (sizes || []).map(size =>
      typeof size === 'string' ? size : (size?.name || '')
    ).filter(Boolean).join(', ');
  }
}


/* =========================================
   ADMIN AUTHENTICATION
========================================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = 'index.html';
    return;
  }

  try {

    const adminDoc = await getDoc(
      doc(db, 'admins', user.uid)
    );

    if (!adminDoc.exists() || adminDoc.data().active !== true) {

      await signOut(auth);

      location.href = 'index.html';

      return;
    }

    $('#adminEmailLabel').textContent =
      user.email || 'Authorised Admin';


    /* =====================================
       LIVE PRODUCT SYNC
    ===================================== */

    const prodRef = collection(db, 'products');

    onSnapshot(
      prodRef,
      snapshot => {

        liveProducts = snapshot.docs.map(d => ({
          ...d.data(),

          // Firestore document ID
          id: d.id,

          // Internal catalogue ID
          productId: d.data().id || ''
        }));

        renderProducts();

        $('#statProducts').textContent =
          liveProducts.length;

      },
      error => notice('Products: ' + error.message)
    );


    /* =====================================
       LIVE ORDER SYNC
    ===================================== */

    onSnapshot(
      collection(db, 'orders'),
      snapshot => {
        if (ordersInitialised) {
          snapshot.docChanges().forEach(change => {
            const order = { id: change.doc.id, ...change.doc.data() };
            if (change.type === 'added') {
              pushAdminNotification('New order received', `${order.customerName || 'A customer'} placed order ${order.orderId || order.id}.` , 'order');
            } else if (change.type === 'modified') {
              const previous = previousOrderStates.get(order.id) || {};
              if (order.status === 'Delivered' && previous.status !== 'Delivered') {
                pushAdminNotification('Order delivered', `Order ${order.orderId || order.id} has been marked delivered.`, 'delivered');
              }
              if (['Paid', 'Success', 'Payment Successful', 'Captured'].includes(order.paymentStatus) && !['Paid', 'Success', 'Payment Successful', 'Captured'].includes(previous.paymentStatus)) {
                pushAdminNotification('Payment successful', `Payment for order ${order.orderId || order.id} is marked ${order.paymentStatus}.`, 'payment');
              }
            }
          });
        }
        liveOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        previousOrderStates = new Map(liveOrders.map(order => [order.id, { status: order.status, paymentStatus: order.paymentStatus }]));
        ordersInitialised = true;
        renderOrders();
        $('#statOrders').textContent = liveOrders.length;
        $('#statPending').textContent = liveOrders.filter(order => !['Delivered','Rejected','Cancelled'].includes(order.status)).length;
      },
      error => console.warn(error)
    );

    // LIVE CUSTOMER FEEDBACK + ADMIN ALERTS
    onSnapshot(collection(db, 'feedback'), snapshot => {
      if (feedbackInitialised) {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const feedback = change.doc.data();
            pushAdminNotification('New customer feedback', `${feedback.name || 'A customer'} sent feedback: ${(feedback.message || '').slice(0, 110)}`, 'feedback');
          }
        });
      }
      liveFeedback = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      feedbackInitialised = true;
      renderFeedback();
    }, error => console.warn('Feedback listener:', error));

    renderAdminNotifications();

  } catch (error) {

    console.error(error);

    notice('Authentication error: ' + error.message);

  }

});


/* =========================================
   ADMIN LOGOUT
========================================= */

$('#adminLogout').onclick = async () => {

  await signOut(auth);

  location.href = 'index.html';

};


/* =========================================
   PRODUCT TABLE
========================================= */

function renderProducts() {

  const search =
    ($('#adminProductSearch')?.value || '').toLowerCase();

  $('#adminProductRows').innerHTML =

    liveProducts

      .filter(product =>
        product.name?.toLowerCase().includes(search)
      )

      .map(product => {

        const prices = (product.sizes || [])
          .filter(size =>
            typeof size === 'object' &&
            Number.isFinite(Number(size.price))
          )
          .map(size => Number(size.price));

        const displayPrice = prices.length
          ? 'From ₹' + Math.min(...prices)
          : product.price == null
            ? '—'
            : '₹' + esc(product.price);

        return `
          <tr>

            <td>${esc(product.name)}</td>

            <td>${esc(product.category)}</td>

            <td>${displayPrice}</td>

            <td>${esc(product.stock ?? '—')}</td>

            <td>
              ${product.available === false
                ? 'Unavailable'
                : 'Available'}
            </td>

            <td>

              <button
                class="table-action"
                data-edit="${esc(product.id)}"
              >
                Edit
              </button>

              <button
                class="table-delete"
                data-delete="${esc(product.id)}"
              >
                Delete
              </button>

            </td>

          </tr>
        `;

      })

      .join('') ||

    '<tr><td colspan="6">No products found. Import the starter catalogue or add a product.</td></tr>';

}


/* =========================================
   ORDER TABLE
========================================= */

function renderOrders() {

  $('#adminOrderRows').innerHTML =

    liveOrders.map(order => `

      <tr>

        <td>${esc(order.orderId || order.id)}</td>

        <td>${esc(order.customerName || 'Customer')}</td>

        <td>
          ${order.total == null
            ? '—'
            : '₹' + esc(order.total)}
        </td>

        <td>${esc(order.status || 'Order Placed')}</td>

        <td>${esc(order.paymentStatus || 'Not recorded')}</td>

        <td>

          <select data-order-status="${esc(order.id)}">

            <option ${order.status === 'Order Received' ? 'selected' : ''}>Order Received</option>
            <option ${order.status === 'Order Placed' ? 'selected' : ''}>Order Placed</option>
            <option>Payment Verification Pending</option>
            <option>Payment Verified</option>
            <option>Order Accepted</option>
            <option>Preparing</option>
            <option>Ready</option>
            <option>Out for Delivery</option>
            <option>Delivered</option>
            <option>Rejected</option>
            <option>Cancelled</option>

          </select>

          <select data-order-payment="${esc(order.id)}" aria-label="Payment status">
            <option value="Pending" ${order.paymentStatus === 'Pending' ? 'selected' : ''}>Payment Pending (COD)</option>
            <option value="Awaiting Verification" ${order.paymentStatus === 'Awaiting Verification' ? 'selected' : ''}>Razorpay — Awaiting Verification</option>
            <option value="Paid" ${order.paymentStatus === 'Paid' ? 'selected' : ''}>Paid / Collected</option>
            <option value="Failed" ${order.paymentStatus === 'Failed' ? 'selected' : ''}>Failed</option>
          </select>

          <button class="table-action" data-update-order="${esc(order.id)}">Update</button>
          <button class="table-action" data-close-order="${esc(order.id)}" ${order.status === 'Closed' ? 'disabled' : ''} >${order.status === 'Closed' ? 'Order Closed' : 'Close Order'}</button>

        </td>

      </tr>

    `).join('') ||

    '<tr><td colspan="6">No orders have been received.</td></tr>';

}


/* =========================================
   CUSTOMER FEEDBACK
========================================= */
function renderFeedback() {
  const body = $('#adminFeedbackRows');
  if (!body) return;
  body.innerHTML = liveFeedback.map(item => `
    <tr><td>${esc(item.name || 'Customer')}</td><td>${esc(item.message || '')}</td><td>${esc(item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Recently')}</td></tr>
  `).join('') || '<tr><td colspan="3">No feedback received yet.</td></tr>';
}

/* =========================================
   PRODUCT SEARCH
========================================= */

$('#adminProductSearch').oninput = renderProducts;


/* =========================================
   ADD NEW PRODUCT
========================================= */

$('#addProduct').onclick = () => {

  $('#productForm').hidden = false;

  $('#productForm').reset();

  $('#productId').value = '';

  writeProductSizes([]);

  $('#productForm').scrollIntoView({
    behavior: 'smooth'
  });

};


/* =========================================
   CANCEL PRODUCT FORM
========================================= */

$('#cancelProduct').onclick = () => {

  $('#productForm').hidden = true;

};


/* =========================================
   SAVE PRODUCT
========================================= */

$('#productForm').onsubmit = async event => {
  event.preventDefault();

  const id = $('#productId').value;
  const priceValue = $('#pPrice').value.trim();
  const sizes = readProductSizes();

  if (!priceValue || !Number.isFinite(Number(priceValue)) || Number(priceValue) < 0) {
    notice('Enter a valid product price.');
    return;
  }

  if (!sizes.length) {
    notice('Enter at least one size, for example: Regular, Medium, Large.');
    return;
  }

  const data = {
    name: $('#pName').value.trim(),
    category: $('#pCategory').value,
    subCategory: $('#pCategory').value === 'Sips' ? $('#pSub').value : '',
    price: Number(priceValue),
    sizes,
    stock: Number($('#pStock').value || 0),
    image: $('#pImage').value.trim() || 'fruit-1.jpg',
    description: $('#pDescription').value.trim(),
    available: $('#pAvailable').value === 'true',
    updatedAt: serverTimestamp()
  };

  if (!data.name) {
    notice('Enter the product name.');
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), data);
    } else {
      await addDoc(collection(db, 'products'), {
        ...data,
        createdAt: serverTimestamp()
      });
    }

    $('#productForm').hidden = true;
    notice('Product saved successfully.');
  } catch (error) {
    console.error(error);
    notice('Save failed: ' + error.message);
  }
};


/* =========================================
   EDIT / DELETE PRODUCTS
========================================= */

$('#adminProductRows').onclick = async event => {

  const editButton =
    event.target.closest('[data-edit]');

  const deleteButton =
    event.target.closest('[data-delete]');


  /* -------------------------------------
     EDIT PRODUCT
  ------------------------------------- */

  if (editButton) {

    const product = liveProducts.find(
      item => item.id === editButton.dataset.edit
    );

    if (!product) return;

    $('#productId').value = product.id;

    $('#pName').value = product.name || '';

    $('#pCategory').value =
      product.category || 'Fruit Juices';

    $('#pSub').value =
      product.subCategory || '';

    $('#pStock').value =
      product.stock ?? 0;

    $('#pImage').value =
      product.image || '';

    $('#pDescription').value =
      product.description || '';

    $('#pAvailable').value =
      product.available === false
        ? 'false'
        : 'true';


    $('#pPrice').value = product.price ?? '';
    writeProductSizes(product.sizes || []);

    $('#productForm').hidden = false;

    $('#productForm').scrollIntoView({
      behavior: 'smooth'
    });

  }


  /* -------------------------------------
     DELETE PRODUCT
  ------------------------------------- */

  if (
    deleteButton &&
    confirm('Delete this product from the live catalogue?')
  ) {

    try {

      await deleteDoc(
        doc(db, 'products', deleteButton.dataset.delete)
      );

      notice('Product deleted successfully.');

    } catch (error) {

      notice(error.message);

    }

  }

};


/* =========================================
   UPDATE ORDER STATUS
========================================= */

$('#adminOrderRows').onclick = async event => {
  const closeButton = event.target.closest('[data-close-order]');
  if (closeButton) {
    const id = closeButton.dataset.closeOrder;
    const order = liveOrders.find(item => item.id === id);
    if (!order) return;
    if (order.status !== 'Delivered') {
      notice('Cannot close: mark delivery as Delivered first.'); return;
    }
    if (order.paymentStatus !== 'Paid') {
      notice('Cannot close: confirm that payment has been collected or verified first.'); return;
    }
    const confirmed = window.confirm(`Close order ${order.orderId || id}? Confirm delivery and payment are both complete.`);
    if (!confirmed) return;
    closeButton.disabled = true;
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'Closed', deliveryStatus: 'Delivered', paymentStatus: 'Paid',
        closedAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      notice('Order closed successfully. Delivery and payment are complete.');
    } catch (error) {
      closeButton.disabled = false;
      notice('Could not close order: ' + error.message);
    }
    return;
  }

  const button = event.target.closest('[data-update-order]');
  if (!button) return;
  const id = button.dataset.updateOrder;
  const statusElement = document.querySelector(`[data-order-status="${id}"]`);
  const paymentElement = document.querySelector(`[data-order-payment="${id}"]`);
  if (!statusElement || !paymentElement) return;
  const status = statusElement.value;
  const paymentStatus = paymentElement.value;
  try {
    await updateDoc(doc(db, 'orders', id), {
      status,
      deliveryStatus: status === 'Delivered' ? 'Delivered' : (liveOrders.find(order => order.id === id)?.deliveryStatus || 'Pending'),
      paymentStatus,
      updatedAt: serverTimestamp()
    });
    notice('Order and payment details updated.');
  } catch (error) {
    notice(error.message);
  }
};


/* =========================================
   IMPORT STARTER PRODUCTS
========================================= */

$('#seedProducts').onclick = async () => {

  if (liveProducts.length) {

    notice('Catalogue already has products.');

    return;

  }

  if (
    !confirm(
      `Import ${starterProducts.length} starter products into Firestore?`
    )
  ) return;

  try {

    const batch = writeBatch(db);

    starterProducts.forEach(product => {

      const productRef =
        doc(collection(db, 'products'));

      batch.set(productRef, {

        ...product,

        price: null,

        sizes: [],

        stock: 0,

        available: true,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()

      });

    });

    await batch.commit();

    $('#seedMessage').textContent =
      'Starter catalogue imported. Edit each product to add its price, sizes, stock and image path.';

  } catch (error) {

    $('#seedMessage').textContent =
      'Import failed: ' + error.message;

  }

};
