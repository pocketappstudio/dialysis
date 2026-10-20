/* Screenshot build only (SHOTS=1 npm run build:www). Never part of the App Store build.
 * Fills demo data and steps through the main screens so CI can capture simulator screenshots. */
(function () {
  if (localStorage.getItem('dialysislog:shots') !== '1') {
    var now = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var dk = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var at = function (h, m) { var d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
    var fluids = [[7, 40, 236.588, 'Cup'], [10, 15, 118.294, 'Small cup'], [12, 30, 192.2, 'Soup'], [15, 5, 59.147, 'Ice chips']].map(function (f, i) { return { id: 'f' + i, t: at(f[0], f[1]), ml: f[2], label: f[3] }; });
    var sessions = [], w = [172.4, 171.8, 173.1, 172.0, 171.2, 172.6, 171.9, 172.8, 171.5];
    for (var i = 0, n = 0; i < 21 && n < 9; i++) { var d = new Date(now.getTime() - i * 86400000); if ([1, 3, 5].indexOf(d.getDay()) < 0) continue;
      sessions.push({ id: 's' + n, createdAt: d.getTime(), date: dk(d), time: '06:30', wUnit: 'lb', ufUnit: 'L', notes: n === 0 ? 'Felt fine' : '', preW: w[n], postW: Math.round((w[n] - 3.1 - (n % 3) * 0.2) * 10) / 10, preSys: 138 + (n % 4) * 3, preDia: 84 + (n % 3), postSys: 126 + (n % 3) * 2, postDia: 78, uf: 3.1 + (n % 3) * 0.2 }); n++; }
    for (var j = 1; j < 14; j++) { var dd = new Date(now.getTime() - j * 86400000); dd.setHours(9, 0, 0, 0); fluids.push({ id: 'p' + j, t: dd.getTime(), ml: 700 + (j * 53) % 260, label: 'Cup' }); }
    var pd = {}; pd[dk(now)] = [{ time: '07:00', fill: 2000, drain: 2150 }, { time: '12:00', fill: 2000, drain: 2200 }, { time: '17:00', fill: 2000, drain: 2100 }, { time: '', fill: null, drain: null }];
    var S = { v: 1, fluids: fluids, sessions: sessions, labs: [], meds: [], pd: pd, settings: { setupDone: true, fluidUnit: 'oz', weightUnit: 'lb', ufUnit: 'L', limitMl: 946.352, whose: '', cups: [{ id: 'c1', label: 'Small cup', ml: 118.294 }, { id: 'c2', label: 'Cup', ml: 236.588 }, { id: 'c3', label: 'Mug', ml: 354.882 }, { id: 'c4', label: 'Ice chips', ml: 59.147 }], textSize: 'large', dark: false, lang: null, lastBackup: Date.now(), backupNagAt: Date.now(), persisted: true, createdAt: Date.now(), draft: null,
      license: { ok: true, source: 'apple', key: 'App Store', at: Date.now() }, reminders: { drinkOn: true, times: ['08:00', '12:00', '17:00'], sessOn: true, days: [1, 3, 5], sessTime: '05:45' } } };
    localStorage.setItem('dialysislog:v1', JSON.stringify(S));
    localStorage.setItem('dialysislog:terms', JSON.stringify({ agreed: true, version: (window.DIALYSIS_CONFIG || {}).TERMS_VERSION, at: new Date().toISOString() }));
    localStorage.setItem('dialysislog:shots', '1');
  }
  // Screens, one every 8 s, starting 4 s after launch: CI captures at 8 s, 16 s, ...
  var routes = ['#/', '#/sessions', '#/trends', '#/pd', '#/reminders', '#/more', '#/pro'], k = 0;
  location.hash = routes[0];
  setInterval(function () { k++; if (k < routes.length) { location.hash = routes[k]; window.scrollTo(0, 0); } }, 8000);
})();
