import { products as starterProducts } from './catalog.js';
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, where } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
const app=initializeApp(firebaseConfig), db=getFirestore(app), auth=getAuth(app);
const $=s=>document.querySelector(s);
const categories=[
{name:'Fruit Juices',slug:'fruit-juices',image:'fruit-1.jpg',desc:'Bright, fruit-forward refreshment.'},
{name:'Milkshakes',slug:'milkshakes',image:'milkshake-1.jpg',desc:'Creamy favourites and indulgent blends.'},
{name:'Mojitos',slug:'mojitos',image:'mojito-1.jpg',desc:'Cool, lively flavours.'},
{name:'Sips',slug:'sips',image:'sips-coffee-2.jpg',desc:'Tea and coffee favourites.'},
{name:'Soft Drinks',slug:'soft-drinks',image:'softdrink-1.jpg',desc:'Familiar fizzy favourites.'},
{name:'All Drinks',slug:'all-drinks',image:'fruit-2.jpg',desc:'Explore the complete menu.'}];
const features=[
['✦','Freshly Prepared','Fresh ingredients and beverages prepared with care.'],
['♡','Crafted with Passion','Every beverage receives attention to taste and quality.'],
['◈','Wide Variety','Juices, milkshakes, mojitos, tea, coffee and more.'],
['↗','Quick Delivery','Convenient doorstep delivery.'],
['₹','Affordable Pricing','Delicious beverages at reasonable prices.'],
['⌁','Reliable Delivery','Shop-managed delivery within 15 km.'],
['≋','Made Your Way','Choose available sizes and quantities.'],
['♧','Customer First','Your feedback helps us improve.']];
let products=[...starterProducts], activeCategory='Fruit Juices', activeSub='All', selectedProduct=null, cart=JSON.parse(localStorage.getItem('lc_cart')||'[]'), wishlist=JSON.parse(localStorage.getItem('lc_wishlist')||'[]'), confirmation=null;
const isProductUnavailable = product => product?.available === false || (product?.stock !== undefined && Number(product.stock) <= 0);
const saveWishlist = () => localStorage.setItem('lc_wishlist', JSON.stringify(wishlist));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
function openDialog(id){$('#'+id).showModal()}
function closeDialog(id){$('#'+id).close()}
function showPage(name){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$('#page-'+name)?.classList.add('active');document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===name));window.scrollTo({top:0,behavior:'smooth'});$('#mainNav').classList.remove('open')}
function categoryMarkup(c){return `<button class="category-tile" data-cat="${safe(c.name)}"><img src="assets/products/${safe(c.image)}" alt=""><b>${safe(c.name)}</b></button>`}
function renderCategories(){const tiles=categories.map(categoryMarkup).join('');$('#homeCategories').innerHTML=tiles;$('#menuCategories').innerHTML=categories.map(c=>`<article class="category-card" data-cat="${safe(c.name)}"><img src="assets/products/${safe(c.image)}" alt="${safe(c.name)}"><div><h3>${safe(c.name)}</h3><p>${safe(c.desc)}</p><b>Explore collection →</b></div></article>`).join('')}
function renderFeatures(){$('#featureGrid').innerHTML=features.map((f,i)=>`<button class="feature-bubble" data-feature="${i}"><span class="sym">${f[0]}</span><span>${f[1]}</span></button>`).join('')}
function openCategory(name){activeCategory=name;activeSub='All';$('#categoryName').textContent=name;$('#categoryDesc').textContent=categories.find(c=>c.name===name)?.desc||'';$('#categoryEyebrow').textContent=name.toUpperCase();const subs=name==='Sips'?['All','Tea','Coffee']:['All'];$('#subFilters').innerHTML=subs.map(s=>`<button class="${s===activeSub?'active':''}" data-sub="${s}">${s}</button>`).join('');$('#productSearch').value='';renderProducts();showPage('category')}
function renderProducts(){const q=$('#productSearch').value.trim().toLowerCase();let list=products.filter(p=>activeCategory==='All Drinks'||p.category===activeCategory);if(activeSub!=='All')list=list.filter(p=>p.subCategory===activeSub);if(q)list=list.filter(p=>p.name.toLowerCase().includes(q));$('#productGrid').innerHTML=list.length?list.map(p=>`<article class="product-card" data-product="${safe(p.id)}"><img src="${p.image?.startsWith('http')?safe(p.image):'assets/products/'+safe(p.image||'fruit-1.jpg')}" alt="${safe(p.name)}"><div><h3>${safe(p.name)}</h3><p>${safe(p.description||'Prepared with care.')}</p><b>${p.price!=null?'₹'+safe(p.price):'Price to be confirmed'}</b></div></article>`).join(''):'<p class="empty-state">No drinks match your search.</p>'}



