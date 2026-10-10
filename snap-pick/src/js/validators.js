import { AREAS, WASTE_TYPES, MAX_REQUEST_KG, MAX_ADVANCE_DAYS, REQUIRE_PHOTO } from './config.js';

/** Local date as YYYY-MM-DD (avoids the UTC off-by-one bug of toISOString) */
export function todayISO() {
    return addDaysISO(0);
}

export function addDaysISO(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export const isValidPhone = (p) => /^[6-9]\d{9}$/.test(String(p ?? '').trim());

/** Returns an object { fieldName: 'message' }. Empty object means valid. */
export function validateRequest(data) {
    const e = {};
    const name = String(data.householdName ?? '').trim();
    const address = String(data.address ?? '').trim();
    const notes = String(data.notes ?? '').trim();
    const qtyRaw = String(data.quantityKg ?? '').trim();
    const qty = Number(qtyRaw);

    if (!name) e.householdName = 'Name is required';
    else if (name.length < 2) e.householdName = 'Name is too short';
    else if (name.length > 60) e.householdName = 'Name is too long (max 60)';

    if (!String(data.phone ?? '').trim()) e.phone = 'Phone number is required';
    else if (!isValidPhone(data.phone)) e.phone = 'Enter a valid 10-digit mobile number';

    if (!address) e.address = 'Address is required';
    else if (address.length < 8) e.address = 'Please enter a more complete address';
    else if (address.length > 200) e.address = 'Address is too long (max 200)';

    if (!data.area) e.area = 'Select your area';
    else if (!AREAS.includes(data.area)) e.area = 'Invalid area';

    if (!data.wasteType) e.wasteType = 'Select a waste type';
    else if (!(data.wasteType in WASTE_TYPES)) e.wasteType = 'Invalid waste type';

    if (qtyRaw === '') e.quantityKg = 'Quantity is required';
    else if (!Number.isFinite(qty) || qty <= 0) e.quantityKg = 'Quantity must be greater than 0';
    else if (qty > MAX_REQUEST_KG) e.quantityKg = `Max ${MAX_REQUEST_KG} kg per request. Please split into multiple requests`;

    if (!data.preferredDate) e.preferredDate = 'Pick a preferred date';
    else if (data.preferredDate < todayISO()) e.preferredDate = 'Date cannot be in the past';
    else if (data.preferredDate > addDaysISO(MAX_ADVANCE_DAYS)) e.preferredDate = `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead`;

    if (REQUIRE_PHOTO && !data.photo) e.photo = 'Add a photo of your waste';
    else if (data.photo && !String(data.photo).startsWith('data:image/')) e.photo = 'Invalid photo';

    if (notes.length > 200) e.notes = 'Notes are too long (max 200)';

    return e;
}