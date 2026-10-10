import { addDaysISO } from '../js/validators.js';
import { STATUS } from '../js/config.js';

export function buildSeed() {
    // `accepts` = waste types the vehicle may carry (waste type matters for scheduling)
    const vehicles = [
        { id: 'V1', name: 'Truck A', capacityKg: 150, collectorId: 'C1', accepts: ['ORGANIC', 'RECYCLABLE'] },
        { id: 'V2', name: 'Truck B', capacityKg: 120, collectorId: 'C2', accepts: ['ORGANIC', 'RECYCLABLE', 'BULKY'] },
        { id: 'V3', name: 'Hazmat Van', capacityKg: 80, collectorId: 'C3', accepts: ['HAZARDOUS', 'E_WASTE'] },
    ];

    const collectors = [
        { id: 'C1', name: 'Ramesh K', vehicleId: 'V1' },
        { id: 'C2', name: 'Suresh M', vehicleId: 'V2' },
        { id: 'C3', name: 'Imran S', vehicleId: 'V3' },
    ];

    const tomorrow = addDaysISO(1);

    // [name, area, address, wasteType, quantityKg]; the order here is the FIFO order
    const rows = [
        ['Anita Rao', 'Indiranagar', '12, 5th Cross, HAL 2nd Stage', 'ORGANIC', 60],
        ['Vikram Shah', 'Indiranagar', '44, 100 Feet Road', 'RECYCLABLE', 50],
        ['Meera Nair', 'Indiranagar', '8, CMH Road', 'ORGANIC', 40],
        ['Rohit Verma', 'Koramangala', '21, 4th Block', 'ORGANIC', 45],
        ['Sana Khan', 'Koramangala', '90, 5th Block, near Jyoti Nivas', 'BULKY', 70],
        ['Arjun Patel', 'Whitefield', '15, ITPL Main Road', 'HAZARDOUS', 30],
        ['Divya Menon', 'Koramangala', '33, 6th Block', 'HAZARDOUS', 40],
        ['Karthik Iyer', 'HSR Layout', '5, Sector 2', 'E_WASTE', 25],
        ['Pooja Sharma', 'Jayanagar', '18, 4th T Block', 'HAZARDOUS', 50],
        ['Nitin Joshi', 'Jayanagar', '27, 9th Main', 'HAZARDOUS', 90],
        ['Latha Reddy', 'HSR Layout', '61, Sector 7', 'RECYCLABLE', 35],
    ];

    const now = Date.now();
    const requests = rows.map(([householdName, area, address, wasteType, quantityKg], i) => ({
        id: `REQ-S${String(i + 1).padStart(2, '0')}`,
        householdName,
        phone: `98765000${String(i + 1).padStart(2, '0')}`,   // 9876500001 ... 9876500011
        address, area, wasteType, quantityKg,
        preferredDate: tomorrow,
        notes: '',
        status: STATUS.PENDING,
        slotId: null,
        scheduledDate: null,
        remark: '',
        rescheduleCount: 0,
        createdAt: new Date(now - (rows.length - i) * 60000).toISOString(),
    }));

    return { vehicles, collectors, requests };
}