function openProduct(id) {
  selectedProduct = products.find(
    p => String(p.id) === String(id)
  );

  if (!selectedProduct) return;

  $('#dialogImage').src =
    selectedProduct.image?.startsWith('http')
      ? selectedProduct.image
      : 'assets/products/' + (selectedProduct.image || 'fruit-1.jpg');

  $('#dialogCategory').textContent =
    selectedProduct.subCategory || selectedProduct.category;

  $('#dialogName').textContent = selectedProduct.name;

  $('#dialogDescription').textContent =
    selectedProduct.description || '';

  const sizes = selectedProduct.sizes?.length
    ? selectedProduct.sizes
    : ['Regular', 'Medium', 'Large'];

  $('#dialogSize').innerHTML = sizes.map(size => {

    const name = typeof size === 'string'
      ? size
      : size.name;

    const price = typeof size === 'string'
      ? selectedProduct.price
      : size.price;

    return `
      <option
        value="${safe(name)}"
        data-price="${price ?? ''}"
      >
        ${safe(name)}${price != null ? ' — ₹' + price : ' — Price not set'}
      </option>
    `;

  }).join('');

  // Create a price display below the size selector
  let priceDisplay = $('#dialogSelectedPrice');

  if (!priceDisplay) {
    $('#dialogSize').insertAdjacentHTML(
      'afterend',
      '<p id="dialogSelectedPrice" class="selected-price"></p>'
    );

    priceDisplay = $('#dialogSelectedPrice');
  }

  function updateSelectedPrice() {
    const option = $('#dialogSize').selectedOptions[0];

    const price = option?.dataset.price;

    priceDisplay.textContent =
      price !== ''
        ? 'Price: ₹' + price
        : 'Price not set';
  }

  $('#dialogSize').onchange = updateSelectedPrice;

  updateSelectedPrice();

  // Keep the button clickable so unavailable items can show a helpful message.
  $('#addToCart').disabled = false;
  $('#addToWishlist').textContent = wishlist.some(x => String(x.id) === String(selectedProduct.id))
    ? '♥ Remove from Wishlist'
    : '♡ Save to Wishlist';

  openDialog('productDialog');
}




function saveCart(){localStorage.setItem('lc_cart',JSON.stringify(cart));$('#cartCount').textContent=cart.reduce((a,x)=>a+x.qty,0)}


function renderCart() {

  const cartLines = $('#cartLines');

  const total = cart.reduce((sum, item) => {
    return sum + (Number(item.price) * Number(item.qty || 1));
  }, 0);

  const hasMissingPrice = cart.some(item =>
    item.price == null || !Number.isFinite(Number(item.price))
  );

  cartLines.innerHTML = cart.length

    ? cart.map((item, index) => `

        <div class="cart-line">

          <img
            src="${
              item.image?.startsWith('http')
                ? safe(item.image)
                : 'assets/products/' + safe(item.image || 'fruit-1.jpg')
            }"
            alt="${safe(item.name)}"
          >

          <div class="cart-item-details">

            <b>${safe(item.name)}</b>

            <small>${safe(item.size)}</small>

            <small>
              Price: ₹${Number(item.price).toFixed(2)}
            </small>

            <div class="quantity-control">

              <button
                type="button"
                class="quantity-btn"
                data-qty-minus="${index}"
                aria-label="Decrease quantity"
              >−</button>

              <span class="quantity-value">
                ${item.qty || 1}
              </span>

              <button
                type="button"
                class="quantity-btn"
                data-qty-plus="${index}"
                aria-label="Increase quantity"
              >+</button>

            </div>

            <strong>
              Subtotal: ₹${(
                Number(item.price) * Number(item.qty || 1)
              ).toFixed(2)}
            </strong>

          </div>

          <button
            class="text-button"
            data-remove-cart="${index}"
          >
            Remove
          </button>

        </div>

      `).join('')

    : '<p class="empty-state">Your cart is waiting for something refreshing.</p>';


  let totalBox = $('#cartGrandTotal');

  if (!totalBox) {

    cartLines.insertAdjacentHTML(
      'afterend',
      '<div id="cartGrandTotal" class="cart-grand-total"></div>'
    );

    totalBox = $('#cartGrandTotal');
  }

  totalBox.innerHTML = cart.length

    ? `
        <div class="cart-total-row">
          <span>Subtotal</span>
          <strong>
            ${hasMissingPrice ? 'Price unavailable' : '₹' + total.toFixed(2)}
          </strong>
        </div>

        <div class="cart-total-row grand-total">
          <span>Grand Total</span>
          <strong>
            ${hasMissingPrice ? 'Price unavailable' : '₹' + total.toFixed(2)}
          </strong>
        </div>
      `

    : '';

}

