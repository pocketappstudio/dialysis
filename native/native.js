/* Dialysis Log native bridge (iPhone App Store build only; copied into www/ by scripts/build-www.js).
 * Gives the web app real iPhone features: reminders you set (local notifications), haptics, the native share sheet
 * for summaries / backup / CSV files, storage mirrored into native Preferences, and Pro as an Apple in-app purchase. */
(function () {
  var Cap = window.Capacitor, isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  if (!isNative) return;
  document.documentElement.classList.add('native');
  var P = Cap.Plugins || {};
  var PID = 'com.pocketappstudio.dialysislog.pro';
  var KEYS = ['dialysislog:v1', 'dialysislog:terms'];
  var N = window.Native = { is: true, version: '1.3.0' };
  // Storage: localStorage stays the working copy; every save is mirrored into native Preferences, which iOS
  // does not clear like web storage. On start, anything missing from localStorage is restored from Preferences.
  N.ready = (function () {
    var Pr = P.Preferences; if (!Pr) return Promise.resolve();
    return Promise.all(KEYS.map(function (k) {
      return Pr.get({ key: k }).then(function (r) {
        var have = null; try { have = localStorage.getItem(k); } catch (e) {}
        if (have == null && r && r.value != null) { try { localStorage.setItem(k, r.value); } catch (e) {} }
        else if (have != null && (!r || r.value !== have)) return Pr.set({ key: k, value: have });
      }).catch(function () {});
    })).then(function () {}, function () {});
  })();
  N.mirror = function (k, v) { try { P.Preferences && P.Preferences.set({ key: k, value: v }); } catch (e) {} };
  N.haptic = function (k) { try { var H = P.Haptics; if (!H) return; if (k === 'success') H.notification({ type: 'SUCCESS' }); else H.impact({ style: k === 'medium' ? 'MEDIUM' : 'LIGHT' }); } catch (e) {} };
  N.share = function (d) {
    if (!P.Share) return Promise.reject(new Error('no share'));
    return P.Share.share({ title: d.title, text: d.text, url: d.url, dialogTitle: d.title }).catch(function (e) { if (/cancel/i.test(String(e && e.message))) return; throw e; });
  };
  // Backup / CSV: write the file into the app's cache, then open the share sheet so it can go to Files, AirDrop, Messages…
  N.saveFile = function (name, text, type) {
    var F = P.Filesystem; if (!F || !P.Share) return Promise.resolve();
    return F.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' }).then(function (r) {
      return P.Share.share({ title: name, files: [r.uri], dialogTitle: name });
    }).catch(function () {});
  };
  // Reminders the user sets. Drink reminders repeat daily; session reminders repeat weekly on the chosen days.
  N.scheduleReminders = function (r, txt) {
    var L = P.LocalNotifications; if (!L) return Promise.resolve(false);
    var ids = []; for (var i = 0; i < 40; i++) ids.push({ id: 5000 + i });
    return L.cancel({ notifications: ids }).catch(function () {}).then(function () {
      if (!r.drinkOn && !r.sessOn) return true;
      return L.checkPermissions().then(function (p) { return p.display === 'granted' ? p : L.requestPermissions(); }).then(function (p) {
        if (p.display !== 'granted') return false;
        var list = [];
        if (r.drinkOn) r.times.forEach(function (t, i) { var hm = t.split(':'); list.push({ id: 5000 + i, title: txt.drinkTitle, body: txt.drinkBody, schedule: { on: { hour: +hm[0], minute: +hm[1] }, allowWhileIdle: true } }); });
        if (r.sessOn && r.sessTime) { var sm = r.sessTime.split(':'); r.days.forEach(function (d) { list.push({ id: 5020 + d, title: txt.drinkTitle, body: txt.sessBody, schedule: { on: { weekday: d + 1, hour: +sm[0], minute: +sm[1] }, allowWhileIdle: true } }); }); }
        return list.length ? L.schedule({ notifications: list }).then(function () { return true; }) : true;
      });
    }).catch(function () { return false; });
  };
  // Pro: non-consumable in-app purchase through StoreKit (cordova-plugin-purchase), with Restore Purchases.
  var iap = N.iap = { price: '', ready: false, owned: false, on: null, started: false,
    init: function () {
      if (iap.started) return; iap.started = true;
      var go = function () {
        try {
          var CP = window.CdvPurchase, store = CP.store, PT = CP.ProductType, PL = CP.Platform;
          store.register([{ id: PID, type: PT.NON_CONSUMABLE, platform: PL.APPLE_APPSTORE }]);
          var chk = function () {
            var p = store.get(PID, PL.APPLE_APPSTORE);
            if (p && p.pricing) iap.price = p.pricing.price || '';
            iap.ready = !!(p && p.getOffer && p.getOffer());
            if (store.owned(PID)) iap.owned = true;
            if (iap.on) iap.on(iap.owned);
          };
          store.when().productUpdated(chk).approved(function (t) { t.finish(); }).finished(chk).receiptUpdated(chk);
          store.initialize([PL.APPLE_APPSTORE]).then(chk, chk);
        } catch (e) {}
      };
      if (window.CdvPurchase) go(); else document.addEventListener('deviceready', go, false);
    },
    buy: function () { try { var CP = window.CdvPurchase, p = CP.store.get(PID, CP.Platform.APPLE_APPSTORE), o = p && p.getOffer(); if (o) return CP.store.order(o); } catch (e) {} },
    restore: function () { try { return window.CdvPurchase.store.restorePurchases(); } catch (e) {} }
  };
})();
