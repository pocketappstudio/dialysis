// Builds www/ for the native iPhone app (Capacitor). GitHub Pages keeps serving the repo root unchanged.
// The native copy loads native/native.js, turns off the Gumroad license path (Pro is an Apple in-app purchase there,
// App Store guideline 3.1.1), and uses Apple wording in the Terms and Privacy pages.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const files = ['index.html', 'app.js', 'config.js', 'i18n-es.js', 'styles.css', 'manifest.webmanifest', 'privacy.html', 'privacy-es.html', 'terms.html', 'terms-es.html', 'log-sheet.html', 'log-sheet-es.html'];
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['icons', 'vendor']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
fs.copyFileSync(path.join(root, 'native', 'native.js'), path.join(out, 'native.js'));
function edit(f, pairs) {
  let s = fs.readFileSync(path.join(out, f), 'utf8');
  for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(f + ': text not found: ' + a.slice(0, 60)); s = s.split(a).join(b); }
  fs.writeFileSync(path.join(out, f), s);
}
edit('index.html', [['<script src="config.js"></script>', '<script src="native.js"></script>\n  <script src="config.js"></script>']]);
edit('config.js', [
  ['CHECKOUT_URL: "https://pocketappstudio.gumroad.com/l/aeklk",', 'CHECKOUT_URL: "", // native build: Pro is an Apple in-app purchase'],
  ['GUMROAD_PRODUCT_ID: "iJvHWo0Z03uhw7LEoJTuxA==",', 'GUMROAD_PRODUCT_ID: "",'],
  ['LICENSE_VERIFY_URL: "https://api.gumroad.com/v2/licenses/verify",', 'LICENSE_VERIFY_URL: "",']
]);
edit('terms.html', [
  ['<p>Pro is an optional one-time purchase sold through Gumroad. It is a personal license to unlock the Pro features of the app; it is not a subscription. Payments, receipts and refunds are handled through Gumroad under Gumroad’s terms. A refunded, charged-back or disabled license stops unlocking Pro. Your logged data is never deleted when that happens.</p>',
   '<p>Pro is an optional one-time in-app purchase sold through Apple’s App Store. It unlocks the Pro features of the app for your Apple ID; it is not a subscription. Payments, receipts and refunds are handled by Apple under Apple’s terms. A refunded purchase may stop unlocking Pro. Your logged data is never deleted when that happens.</p>'],
  ['in your browser’s storage', 'in the app’s storage']
]);
edit('terms-es.html', [
  ['<p>Pro es una compra opcional de un solo pago que se vende a través de Gumroad. Es una licencia personal para desbloquear las funciones Pro de la app; no es una suscripción. Los pagos, recibos y reembolsos se manejan a través de Gumroad según los términos de Gumroad. Una licencia reembolsada, con contracargo o desactivada deja de desbloquear Pro. Sus datos registrados nunca se borran cuando eso pasa.</p>',
   '<p>Pro es una compra opcional de un solo pago dentro de la app que se vende a través de la App Store de Apple. Desbloquea las funciones Pro de la app para su ID de Apple; no es una suscripción. Los pagos, recibos y reembolsos los maneja Apple según los términos de Apple. Una compra reembolsada puede dejar de desbloquear Pro. Sus datos registrados nunca se borran cuando eso pasa.</p>'],
  ['en el almacenamiento de su navegador', 'en el almacenamiento de la app']
]);
edit('privacy.html', [
  ['in your browser\'s storage, and is never uploaded. After the first load the app needs no internet, with one exception: if you enter a Pro license key, the app sends that key (and nothing else) to Gumroad, the store that sold it, to check it, and quietly re-checks it about once a month while online.',
   'in the app\'s storage, and is never uploaded. The app needs no internet. If you buy Pro, the purchase is handled by Apple through the App Store; the app never sees your payment details. Reminders you set are scheduled on your phone and are not sent anywhere.']
]);
edit('privacy-es.html', [
  ['en el almacenamiento de su navegador, y nunca se sube. Después de la primera carga, la app no necesita internet, con una excepción: si escribe una clave de licencia Pro, la app envía esa clave (y nada más) a Gumroad, la tienda que la vendió, para verificarla, y la vuelve a verificar discretamente más o menos una vez al mes cuando hay conexión.',
   'en el almacenamiento de la app, y nunca se sube. La app no necesita internet. Si compra Pro, la compra la maneja Apple a través de la App Store; la app nunca ve sus datos de pago. Los recordatorios que configure se programan en su teléfono y no se envían a ningún lado.']
]);
// Native config: drop comments (they describe the web store) after the edits above.
fs.writeFileSync(path.join(out, 'config.js'), '/* Dialysis Log settings (iPhone app build). */\n' + fs.readFileSync(path.join(out, 'config.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]+\/\/[^\n]*/g, '').trim() + '\n');
if (process.env.SHOTS === '1') {
  fs.copyFileSync(path.join(root, 'native', 'shots-seed.js'), path.join(out, 'shots-seed.js'));
  edit('index.html', [['<script src="app.js"></script>', '<script src="shots-seed.js"></script>\n  <script src="app.js"></script>']]);
}
const leak = fs.readdirSync(out).filter(f => /\.(html|js)$/.test(f) && f !== 'i18n-es.js' && f !== 'app.js' && /gumroad\.com|Gumroad/.test(fs.readFileSync(path.join(out, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
if (leak.length) throw new Error('Gumroad text left in native build: ' + leak.join(', '));
console.log('www ready');
