---
title: Gallery
type: landing
sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;">
          <div class="masonry-gallery">
            <img src="/images/gallery/IMG_5141.JPG" alt="IMG 5141">
            <img src="/images/gallery/IMG_0030.JPG" alt="IMG 0030">
            <img src="/images/gallery/Anomalops_katoptron_YMP_ICH_020676.jpeg" alt="Anomalops katoptron">
            <img src="/images/gallery/IMG_0015.jpg" alt="IMG 0015">
            <img src="/images/gallery/TotalBody.jpg" alt="Total Body">
            <img src="/images/gallery/IMG_2053.jpg" alt="IMG 2053">
            <img src="/images/gallery/IMG_0017background.jpeg" alt="IMG 0017 background">
            <img src="/images/gallery/IMG_0009_touchup.jpg" alt="IMG 0009 touchup">
            <img src="/images/gallery/Bellator_militaris_TCWC_6818.17.png" alt="Bellator militaris">
            <img src="/images/gallery/TouchedupBioluminescent.jpg" alt="Touchedup Bioluminescent">
            <img src="/images/gallery/IMG_8363.PNG" alt="IMG 8363">
            <img src="/images/gallery/IMG_0035.jpg" alt="IMG 0035">
            <img src="/images/gallery/IMG_8872.JPG" alt="IMG 8872">
            <img src="/images/gallery/IMG_8364.PNG" alt="IMG 8364">
            <img src="/images/gallery/IMG_0017_touchup1.jpg" alt="IMG 0017 touchup1">
            <img src="/images/gallery/IMG_7224.jpeg" alt="IMG 7224">
            <img src="/images/gallery/IMG_2166.jpg" alt="IMG 2166">
            <img src="/images/gallery/IMG_3979.JPG" alt="IMG 3979">
            <img src="/images/gallery/IMG_8391.JPG" alt="IMG 8391">
            <img src="/images/gallery/IMG_8867.JPG" alt="IMG 8867">
            <img src="/images/gallery/IMG_0003.JPG" alt="IMG 0003">
          </div>
        </div>

        <style>
        .masonry-gallery {
          column-count: 3; /* 3 columns for desktop */
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
          .masonry-gallery {
            column-count: 2; /* 2 columns on tablets */
          }
        }

        @media(max-width:768px){
          .masonry-gallery {
            column-count: 1; /* stack on mobile */
          }
        }
        </style>
---