function renderWishlist(){
  const container = $('#wishlistLines');
  container.innerHTML = wishlist.length ? wishlist.map((x, index) => `
    <div class="cart-line">
      <img src="${x.image?.startsWith('http') ? safe(x.image) : 'assets/products/' + safe(x.image || 'fruit-1.jpg')}" alt="${safe(x.name)}">
      <div class="cart-item-details"><b>${safe(x.name)}</b><small>${safe(x.category)}</small></div>
      <button type="button" class="text-button" data-remove-wishlist="${index}" aria-label="Remove ${safe(x.name)} from wishlist">Remove</button>
    </div>`).join('') : '<p class="empty-state">Your saved favourites will appear here.</p>';
  container.querySelectorAll('[data-remove-wishlist]').forEach(button => {
    button.addEventListener('click', () => {
      wishlist.splice(Number(button.dataset.removeWishlist), 1);
      saveWishlist();
      renderWishlist();
      if (selectedProduct) $('#addToWishlist').textContent = wishlist.some(x => String(x.id) === String(selectedProduct.id)) ? '♥ Remove from Wishlist' : '♡ Save to Wishlist';
      toast('Removed from wishlist');
    });
  });
}
function listenProducts(){try{onSnapshot(query(collection(db,'products')),snap=>{if(!snap.empty){


    products = snap.docs.map(d => ({
  ...d.data(),
  id: d.data().id || d.id,
  firestoreId: d.id
}));
    
    
    renderProducts()}



},err=>console.warn('Products live sync unavailable; using starter catalogue.',err))}catch(e){console.warn(e)}}
renderCategories();renderFeatures();saveCart();listenProducts();$('#year').textContent=new Date().getFullYear();
document.addEventListener('click', e => {

  const page = e.target.closest('[data-page]');

  if (page) {
    showPage(page.dataset.page);
    return;
  }

  const cat = e.target.closest('[data-cat]');

  if (cat) {
    openCategory(cat.dataset.cat);
    return;
  }

  const feature = e.target.closest('[data-feature]');

  if (feature) {
    const f = features[Number(feature.dataset.feature)];

    $('#featureTitle').textContent = f[1];
    $('#featureText').textContent = f[2];
    $('#featureMessage').hidden = false;

    document.querySelectorAll('.feature-bubble').forEach(b =>
      b.classList.toggle('selected', b === feature)
    );

    return;
  }

  const product = e.target.closest('[data-product]');

  if (product) {
    openProduct(product.dataset.product);
    return;
  }

  const sub = e.target.closest('[data-sub]');

  if (sub) {
    activeSub = sub.dataset.sub;

    $('#subFilters').querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b === sub)
    );

    renderProducts();
    return;
  }

  // INCREASE QUANTITY
  const plus = e.target.closest('[data-qty-plus]');

  if (plus) {
    const index = Number(plus.dataset.qtyPlus);

    if (!cart[index]) return;

    cart[index].qty = Number(cart[index].qty || 1) + 1;

    saveCart();
    renderCart();
    return;
  }

  // DECREASE QUANTITY
  const minus = e.target.closest('[data-qty-minus]');

  if (minus) {
    const index = Number(minus.dataset.qtyMinus);

    if (!cart[index]) return;

    cart[index].qty = Math.max(
      1,
      Number(cart[index].qty || 1) - 1
    );

    saveCart();
    renderCart();
    return;
  }

  // REMOVE PRODUCT
  const rem = e.target.closest('[data-remove-cart]');

  if (rem) {
    cart.splice(Number(rem.dataset.removeCart), 1);

    saveCart();
    renderCart();
    return;
  }

  // CLOSE DIALOG
  const close = e.target.closest('[data-close]');

  if (close) {
    closeDialog(close.dataset.close);
    return;
  }

});





