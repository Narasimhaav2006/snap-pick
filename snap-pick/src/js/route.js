import { AREA_COORDS, DEPOT } from './config.js';

const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Real lat/lng if the request has them, else a stable demo position near the area centre (about 1 km spread). */
export function coordsOf(r) {
    if (r.lat != null && r.lng != null) return { lat: r.lat, lng: r.lng };
    const base = AREA_COORDS[r.area] ?? DEPOT;
    const h = hash(r.id);
    return {
        lat: base.lat + ((h % 100) - 50) / 5000,
        lng: base.lng + (((h >> 7) % 100) - 50) / 5000,
    };
}

export function haversineKm(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}

function pathKm(list) {
    let km = 0, prev = DEPOT;
    for (const r of list) { const c = coordsOf(r); km += haversineKm(prev, c); prev = c; }
    return km + haversineKm(prev, DEPOT);   // return to depot
}

/** Returns { stops, km, kmFifo }. optimise=false keeps first-come order. */
export function orderStops(requests, optimise) {
    const fifo = [...requests].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const kmFifo = pathKm(fifo);
    if (!optimise) return { stops: fifo, km: kmFifo, kmFifo };

    const left = [...fifo], stops = [];
    let here = DEPOT;
    while (left.length) {
        let best = 0, bestD = Infinity;
        left.forEach((r, i) => {
            const d = haversineKm(here, coordsOf(r));
            if (d < bestD) { bestD = d; best = i; }
        });
        const [next] = left.splice(best, 1);
        stops.push(next);
        here = coordsOf(next);
    }
    return { stops, km: pathKm(stops), kmFifo };
}