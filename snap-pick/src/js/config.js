export const WASTE_TYPES = {
    ORGANIC: 'Organic / Wet',
    RECYCLABLE: 'Recyclable (dry)',
    HAZARDOUS: 'Hazardous',
    E_WASTE: 'E-waste',
    BULKY: 'Bulky items',
};

export const AREAS = ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar', 'HSR Layout'];

export const STATUS = {
    PENDING: 'PENDING',
    SCHEDULED: 'SCHEDULED',
    WAITLISTED: 'WAITLISTED',
    COLLECTED: 'COLLECTED',
    MISSED: 'MISSED',
    CANCELLED: 'CANCELLED',
};

// flip to false when the backend is ready
export const USE_MOCK = false;
export const API_BASE = '/api';

export const MAX_REQUEST_KG = 100;     // single request limit (edge case: oversized request)
export const MAX_ADVANCE_DAYS = 30;    // how far ahead a household can book

// statuses from which a household may still cancel
export const CANCELLABLE = ['PENDING', 'SCHEDULED', 'WAITLISTED', 'MISSED'];
// If the preferred date is full, try up to this many following days before waitlisting
export const SPILL_DAYS = 2;
// Demo coordinates (approximate area centres) for route optimization.
// In the real system, each request gets lat/lng from geocoding or a map pin.
export const DEPOT = { lat: 12.9716, lng: 77.5946 };
export const AREA_COORDS = {
    Indiranagar: { lat: 12.9784, lng: 77.6408 },
    Koramangala: { lat: 12.9352, lng: 77.6245 },
    Whitefield: { lat: 12.9698, lng: 77.7500 },
    Jayanagar: { lat: 12.9308, lng: 77.5838 },
    'HSR Layout': { lat: 12.9116, lng: 77.6389 },
};

export const REQUIRE_PHOTO = true;   // set false to make the photo optional
export const MAX_PHOTO_MB = 10;      // largest file we accept before resizing