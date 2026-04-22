---
title: "Education & Outreach"
type: landing
sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;" class="bio-opaque">

        <p style="max-width: 860px; margin: 0 auto 2.5rem auto; font-size: 1.5rem; line-height: 1.7;">
        Sharing my love for the natural world is one of the most rewarding parts of being a scientist. I aim to spark curiosity and excitement about fishes, evolution, and biology — whether in the classroom, lab, or museum.
        </p>

        <div class="outreach-columns">

          <div class="outreach-col">
            <div class="carousel" id="carousel-outreach">
              <div class="carousel-track">
                <img src="/images/education/136b05c6-a2fa-4bee-9f78-68450daed7dd.jpg" alt="Museum Photo 1">
                <img src="/images/education/IMG_9646.jpeg" alt="Museum Photo 2">
                <img src="/images/education/IMG_9780.jpeg" alt="Museum Photo 3">
                <!-- Add new photos here -->
              </div>
              <button class="carousel-btn prev" onclick="moveCarousel('carousel-outreach', -1)">&#8249;</button>
              <button class="carousel-btn next" onclick="moveCarousel('carousel-outreach', 1)">&#8250;</button>
              <div class="carousel-dots" id="dots-carousel-outreach"></div>
            </div>
            <h3>Museum Outreach</h3>
            <p><strong>Much of my outreach takes place at the Biodiversity Institute & Natural History Museum at the University of Kansas.</strong> I participate and lead a variety of events that showcase our collections and research, showing visitors how specimens and various preparations allow scientists to explore evolution, ecology, and biology in ways textbooks cannot. Some of my favorite demonstrations include 3D-printed fish models from CT-scan data and skeletal specimens I've prepared to highlight unusual anatomy and adaptations. Every year, I coordinate the <strong>Valentine's Day "Collections Up Close" event</strong>, highlighting unusual reproductive behaviors across species — a memorable moment was explaining how tiny male ceratioid anglerfish fuse to females, leaving visitors fascinated and engaged.</p>
          </div>

          <div class="outreach-col">
            <div class="carousel" id="carousel-teaching">
              <div class="carousel-track">
                <img src="/images/education/IMG_0255.jpeg" alt="Teaching Photo 1">
                <img src="/images/education/IMG_0284.jpeg" alt="Teaching Photo 2">
                <!-- Add new photos here -->
              </div>
              <button class="carousel-btn prev" onclick="moveCarousel('carousel-teaching', -1)">&#8249;</button>
              <button class="carousel-btn next" onclick="moveCarousel('carousel-teaching', 1)">&#8250;</button>
              <div class="carousel-dots" id="dots-carousel-teaching"></div>
            </div>
            <h3>Teaching and Mentoring</h3>
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
        .outreach-col h3 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
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
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.4);
          color: white;
          border: none;
          font-size: 2rem;
          padding: 0.3rem 0.7rem;
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
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: background 0.2s;
        }
        .carousel-dot.active {
          background: white;
        }
        @media (max-width: 768px) {
          .outreach-columns {
            grid-template-columns: 1fr;
          }
        }
        </style>

        <script>
        const carouselState = {};

        function initCarousel(id) {
          const carousel = document.getElementById(id);
          if (!carousel) return;
          const imgs = carousel.querySelectorAll('.carousel-track img');
          const dotsContainer = document.getElementById('dots-' + id);
          carouselState[id] = { index: 0, total: imgs.length };

          imgs[0].classList.add('active');

          dotsContainer.innerHTML = '';
          imgs.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.onclick = () => goToSlide(id, i);
            dotsContainer.appendChild(dot);
          });

          setInterval(() => moveCarousel(id, 1), 4000);
        }

        function moveCarousel(id, dir) {
          const state = carouselState[id];
          state.index = (state.index + dir + state.total) % state.total;
          goToSlide(id, state.index);
        }

        function goToSlide(id, index) {
          const carousel = document.getElementById(id);
          const imgs = carousel.querySelectorAll('.carousel-track img');
          imgs.forEach((img, i) => img.classList.toggle('active', i === index));
          carouselState[id].index = index;
          carousel.querySelectorAll('.carousel-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
          });
        }

        document.addEventListener('DOMContentLoaded', () => {
          initCarousel('carousel-outreach');
          initCarousel('carousel-teaching');
        });
        </script>

        </div>
    design:
      columns: 2
      view: full
      css_class: "bio-opaque bio-wide"
---