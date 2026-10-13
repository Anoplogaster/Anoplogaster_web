---
title: "Education & Outreach"
type: landing
sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;" class="bio-opaque">

        <h1 class="sr-only">Education &amp; Outreach</h1>

        <p style="max-width: 860px; margin: 0 auto 2.5rem auto; font-size: 1.5rem; line-height: 1.7;">
        Sharing my love for the natural world is one of the most rewarding parts of being a scientist. I aim to spark curiosity and excitement about fishes, evolution, and biology — whether in the classroom, lab, or museum.
        </p>

        <div class="outreach-columns">

          <div class="outreach-col">
            <div class="carousel" id="carousel-outreach" role="group" aria-roledescription="carousel" aria-labelledby="museum-outreach-title">
              <button class="carousel-toggle" type="button" hidden>Pause</button>
              <div class="carousel-track">
                <img src="/images/education/136b05c6-a2fa-4bee-9f78-68450daed7dd.jpg" class="active" alt="Three people behind a Collections Up Close specimen display." decoding="async">
                <img src="/images/education/IMG_9646.jpeg" alt="Outdoor museum demonstration with visitors, specimen jars and a large skull on a table." loading="lazy" decoding="async" hidden aria-hidden="true">
                <img src="/images/education/IMG_9780.jpeg" alt="Visitors examining preserved fishes and skeletal specimens at an outdoor museum demonstration." loading="lazy" decoding="async" hidden aria-hidden="true">
                <!-- Add new photos here -->
              </div>
              <button class="carousel-btn prev" type="button" aria-label="Previous Museum Outreach photograph" hidden>&#8249;</button>
              <button class="carousel-btn next" type="button" aria-label="Next Museum Outreach photograph" hidden>&#8250;</button>
              <div class="carousel-dots" id="dots-carousel-outreach" role="group" aria-label="Choose a Museum Outreach photograph"></div>
              <span class="carousel-status sr-only" role="status" aria-live="polite" aria-atomic="true"></span>
            </div>
            <h2 id="museum-outreach-title">Museum Outreach</h2>
            <p><strong>Much of my outreach takes place at the Biodiversity Institute & Natural History Museum at the University of Kansas.</strong> I participate and lead a variety of events that showcase our collections and research, showing visitors how specimens and various preparations allow scientists to explore evolution, ecology, and biology in ways textbooks cannot. Some of my favorite demonstrations include 3D-printed fish models from CT-scan data and skeletal specimens I've prepared to highlight unusual anatomy and adaptations. Every year, I coordinate the <strong>Valentine's Day "Collections Up Close" event</strong>, highlighting unusual reproductive behaviors across species — a memorable moment was explaining how tiny male ceratioid anglerfish fuse to females, leaving visitors fascinated and engaged.</p>
          </div>

          <div class="outreach-col">
            <div class="carousel" id="carousel-teaching" role="group" aria-roledescription="carousel" aria-labelledby="teaching-mentoring-title">
              <button class="carousel-toggle" type="button" hidden>Pause</button>
              <div class="carousel-track">
                <img src="/images/education/IMG_0255.jpeg" class="active" alt="A presenter explains a projected sonar diagram to seated children." loading="lazy" decoding="async">
                <img src="/images/education/IMG_0284.jpeg" alt="A gloved presenter demonstrating preserved fish specimens to children at a museum table." loading="lazy" decoding="async" hidden aria-hidden="true">
                <!-- Add new photos here -->
              </div>
              <button class="carousel-btn prev" type="button" aria-label="Previous Teaching and Mentoring photograph" hidden>&#8249;</button>
              <button class="carousel-btn next" type="button" aria-label="Next Teaching and Mentoring photograph" hidden>&#8250;</button>
              <div class="carousel-dots" id="dots-carousel-teaching" role="group" aria-label="Choose a Teaching and Mentoring photograph"></div>
              <span class="carousel-status sr-only" role="status" aria-live="polite" aria-atomic="true"></span>
            </div>
            <h2 id="teaching-mentoring-title">Teaching and Mentoring</h2>
            <p><strong>I act as a guide for students, helping them explore complex concepts through hands-on learning.</strong> I highlight the weirdest and most interesting features first, compare them to simpler mechanisms, and build understanding from there. Being approachable and relaxed helps students feel comfortable and engaged. I have taught and mentored students at undergraduate levels, including courses in Ichthyology, Systematics, Genetics, and Cell Biology. I especially enjoy working with kids and older adults, helping them connect with science in memorable ways.</p>
          </div>

        </div>

        <style>
        .outreach-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto 3rem auto;
          align-items: start;
        }
        .outreach-col {
          display: flex;
          flex-direction: column;
        }
        .outreach-col h2 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: clamp(1.25rem, 2vw, 1.55rem);
        }
        .outreach-col p {
          margin: 0;
          line-height: 1.7;
        }
        .carousel {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 0.5rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          transition: box-shadow 0.3s ease;
        }
        .carousel:hover {
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .carousel-track {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
        }
        .carousel-track img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 1s ease;
          flex-shrink: 0;
        }
        .carousel-track img.active {
          opacity: 1;
        }
        .carousel-track img[hidden] { display: none; }
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.65);
          color: white;
          border: none;
          font-size: 2rem;
          padding: 0.3rem 0.7rem;
          min-width: 44px;
          min-height: 44px;
          cursor: pointer;
          border-radius: 0.3rem;
          z-index: 10;
          line-height: 1;
          transition: background 0.2s;
        }
        .carousel-btn:hover {
          background: rgba(0,0,0,0.7);
        }
        .carousel-btn.prev { left: 0.5rem; }
        .carousel-btn.next { right: 0.5rem; }
        .carousel-toggle {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 10;
          min-width: 72px;
          min-height: 44px;
          padding: 0.45rem 0.7rem;
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 0.3rem;
          background: rgba(0,0,0,0.75);
          color: white;
          font: 500 0.875rem/1.3 var(--font-display, sans-serif);
          cursor: pointer;
        }
        .carousel button:focus-visible {
          outline: 3px solid white;
          outline-offset: -4px;
          box-shadow: inset 0 0 0 6px rgba(0,0,0,0.85);
        }
        .carousel-dots {
          position: absolute;
          bottom: 0.6rem;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 0.4rem;
          z-index: 10;
        }
        .carousel-dot {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 0;
          border-radius: 0.3rem;
          background: transparent;
          cursor: pointer;
        }
        .carousel-dot::before {
          content: "";
          width: 8px;
          height: 8px;
          border: 1px solid rgba(0,0,0,0.7);
          border-radius: 50%;
          background: rgba(255,255,255,0.65);
          box-shadow: 0 0 2px rgba(0,0,0,0.8);
        }
        .carousel-dot.active::before { width: 10px; height: 10px; background: white; }
        @media (prefers-reduced-motion: reduce) {
          .carousel, .carousel-track img, .carousel-btn { transition: none !important; }
        }
        @media (max-width: 768px) {
          .outreach-columns {
            grid-template-columns: 1fr;
          }
        }
        </style>

        <script>
        (() => {
          const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
          const states = [];

          function initCarousel(id) {
            const carousel = document.getElementById(id);
            if (!carousel) return;
            const imgs = Array.from(carousel.querySelectorAll('.carousel-track img'));
            if (!imgs.length) return;
            const toggle = carousel.querySelector('.carousel-toggle');
            const dots = carousel.querySelector('.carousel-dots');
            const status = carousel.querySelector('.carousel-status');
            const label = document.getElementById(carousel.getAttribute('aria-labelledby')).textContent;
            const state = { index: 0, requested: 0, userPaused: motion.matches,
              hovered: false, windowPaused: false, visible: !('IntersectionObserver' in window),
              loading: false, manualLoad: false, timer: null, hideTimer: null, request: 0,
              pointerPaused: null };
            const buttons = [];

            function hideInactive() {
              imgs.forEach((img, i) => {
                img.hidden = i !== state.index;
                img.classList.toggle('active', i === state.index);
                img.setAttribute('aria-hidden', String(i !== state.index));
              });
            }
            function schedule() {
              clearTimeout(state.timer);
              state.timer = null;
              const running = !state.userPaused && !state.hovered && !state.windowPaused
                && !document.hidden && state.visible && !state.loading;
              carousel.dataset.rotation = running ? 'playing' : 'paused';
              carousel.dataset.userPaused = String(state.userPaused);
              carousel.dataset.reducedMotion = String(motion.matches);
              toggle.textContent = state.userPaused ? 'Play' : 'Pause';
              toggle.setAttribute('aria-label', toggle.textContent + ' automatic ' + label + ' photographs');
              if (running) state.timer = setTimeout(() => showSlide((state.index + 1) % imgs.length, false), 4000);
            }
            function setPaused(paused) {
              state.userPaused = paused;
              if (paused && state.loading && !state.manualLoad) {
                state.request++;
                state.loading = false;
                state.requested = state.index;
                hideInactive();
              }
              schedule();
            }
            async function showSlide(index, manual) {
              if (manual) setPaused(true);
              index = (index + imgs.length) % imgs.length;
              state.requested = index;
              const request = ++state.request;
              clearTimeout(state.hideTimer);
              hideInactive();
              if (index === state.index) { state.loading = false; schedule(); return; }
              const img = imgs[index];
              state.loading = true;
              state.manualLoad = manual;
              // Preserve every original src and full-quality photograph. Hidden
              // slides request their source only when selected; keep the current
              // photograph visible until the requested image is ready to paint.
              img.loading = 'eager';
              img.hidden = false;
              img.setAttribute('aria-hidden', 'true');
              schedule();
              const loaded = img.complete ? img.naturalWidth > 0 : await new Promise(resolve => {
                img.addEventListener('load', () => resolve(true), { once: true });
                img.addEventListener('error', () => resolve(false), { once: true });
              });
              if (loaded && img.decode) await img.decode().catch(() => {});
              if (request !== state.request) return;
              state.loading = false;
              if (!loaded) {
                img.hidden = true;
                state.requested = state.index;
                setPaused(true);
                status.textContent = 'The requested photograph could not load. The current photograph remains visible.';
                return;
              }
              state.index = index;
              carousel.dataset.currentSlide = String(index + 1);
              imgs.forEach((item, i) => {
                item.classList.toggle('active', i === index);
                item.setAttribute('aria-hidden', String(i !== index));
              });
              buttons.forEach((button, i) => {
                button.classList.toggle('active', i === index);
                if (i === index) button.setAttribute('aria-current', 'true');
                else button.removeAttribute('aria-current');
                button.setAttribute('aria-disabled', String(i === index));
              });
              if (manual) status.textContent = label + ': photograph ' + (index + 1) + ' of ' + imgs.length + '.';
              state.hideTimer = setTimeout(hideInactive, motion.matches ? 0 : 1000);
              schedule();
            }

            hideInactive();
            carousel.dataset.currentSlide = '1';
            dots.replaceChildren();
            imgs.forEach((img, i) => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'carousel-dot' + (i === 0 ? ' active' : '');
              button.setAttribute('aria-label', 'Show photograph ' + (i + 1) + ' of ' + imgs.length + ': ' + img.alt);
              button.setAttribute('aria-disabled', String(i === 0));
              if (i === 0) button.setAttribute('aria-current', 'true');
              button.addEventListener('click', () => { if (i !== state.index) showSlide(i, true); });
              buttons.push(button);
              dots.append(button);
            });
            carousel.querySelector('.prev').addEventListener('click', () => showSlide(state.requested - 1, true));
            carousel.querySelector('.next').addEventListener('click', () => showSlide(state.requested + 1, true));
            // A pointer focus event must not invert the Pause action the user
            // originally pressed. Keyboard focus stops rotation permanently;
            // only an explicit Play request can start it again.
            toggle.addEventListener('pointerdown', () => { state.pointerPaused = state.userPaused; });
            toggle.addEventListener('click', event => {
              const paused = event.detail > 0 && state.pointerPaused !== null ? state.pointerPaused : state.userPaused;
              state.pointerPaused = null;
              setPaused(!paused);
            });
            carousel.addEventListener('focusin', () => setPaused(true));
            if (window.matchMedia('(hover: hover)').matches) {
              carousel.addEventListener('mouseenter', () => { state.hovered = true; schedule(); });
              carousel.addEventListener('mouseleave', () => { state.hovered = false; schedule(); });
            }
            if ('IntersectionObserver' in window) {
              const observer = new IntersectionObserver(entries => {
                state.visible = entries[0].isIntersecting;
                schedule();
              });
              observer.observe(carousel);
            }
            carousel.querySelectorAll('.carousel-toggle, .carousel-btn').forEach(button => { button.hidden = false; });
            states.push({ state, schedule, setPaused });
            schedule();
          }
          function initialize() {
            initCarousel('carousel-outreach');
            initCarousel('carousel-teaching');
          }
          document.addEventListener('visibilitychange', () => states.forEach(item => item.schedule()));
          window.addEventListener('blur', () => states.forEach(item => { item.state.windowPaused = true; item.schedule(); }));
          window.addEventListener('focus', () => states.forEach(item => { item.state.windowPaused = false; item.schedule(); }));
          const motionChanged = () => states.forEach(item => { if (motion.matches) item.setPaused(true); else item.schedule(); });
          if (motion.addEventListener) motion.addEventListener('change', motionChanged);
          else motion.addListener(motionChanged);
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
          else initialize();
        })();
        </script>

        </div>
    design:
      columns: 2
      view: full
      css_class: "bio-opaque bio-wide"
---