$('#mobileMenu').onclick=()=>$('#mainNav').classList.toggle('open');
$('#featureClose').onclick=()=>{$('#featureMessage').hidden=true;document.querySelectorAll('.feature-bubble').forEach(b=>b.classList.remove('selected'))};
$('#productSearch').oninput=renderProducts;
$('#searchOpen').onclick=()=>openDialog('searchDialog');
$('#globalSearch').oninput=()=>{const q=$('#globalSearch').value.toLowerCase();const found=products.filter(p=>p.name.toLowerCase().includes(q)).slice(0,10);$('#searchResults').innerHTML=found.map(p=>`<button class="search-result" data-product="${safe(p.id)}">${safe(p.name)} · ${safe(p.category)}</button>`).join('')};
$('#wishlistOpen').onclick=()=>{renderWishlist();openDialog('wishlistDialog')};
$('#cartOpen').onclick=()=>{renderCart();openDialog('cartDialog')};
$('#accountOpen').onclick=()=>openDialog('accountDialog');
$('#contactOpen').onclick=()=>openDialog('contactDialog');
$('#socialOpen').onclick=()=>openDialog('contactDialog');
$('#feedbackOpen').onclick=()=>openDialog('feedbackDialog');
$('#showContactDetails').onclick=()=>{$('#contactDetails').hidden=!$('#contactDetails').hidden;$('#showContactDetails').textContent=$('#contactDetails').hidden?'Show contact details':'Hide contact details'};


$('#addToCart').onclick = () => {

  if (!selectedProduct) return;
  if (isProductUnavailable(selectedProduct)) {
    toast('Currently unavailable. Please order this item later.');
    return;
  }

  const selectedOption =
    $('#dialogSize').selectedOptions[0];

  const selectedSize = selectedOption.value;

  const selectedPrice =
    selectedOption.dataset.price === ''
      ? null
      : Number(selectedOption.dataset.price);

  if (
    selectedPrice === null ||
    !Number.isFinite(selectedPrice)
  ) {
    toast('Price is not available for this size.');
    return;
  }

  cart.push({
    id: selectedProduct.id,
    name: selectedProduct.name,
    category: selectedProduct.category,
    image: selectedProduct.image,
    size: selectedSize,
    price: selectedPrice,
    qty: 1
  });

  saveCart();

  closeDialog('productDialog');

  toast('Added to your cart');
};



