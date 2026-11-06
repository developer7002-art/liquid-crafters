# LIQUID CRAFTERS — Premium Interactive Website v1.0
**Blended with Passion, Served with Freshness.**

This project uses the approved burgundy, champagne-gold, warm-cream and leafy café direction as a design system. The generated reference image is included only as a design reference; the actual pages are built from HTML/CSS and functional controls, not displayed as a flattened screenshot.

## Folder structure
- `index.html` — customer storefront
- `admin/index.html` — separate administrator login
- `admin/dashboard.html` — separate admin management portal
- `assets/` — brand logo and product photos
- `js/` — customer logic, starter catalogue and Firebase configuration
- `firestore.rules` / `storage.rules` — starter security rules
- `firebase.json` / `.firebaserc` — Firebase Hosting project config

## Run locally
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Run `index.html` using Live Server (do not open by double-clicking).
4. Admin route locally: `admin/index.html`.

## Customer controls
- Home, Menu, Offers, Track Order and About open as separate views; inactive views stay hidden.
- Explore the Menu and category tiles open the corresponding product collections.
- Search, product details, size selector, cart, wishlist and feature bubbles are interactive.
- Contact information is hidden behind the Contact Us panel; customers can reveal/hide the details.
- Customer phone OTP UI is wired to Firebase Phone Authentication. Enable Phone provider and add the deployed domain to Firebase Authentication authorised domains before using OTP.

## Admin portal
The admin portal is separate and is not linked in the customer navigation, profile or footer.
- Local: `admin/index.html`
- Firebase Hosting clean URL: `/admin/`
- Admin login uses Firebase Email/Password and checks `admins/{uid}` in Firestore for `active: true`.
- Dashboard provides live Firestore product list, add/edit/delete, image upload to Storage, stock/availability/pricing fields, live order list and order-status updates.
- Starter catalogue import is available in the dashboard.

## Required Firebase setup before live use
The Firebase web configuration in `js/firebase-config.js` is the project configuration already supplied for `liquid-crafters`. It is public client configuration; never add service-account private keys to this folder.

1. In Firebase Console → Authentication → Sign-in method, enable **Email/Password** and **Phone**.
2. Add your deployed domain to Authentication → Settings → Authorised domains. Phone OTP also uses reCAPTCHA and may have SMS quotas/charges.
3. In Firestore, open Rules and publish the contents of `firestore.rules`.
4. In Storage, open Rules and publish `storage.rules`.
5. Create the owner's admin account manually in Firebase Authentication → Users using Email/Password.
6. Copy that account's UID. In Firestore create collection `admins`, document ID exactly equal to the UID, with fields:
   - `active` (boolean): `true`
   - `role` (string): `superAdmin`
7. Open the website, go to `/admin/`, sign in with that email/password, then use **Import starter catalogue** once. Add real prices, sizes, photos and stock before accepting orders.
8. Deploy using Firebase Hosting. Install Firebase CLI and run `firebase login`, `firebase use liquid-crafters`, then `firebase deploy --only hosting,firestore:rules,storage`.

## Important launch limitations
- Product catalogue live sync and admin CRUD are wired to Firestore. Image upload is wired to Firebase Storage. The dashboard's order list/status updates are wired to Firestore.
- Customer OTP sign-in is wired. The current checkout is deliberately not a live order-placement/payment flow yet: the shop has not supplied confirmed prices, final address/delivery configuration, verified UPI details and order-acceptance backend. Do not accept real payments or live orders until checkout, trusted validation, payment verification and delivery rules are implemented and tested.
- The Firestore rules are a starter baseline. For production, implement server-side validation (Cloud Functions), rate limits, stricter schema validation and audit logging. Do not loosen rules to `allow read, write: if true`.
- Browser cart and wishlist are saved locally on the device in this version.
- Admin login page is private by route and protected by Firebase Authentication + admin document check. Security rules also enforce admin permissions; hiding a link is not security.
- Shop contact information appears only after the customer opens Contact Us. Details used: WhatsApp +91 9182328951, shop email developer7002@gmail.com, Instagram @gazelle.1840545, business hours 10 AM–10 PM. Developer contact remains separate and is not shown in the shop contact panel.

Liquid Crafters deployment retry.
