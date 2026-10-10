import { STATUS, SPILL_DAYS } from './config.js';
import { todayISO } from './validators.js';

export function shiftDate(iso, n) {
    const d = new Date(iso + 'T00:00');
    d.setDate(d.getDate() + n);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

const canCarry = (v, r) => v.accepts.includes(r.wasteType) && r.quantityKg <= v.capacityKg;

/**
 * Find where a request can go on a given day.
 * Rule 1: reuse a slot already serving the same area that day, if it has room and the vehicle accepts the waste type.
 * Rule 2: otherwise open a new slot with a free compatible vehicle (best fit = smallest that can carry it).
 * One vehicle serves one area per day.
 */
function findSpot(req, day, { slots, vehicles }) {
    for (const s of slots) {
        if (s.date !== day || s.area !== req.area) continue;
        const v = vehicles.find((x) => x.id === s.vehicleId);
        if (v && v.accepts.includes(req.wasteType) && s.allocatedKg + req.quantityKg <= s.capacityKg) {
            return { slot: s };
        }
    }

    const free = vehicles
        .filter((v) => canCarry(v, req) && !slots.some((s) => s.date === day && s.vehicleId === v.id))
        .sort((a, b) => a.capacityKg - b.capacityKg);

    return free.length ? { vehicle: free[0] } : null;
}

/**
 * Schedules PENDING/WAITLISTED requests. Mutates state.requests and state.slots.
 *  date           only requests with this preferredDate (null = all dates)
 *  includePending false = only try to promote WAITLISTED requests
 *  onlyId         schedule a single request (used for rescheduling)
 */
export function runScheduler(state, { date = null, includePending = true, onlyId = null } = {}) {
    const { requests, slots, vehicles } = state;
    const today = todayISO();

    const queue = requests
        .filter(
            (r) =>
                (r.status === STATUS.WAITLISTED || (includePending && r.status === STATUS.PENDING)) &&
                (!date || r.preferredDate === date) &&
                (!onlyId || r.id === onlyId)
        )
        .sort((a, b) => a.preferredDate.localeCompare(b.preferredDate) || a.createdAt.localeCompare(b.createdAt));

    const summary = { processed: queue.length, scheduled: 0, moved: 0, waitlisted: 0 };

    for (const r of queue) {
        const start = r.preferredDate < today ? today : r.preferredDate;

        let spot = null;
        let day = start;
        for (let i = 0; i <= SPILL_DAYS && !spot; i++) {
            day = shiftDate(start, i);
            spot = findSpot(r, day, state);
        }

        /* ----- No capacity: WAITLIST (edge case: vehicle capacity exceeded) ----- */
        if (!spot) {
            r.status = STATUS.WAITLISTED;
            r.slotId = null;
            r.scheduledDate = null;
            r.remark = vehicles.some((v) => canCarry(v, r))
                ? `All compatible vehicles are full until ${shiftDate(start, SPILL_DAYS)}. You will be scheduled automatically when capacity frees up.`
                : `No vehicle can carry ${r.quantityKg} kg of this waste type. Please split the request or contact the dispatcher.`;
            summary.waitlisted++;
            continue;
        }

        /* ----- Assign ----- */
        let slot = spot.slot;
        if (!slot) {
            const v = spot.vehicle;
            slot = {
                id: `SLOT-${day}-${v.id}`,
                date: day,
                area: r.area,
                vehicleId: v.id,
                collectorId: v.collectorId,
                capacityKg: v.capacityKg,
                allocatedKg: 0,
                status: 'OPEN',
            };
            slots.push(slot);
        }

        slot.allocatedKg += r.quantityKg;
        slot.status = slot.allocatedKg >= slot.capacityKg ? 'FULL' : 'OPEN';

        r.status = STATUS.SCHEDULED;
        r.slotId = slot.id;
        r.scheduledDate = day;

        if (day !== r.preferredDate) {
            r.remark = `Moved to ${day} because capacity was full on your preferred date.`;
            summary.moved++;
        } else {
            r.remark = r.rescheduleCount ? 'Rescheduled after a missed pickup.' : '';
        }
        summary.scheduled++;
    }

    return summary;
}

/** Give a request's kg back to its slot (cancellation). Empty slots are removed, which frees the vehicle. */
export function releaseCapacity(slots, req) {
    const s = slots.find((x) => x.id === req.slotId);
    if (!s) return slots;
    s.allocatedKg = Math.max(0, s.allocatedKg - req.quantityKg);
    s.status = 'OPEN';
    return s.allocatedKg === 0 ? slots.filter((x) => x !== s) : slots;
}