$('#addToWishlist').onclick = () => {
  if (!selectedProduct) return;
  const index = wishlist.findIndex(x => String(x.id) === String(selectedProduct.id));
  if (index >= 0) {
    wishlist.splice(index, 1);
    toast('Removed from wishlist');
  } else {
    wishlist.push({ ...selectedProduct });
    toast('Added to wishlist');
  }
  saveWishlist();
  $('#addToWishlist').textContent = wishlist.some(x => String(x.id) === String(selectedProduct.id))
    ? '♥ Remove from Wishlist'
    : '♡ Save to Wishlist';
  if ($('#wishlistDialog').open) renderWishlist();
};
$('#checkoutButton').onclick=()=>{
  $('#placeOrderButton').disabled = false;
  $('#placeOrderButton').textContent = 'Place Order';
  if(!cart.length){toast('Your cart is empty');return}
  if(!auth.currentUser){closeDialog('cartDialog');openDialog('accountDialog');toast('Please sign in before checkout');return}
  const user=auth.currentUser;
  $('#orderCustomerName').value=user.displayName||'';
  $('#orderCustomerPhone').value=localStorage.getItem('lc_delivery_phone')||'';
  $('#checkoutSummary').innerHTML=`<div class="cart-total-row grand-total"><span>Order total</span><strong>₹${cart.reduce((sum,item)=>sum+Number(item.price)*Number(item.qty||1),0).toFixed(2)}</strong></div>`;
  closeDialog('cartDialog');
  openDialog('checkoutDialog');
};
let activeOrderUnsubscribe = null;
function renderCustomerOrder(order, id) {
  const status = order.status || 'Order Received';
  const closed = status === 'Closed' && order.deliveryStatus === 'Delivered' && order.paymentStatus === 'Paid';
  if (!closed) {
    $('#trackResult').innerHTML = `<strong>Order status:</strong> ${safe(status)}<br><strong>Payment:</strong> ${safe(order.paymentStatus || 'Pending')}<br><span class="status-message">Your order updates will appear here.</span>`;
    return;
  }
  const key = `lc_delivered_celebration_${id}`;
  const firstView = !localStorage.getItem(key);
  localStorage.setItem(key, 'shown');
  $('#trackResult').innerHTML = `
    <section class="lc-thankyou-card" aria-live="polite">
      <div class="lc-thankyou-flower" aria-hidden="true">🌸 ✿ 🌼</div>
      <p class="eyebrow dark">ORDER COMPLETED</p>
      <h2>🌸 ORDER DELIVERED! 🌸</h2>
      <p>Thank you for choosing <strong>LIQUID CRAFTERS!</strong></p>
      <p>We hope every sip brought a little happiness to your day.</p>
      <p><strong>Loved your experience?</strong><br>Your feedback means a lot to us!</p>
      <button type="button" class="gold-button" id="orderFeedbackButton">♡ SHARE YOUR FEEDBACK</button>
      <p>We look forward to serving you again.<br><strong>VISIT US AGAIN SOON!</strong></p>
      <small>Blended with Passion, Served with Freshness.</small>
    </section>`;
  $('#orderFeedbackButton')?.addEventListener('click', () => {
    if ($('#feedbackName')) $('#feedbackName').value = order.customerName || '';
    openDialog('feedbackDialog');
  });
  if (firstView) launchFlowerBurst();
}
function launchFlowerBurst() {
  const layer = document.createElement('div');
  layer.className = 'lc-flower-burst';
  layer.setAttribute('aria-hidden', 'true');
  ['🌸','🌼','✿','❀','🌺','✾','🌷','❁'].forEach((flower, i) => {
    const petal = document.createElement('span');
    petal.textContent = flower;
    petal.style.setProperty('--x', `${8 + i * 12}%`);
    petal.style.setProperty('--delay', `${(i % 4) * 90}ms`);
    layer.appendChild(petal);
  });
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2600);
}
$('#trackForm').onsubmit = async e => {
  e.preventDefault();
  const id = $('#trackId').value.trim();
  const user = auth.currentUser;
  $('#trackResult').textContent = 'Checking order...';
  if (activeOrderUnsubscribe) activeOrderUnsubscribe();
  if (!user) { $('#trackResult').textContent = 'Please sign in to track your order.'; return; }
  try {
    const q = query(collection(db, 'orders'), where('orderId', '==', id), where('userId', '==', user.uid));
    activeOrderUnsubscribe = onSnapshot(q, snapshot => {
      if (snapshot.empty) { $('#trackResult').textContent = 'No order found with that ID in your account.'; return; }
      renderCustomerOrder(snapshot.docs[0].data(), snapshot.docs[0].id);
    }, error => {
      console.error('Order tracking:', error);
      $('#trackResult').textContent = 'Unable to load this order. Please try again.';
    });
  } catch (error) {
    console.error(error);
    $('#trackResult').textContent = 'Order tracking is temporarily unavailable.';
  }
};
$('#feedbackForm').onsubmit=async e=>{e.preventDefault();try{await addDoc(collection(db,'feedback'),{name:$('#feedbackName').value.trim(),message:$('#feedbackText').value.trim(),createdAt:serverTimestamp()});$('#feedbackMessage').textContent='Thank you. Your feedback has been received.';e.target.reset()}catch{$('#feedbackMessage').textContent='Feedback service is not yet enabled. Please contact the shop.'}};
// CUSTOMER EMAIL/PASSWORD AUTHENTICATION (NO SMS OTP)
const authModeMessage = $('#customerAuthMessage');
const showAuthMode = (mode) => {
  const isRegister = mode === 'register';
  $('#customerRegisterForm').hidden = !isRegister;
  $('#customerLoginForm').hidden = isRegister;
  $('#authModeTitle').textContent = isRegister ? 'Create your account' : 'Welcome back';
  $('#showRegister').classList.toggle('active', isRegister);
  $('#showLogin').classList.toggle('active', !isRegister);
  authModeMessage.textContent = '';
};
$('#showRegister').onclick = () => showAuthMode('register');
$('#showLogin').onclick = () => showAuthMode('login');

