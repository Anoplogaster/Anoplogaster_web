---
title: My Homepage
type: landing
date: "2022-10-24"

sections:

  - block: resume-biography-3
    content:
      username: admin
    design:
      avatar:
        shape: rounded-lg
        size: large
      css_class: "bio-opaque"

  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;">
          <div class="swiper mySwiper">
            <div class="swiper-wrapper">
              <div class="swiper-slide"><img src="/images/Monocentris_reedi.jpg" /></div>
              <div class="swiper-slide"><img src="/images/myctophids.jpg" /></div>
              <div class="swiper-slide"><img src="/images/anglerfish_collage.jpg" /></div>
              <div class="swiper-slide"><img src="/images/gibberichthys.jpg" /></div>
            </div>
            <div class="swiper-pagination"></div>
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
        <script>
          var swiper = new Swiper(".mySwiper", {
            loop: true,
            autoplay: { delay: 5000 },
            pagination: { el: ".swiper-pagination", clickable: true },
            slidesPerView: 1,
            spaceBetween: 0,
            centeredSlides: false,
          });
        </script>

        <style>
          .swiper {
            width: 100vw;
            height: 1000px;
            margin: 0;
          }

          .swiper-wrapper {
            display: flex;
          }

          .swiper-slide {
            width: 100% !important;
            flex-shrink: 0;
          }

          .swiper-slide img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
        </style>
    design:
      css_class: "bio-opaque"
---