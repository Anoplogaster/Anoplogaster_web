---
title: Research
type: landing

sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;" class="bio-opaque">

        #### My research integrates **genomic and morphological data** from both extinct and extant taxa to reconstruct phylogenetic relationships and examine morphological evolution across deep-sea and reef-associated fishes. By combining large-scale genomic data and morphology, I aim to clarify the evolutionary origins and infraordinal relationships of several enigmatic groups through a holistic phylogenetic lens. Incorporating extinct taxa into total-evidence frameworks allows me to better understand evolutionary patterns and morphological innovation through deep-time. 

        ### Beryciformes and Trachichthyiformes

        These early-diverging acanthopterygians exhibit remarkable diversity in form, ecology, and habitat preference. For my dissertation, I am currently working on incorporating both fossil and extant representatives to investigate **habitat shifts, bioluminescence, and sexual dimorphism** across these lineages, resolving phylogenetic relationships and uncovering patterns of morphological evolution.

        ### Anglerfishes (Lophioidei)

        My prior research on anglerfishes investigates their extraordinary adaptations for predation, including mechanical, chemical, and bioluminescent lures, as well as the habitat transitions this group has undergone. Using a total-evidence framework combining ultrconserved gene elements, mitochondrial data, and morphology, I have reconstructed the most **comprehensive phylogeny of Lophioidei to date**, revealing key evolutionary transitions and how habitat shifts—especially into pelagic deep-sea environments—shape body form and diversification.

        ### Methodological Approach

        Across all projects, I integrate **comparative morphology with genomic data**, including:  
        - Expanding morphological character matrices for both extinct and extant taxa.  
        - Sequencing additional UCEs for broader taxonomic coverage.  
        - Working directly with collection specimens, including **formalin-fixed specimens, cleared-and-stained material, and CT scan data**.
        - Conducting geometric morphometric analyses to examine body-shape evolution in relation to ecological and evolutionary transitions.

        This integrative approach allows me to link **form, function, and evolutionary history**, providing new insights into the diversification of deep-sea and reef-associated fishes, the origins of extreme morphological adaptations, and the tempo of evolutionary change following major environmental shifts.

        <!-- Photo Grid -->
        <div class="research-photo-grid-wrapper">
          <div class="research-photo-grid">
            <div class="left-column">
              <img src="/images/Research_left.jpg" alt="Left Photo 1">
              <img src="/images/Research_left2.jpg" alt="Left Photo 2">
            </div>
            <div class="right-column">
              <img src="/images/Research_right.jpg" alt="Right Photo">
            </div>
          </div>
        </div>

        <style>
        .research-photo-grid-wrapper {
          width: 100%;
          max-width: 1200px;
          margin: 2rem auto;
        }

        .research-photo-grid {
          display: flex;
          gap: 1rem;
        }

        .research-photo-grid .left-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 33.333%;
        }

        .research-photo-grid .left-column img {
          width: 100%;
          height: auto;
          border-radius: 0.5rem;
          object-fit: cover;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .research-photo-grid .left-column img:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        .research-photo-grid .right-column {
          width: 66.666%;
          display: flex;
          flex-direction: column;
        }

        .research-photo-grid .right-column img {
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .research-photo-grid .right-column img:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.25);
        }

        @media (max-width: 768px) {
          .research-photo-grid {
            flex-direction: column;
          }
          .research-photo-grid .left-column,
          .research-photo-grid .right-column {
            width: 100%;
          }
        }
        </style>

        </div>
    design:
      columns: 2
      view: full
      css_class: "bio-opaque bio-wide"
---