$('#customerRegisterForm').onsubmit = async (e) => {
  e.preventDefault();
  const name = $('#registerName').value.trim();
  const email = $('#registerEmail').value.trim();
  const password = $('#registerPassword').value;
  const confirmPassword = $('#registerConfirmPassword').value;
  if (password.length < 6) {
    authModeMessage.textContent = 'Password must contain at least 6 characters.';
    return;
  }
  if (password !== confirmPassword) {
    authModeMessage.textContent = 'Passwords do not match.';
    return;
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    authModeMessage.textContent = 'Account created successfully. You are signed in.';
    e.target.reset();
    setTimeout(() => closeDialog('accountDialog'), 900);
  } catch (err) {
    authModeMessage.textContent = friendlyAuthError(err);
  }
};

$('#customerLoginForm').onsubmit = async (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authModeMessage.textContent = 'Login successful. Welcome back!';
    e.target.reset();
    setTimeout(() => closeDialog('accountDialog'), 900);
  } catch (err) {
    authModeMessage.textContent = friendlyAuthError(err);
  }
};

$('#forgotPassword').onclick = async () => {
  const email = $('#loginEmail').value.trim();
  if (!email) {
    authModeMessage.textContent = 'Enter your email address first, then choose Forgot password.';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    authModeMessage.textContent = 'Password reset email sent. Check your inbox and spam folder.';
  } catch (err) {
    authModeMessage.textContent = friendlyAuthError(err);
  }
};

function friendlyAuthError(err) {
  const code = err?.code || '';
  const messages = {
    'auth/email-already-in-use': 'This email already has an account. Please log in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/user-not-found': 'No account was found with this email. Please register first.',
    'auth/wrong-password': 'Incorrect email or password. Please try again.',
    'auth/invalid-credential': 'Email or password is incorrect. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.'
  };
  return messages[code] || `Authentication failed: ${err?.message || 'Please try again.'}`;
}

$('#orderCustomerPhone').addEventListener('input', () => {
  $('#orderCustomerPhone').value = $('#orderCustomerPhone').value.replace(/\D/g, '').slice(0, 10);
  localStorage.setItem('lc_delivery_phone', $('#orderCustomerPhone').value);
});
// ============================================
// DELIVERY LOCATION + CHECKOUT
// ============================================

const paymentMethodSelect = $('#orderPaymentMethod');
if (paymentMethodSelect) {
  paymentMethodSelect.addEventListener('change', () => {
    $('#paymentMethodNote').textContent = paymentMethodSelect.value === 'RAZORPAY_LINK'
      ? 'You will be redirected to Razorpay after your order is saved. Pay the exact order total shown above. Your payment will remain pending until the shop verifies it.'
      : 'Cash will be collected when your order is delivered.';
  });
}

