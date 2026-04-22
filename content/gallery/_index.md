---
title: Gallery
type: landing
sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;">
          <div class="masonry-gallery">
            <img src="/images/gallery/Double_anglerfish_Diceratias_pileatus_UW_150017_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_2053.jpg" alt="">
            <img src="/images/gallery/Frogfish_Antennarius_commerson_Personal_AJMaile.jpg" alt="">
            <img src="/images/gallery/Anomalops_katoptron_YMP_ICH_020676.jpg" alt="">
            <img src="/images/gallery/IMG_0015.jpg" alt="">
            <img src="/images/gallery/Southern_seadevil_Ceratias_tentaculatus_LACM_11025-7_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_8872.jpg" alt="">
            <img src="/images/gallery/Ancylopsetta_ommata_KUI_22951_Blue.jpg" alt="">
            <img src="/images/gallery/IMG_0003.jpg" alt="">
            <img src="/images/gallery/IMG_0030.jpg" alt="">
            <img src="/images/gallery/IMG_8391.jpg" alt="">
            <img src="/images/gallery/Netdevil_Borophryne_apogon_LACM_30053-10_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_2166.jpg" alt="">
            <img src="/images/gallery/Bellator_militaris_TCWC_6818.17.jpg" alt="">
            <img src="/images/gallery/IMG_0017background.jpg" alt="">
            <img src="/images/gallery/Ghostly_seadevil_Haplophryne_mollis_UW_157518_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_3979.jpg" alt="">
            <img src="/images/gallery/Circular_seabat_Halieutaea_fitzsimonsi_LACM_44745-6_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_0035.jpg" alt="">
            <img src="/images/gallery/Pacific_footballfish_Himantolophus_sagamius_LACM_60082-1_MT-GGGG1_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_7224.jpg" alt="">
            <img src="/images/gallery/Frogfish_Antennarius_commerson_Personal_AJMaile_2.jpg" alt="">
            <img src="/images/gallery/IMG_8363.jpg" alt="">
            <img src="/images/gallery/Warty_Frogfish_Antennarius_maculatus_UW_020828_AJMaile.jpg" alt="">
            <img src="/images/gallery/IMG_0009_touchup.jpg" alt="">
            <img src="/images/gallery/IMG_0017_touchup1.jpg" alt="">
            <img src="/images/gallery/IMG_8364.jpg" alt="">
            <img src="/images/gallery/IMG_2073.jpg" alt="">
            <img src="/images/gallery/Ancylopsetta_ommata_KUI_22951_White.jpg" alt="">
            <img src="/images/gallery/IMG_8867.jpg" alt="">
            <img src="/images/gallery/IMG_5141.jpg" alt="">
            <img src="/images/gallery/TouchedupBioluminescent.jpg" alt="">
            <img src="/images/gallery/TotalBody.jpg" alt="">
          </div>
        </div>

        <style>
        .masonry-gallery {
          column-count: 3;
          column-gap: 0;
          width: 100vw;
        }

        .masonry-gallery img {
          width: 100%;
          display: block;
          margin: 0;
          object-fit: cover;
        }

        @media(max-width:1024px){
          .masonry-gallery { column-count: 2; }
        }

        @media(max-width:768px){
          .masonry-gallery { column-count: 1; }
        }
        </style>

        <script>
        document.addEventListener("DOMContentLoaded", function () {
          const gallery = document.querySelector(".masonry-gallery");
          if (!gallery) return;

          const images = Array.from(gallery.querySelectorAll("img"));

          for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [images[i], images[j]] = [images[j], images[i]];
          }

          images.forEach(img => gallery.appendChild(img));
        });
        </script>
---