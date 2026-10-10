import gsap from 'gsap';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Page-load: navbar slides down, then headings and cards stagger in */
export function pageIn() {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('#navbar header', { y: -60, opacity: 0, duration: 0.5 })
        .from('[data-animate="fade"]', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.2')
        .from('[data-animate="card"]', { y: 40, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.3');
    return tl;
}

/** Re-usable: animate a list of freshly rendered rows/cards */
export function staggerIn(targets, delay = 0) {
    if (reduced) return;
    gsap.from(targets, {
        y: 16, opacity: 0, duration: 0.4, stagger: 0.06, delay, ease: 'power2.out',
        clearProps: 'all',
    });
}

/** Count a number up (dashboard stats) */
export function countUp(el, to, duration = 1) {
    if (reduced) { el.textContent = to; return; }
    const obj = { v: 0 };
    gsap.to(obj, {
        v: to, duration, ease: 'power1.out',
        onUpdate: () => (el.textContent = Math.round(obj.v)),
    });
}

/** Animate a capacity bar's width (0 to percent) */
export function fillBar(el, percent) {
    gsap.fromTo(el, { width: '0%' }, { width: `${Math.min(percent, 100)}%`, duration: 0.8, ease: 'power2.out' });
}

/** Lift cards on hover */
export function hoverLift(selector) {
    document.querySelectorAll(selector).forEach((el) => {
        el.addEventListener('mouseenter', () => gsap.to(el, { y: -6, duration: 0.25 }));
        el.addEventListener('mouseleave', () => gsap.to(el, { y: 0, duration: 0.25 }));
    });
}

/** Shake an element (invalid form field) */
export function shake(el) {
    gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
}

/** Timeline dots pop in */
export function timelinePop(scope = document) {
    if (reduced) return;
    gsap.from(scope.querySelectorAll('.tl-dot'), {
        scale: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(2)', delay: 0.2,
    });
}