$('#checkoutForm').onsubmit = async (e) => {
    e.preventDefault();
    const button = $('#placeOrderButton');
    const message = $('#checkoutMessage');
    const user = auth.currentUser;
    const customerName = $('#orderCustomerName').value.trim();
    const phone = $('#orderCustomerPhone').value.trim();
    const address = $('#orderAddress').value.trim();
    const deliveryLocation = getConfirmedDeliveryLocation();

    if (!user) { message.textContent = 'Please sign in before placing your order.'; return; }
    if (!customerName || !address) { message.textContent = 'Please enter your name and delivery address.'; return; }
    if (!/^\d{10}$/.test(phone)) { message.textContent = 'Enter a valid 10-digit delivery mobile number.'; return; }
    if (!deliveryLocation) { message.textContent = 'Please select and confirm your delivery location.'; return; }
    if (!cart.length) { message.textContent = 'Your cart is empty.'; return; }
    if (cart.some(item => !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) { message.textContent = 'One or more cart items have an invalid price. Please refresh your menu.'; return; }

    button.disabled = true;
    button.textContent = 'Placing Order...';
    try {
      const items = cart.map(item => ({
        productId: String(item.id), name: String(item.name), category: String(item.category || ''),
        size: String(item.size || 'Regular'), quantity: Number(item.qty || 1),
        unitPrice: Number(item.price), lineTotal: Number((Number(item.price) * Number(item.qty || 1)).toFixed(2))
      }));
      const total = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
      const selectedPaymentMethod = paymentMethodSelect?.value || 'COD';
      const isRazorpayLink = selectedPaymentMethod === 'RAZORPAY_LINK';
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, {
        orderId: orderRef.id, userId: user.uid, customerName,
        customerEmail: user.isAnonymous ? '' : (user.email || ''), customerPhone: phone,
        address, landmark: $('#orderLandmark').value.trim(),
        instructions: $('#orderInstructions').value.trim(),
        deliveryLocation: { latitude: Number(deliveryLocation.latitude), longitude: Number(deliveryLocation.longitude), distanceKm: Number(deliveryLocation.distanceKm) },
        items, currency: 'INR', total,
        paymentMethod: isRazorpayLink ? 'Razorpay Payment Link' : 'Cash on Delivery',
        paymentStatus: isRazorpayLink ? 'Awaiting Verification' : 'Pending',
        paymentLink: isRazorpayLink ? RAZORPAY_PAYMENT_LINK : null,
        status: 'Order Received', deliveryStatus: 'Pending',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      localStorage.setItem('lc_delivery_phone', phone);
      localStorage.setItem('lc_saved_order_ids', JSON.stringify([...new Set([...(JSON.parse(localStorage.getItem('lc_saved_order_ids') || '[]')), orderRef.id])]));
      cart = []; saveCart(); renderCart();
      $('#checkoutSummary').innerHTML = '';
      if (isRazorpayLink) {
        message.innerHTML = `Order created successfully! Your Order ID is <strong>${safe(orderRef.id)}</strong>.<br>Order total: <strong>₹${total.toFixed(2)}</strong>.<br><strong>Payment is not confirmed yet.</strong> On the Razorpay page, pay exactly ₹${total.toFixed(2)}. Keep your Order ID for reference. After payment, the shop will verify the transaction before marking it Paid. <a href="#track" id="trackNewOrderLink">Track this order</a>.`;
        $('#trackNewOrderLink')?.addEventListener('click', () => {
          $('#trackId').value = orderRef.id;
          showPage('track');
          $('#trackForm').requestSubmit();
        });
        e.target.reset();
        confirmedDeliveryLocation = null; selectedDeliveryLocation = null;
        $('#deliveryLocationMessage').textContent = 'Your next order needs a newly confirmed delivery pin.';
        button.textContent = 'Order Saved — Continue to Payment';
        window.setTimeout(() => { window.location.href = RAZORPAY_PAYMENT_LINK; }, 1800);
        return;
      }
      message.innerHTML = `Order placed successfully! Your Order ID is <strong>${safe(orderRef.id)}</strong>. Payment: Cash on Delivery. <a href="#track" id="trackNewOrderLink">Track this order</a>.`;
      $('#trackNewOrderLink')?.addEventListener('click', () => {
        $('#trackId').value = orderRef.id;
        showPage('track');
        $('#trackForm').requestSubmit();
      });
      e.target.reset();
      confirmedDeliveryLocation = null; selectedDeliveryLocation = null;
      $('#deliveryLocationMessage').textContent = 'Your next order needs a newly confirmed delivery pin.';
      button.textContent = 'Order Placed';
    } catch (error) {
      console.error('Order placement failed:', error);
      message.textContent = `We could not place your order. ${error?.message || 'Please try again.'}`;
      button.disabled = false; button.textContent = 'Place Order';
    }
};


// ============================================
// CUSTOMER AUTHENTICATION
// ============================================

onAuthStateChanged(auth, user => {

    $('#accountOpen').title = user
        ? `Signed in: ${user.email}`
        : 'Customer account';

    $('#accountOpen').setAttribute(
        'aria-label',
        user ? 'Customer account (signed in)' : 'Customer account'
    );

    if (user) {
        $('#orderCustomerName').value =
            user.displayName || '';

        $('#orderCustomerPhone').value =
            localStorage.getItem('lc_delivery_phone') || '';
    }

});
// ============================================
// LIQUID CRAFTERS - DELIVERY LOCATION
// Leaflet + OpenStreetMap
// ============================================

// IMPORTANT: Replace these with your actual shop coordinates.
const SHOP_LOCATION = {
    lat: 16.7100,
    lng: 81.0950
};

const DELIVERY_RADIUS_KM = 15;
const RAZORPAY_PAYMENT_LINK = 'https://razorpay.me/@liquidcrafters';

let deliveryMap = null;
let deliveryMarker = null;

let selectedDeliveryLocation = null;
let confirmedDeliveryLocation = null;


// Calculate distance between two coordinates
function calculateDeliveryDistance(lat1, lon1, lat2, lon2) {

    const earthRadius = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return earthRadius * 2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// Initialize map
function initializeDeliveryMap() {

    const mapElement = document.getElementById("deliveryMap");

    if (!mapElement || typeof L === "undefined") return;

    if (deliveryMap) {
        setTimeout(() => deliveryMap.invalidateSize(), 200);
        return;
    }

    deliveryMap = L.map("deliveryMap").setView(
        [SHOP_LOCATION.lat, SHOP_LOCATION.lng],
        14
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(deliveryMap);

    L.marker([
        SHOP_LOCATION.lat,
        SHOP_LOCATION.lng
    ])
        .addTo(deliveryMap)
        .bindPopup("Liquid Crafters Shop");

    deliveryMap.on("click", function (event) {

        selectDeliveryLocation(
            event.latlng.lat,
            event.latlng.lng
        );

    });

    setTimeout(() => deliveryMap.invalidateSize(), 200);
}


// Select delivery location
function selectDeliveryLocation(lat, lng) {

    selectedDeliveryLocation = {
        latitude: lat,
        longitude: lng
    };

    confirmedDeliveryLocation = null;

    if (deliveryMarker) {
        deliveryMap.removeLayer(deliveryMarker);
    }

    deliveryMarker = L.marker([lat, lng])
        .addTo(deliveryMap)
        .bindPopup("Your Delivery Location")
        .openPopup();

    const distance = calculateDeliveryDistance(
        SHOP_LOCATION.lat,
        SHOP_LOCATION.lng,
        lat,
        lng
    );

    const message = document.getElementById(
        "deliveryLocationMessage"
    );

    if (distance > DELIVERY_RADIUS_KM) {

        message.textContent =
            `Sorry! This location is outside our 15 km delivery area. Distance: ${distance.toFixed(2)} km`;

        return;
    }

    message.textContent =
        `Location selected. Distance from shop: ${distance.toFixed(2)} km. Please confirm.`;
}


// Current GPS location
document.getElementById("useCurrentLocation")
    ?.addEventListener("click", function () {

        if (!navigator.geolocation) {
            alert("Your browser does not support location detection.");
            return;
        }

        navigator.geolocation.getCurrentPosition(

            function (position) {

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                initializeDeliveryMap();

                deliveryMap.setView([lat, lng], 16);

                selectDeliveryLocation(lat, lng);

            },

            function (error) {

                alert(
                    "Unable to access your location. Please allow location permission and try again."
                );

            },

            {
                enableHighAccuracy: true,
                timeout: 15000
            }

        );

    });


// Confirm location
document.getElementById("confirmDeliveryLocation")
    ?.addEventListener("click", function () {

        if (!selectedDeliveryLocation) {
            alert("Please select your delivery location first.");
            return;
        }

        const distance = calculateDeliveryDistance(
            SHOP_LOCATION.lat,
            SHOP_LOCATION.lng,
            selectedDeliveryLocation.latitude,
            selectedDeliveryLocation.longitude
        );

        if (distance > DELIVERY_RADIUS_KM) {
            alert("Your location is outside our delivery area.");
            return;
        }

        confirmedDeliveryLocation = {
            latitude: selectedDeliveryLocation.latitude,
            longitude: selectedDeliveryLocation.longitude,
            distanceKm: Number(distance.toFixed(2))
        };

        document.getElementById("deliveryLocationMessage")
            .textContent =
            `Delivery location confirmed! Distance: ${distance.toFixed(2)} km`;

    });


// Initialize map when checkout dialog opens
document.getElementById("checkoutDialog")
    ?.addEventListener("toggle", function () {

        if (this.open) {
            setTimeout(initializeDeliveryMap, 300);
        }

    });


// Access confirmed location from checkout code
function getConfirmedDeliveryLocation() {
    return confirmedDeliveryLocation;
}