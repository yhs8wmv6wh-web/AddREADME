// In-Memory-Ersatz für claude.use("db"), nur für lokale Tests.
(function () {
  const store = new Map(); // path -> data
  const listeners = new Set();
  const snapDoc = (path) => ({ id: path.split("/").pop(), exists: store.has(path), data: () => store.get(path), metadata: { fromCache: false, hasPendingWrites: false } });
  const notify = () => setTimeout(() => listeners.forEach((l) => l()), 0);
  let seq = 0;
  function query(coll, order, lim) {
    return {
      path: coll,
      orderBy: (f, dir = "asc") => query(coll, { f, dir }, lim),
      limit: (n) => query(coll, order, n),
      where: () => query(coll, order, lim),
      async get() { return this._snap(); },
      _snap() {
        let docs = [...store.keys()].filter((p) => p.startsWith(coll + "/") && p.split("/").length === coll.split("/").length + 1).sort().map(snapDoc);
        if (order) docs.sort((a, b) => { const x = a.data()[order.f], y = b.data()[order.f]; return (x < y ? -1 : x > y ? 1 : 0) * (order.dir === "desc" ? -1 : 1); });
        if (lim) docs = docs.slice(0, lim);
        return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} };
      },
      onSnapshot(next) { const l = () => next(this._snap()); listeners.add(l); l(); return () => listeners.delete(l); },
      doc: (id) => docRef(coll + "/" + (id || "auto" + ++seq)),
      async add(data) { const r = docRef(coll + "/auto" + Date.now() + "-" + ++seq); await r.set(data); return r; },
    };
  }
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      async get() { return snapDoc(path); },
      async set(d) { store.set(path, JSON.parse(JSON.stringify(d))); notify(); },
      async update(d) { if (!store.has(path)) throw { code: "invalid_argument", message: "missing" }; store.set(path, { ...store.get(path), ...JSON.parse(JSON.stringify(d)) }); notify(); },
      async delete() { store.delete(path); notify(); },
      onSnapshot(next) { const l = () => next(snapDoc(path)); listeners.add(l); l(); return () => listeners.delete(l); },
      collection: (c) => query(path + "/" + c),
    };
  }
  const db = { doc: docRef, collection: (c) => query(c) };
  window.__store = store;
  window.claude = { use: async (n) => (n === "db" ? db : null) };
})();
