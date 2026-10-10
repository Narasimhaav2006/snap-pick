export const toRequest = (r) => ({
    id: r.id,
    householdName: r.household_name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    area: r.area,
    wasteType: r.waste_type,
    quantityKg: r.quantity_kg,
    preferredDate: r.preferred_date,
    notes: r.notes,
    photoUrl: r.photo_url,
    status: r.status,
    slotId: r.slot_id,
    scheduledDate: r.scheduled_date,
    remark: r.remark,
    rescheduleCount: r.reschedule_count,
    lat: r.lat,
    lng: r.lng,
    createdAt: String(r.created_at).replace(' ', 'T'),
});

export const toSlot = (s) => ({
    id: s.id,
    date: s.slot_date,
    area: s.area,
    vehicleId: s.vehicle_id,
    collectorId: s.collector_id,
    capacityKg: s.capacity_kg,
    allocatedKg: s.allocated_kg,
    status: s.status,
});

export const toVehicle = (v) => ({
    id: v.id,
    name: v.name,
    capacityKg: v.capacity_kg,
    collectorId: v.collector_id,
    accepts: JSON.parse(v.accepts),
});