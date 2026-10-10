import { renderNavbar } from './ui.js';
import { pageIn, hoverLift } from './animations.js';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
gsap.registerPlugin(ScrollToPlugin);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        gsap.to(window, {
            duration: 0.05,
            ease: 'power2.inOut',
            scrollTo: { y: target, offsetY: 96 },
        });
    });
});

renderNavbar('home');
pageIn();
hoverLift('.role-card');