---
title: Research
type: landing
sections:
  - block: markdown
    content:
      text: |
        <div style="position: relative; width: 100vw; margin-left: calc(-50vw + 50%); overflow: hidden;" class="bio-opaque">
        <h1 class="visually-hidden">Research</h1>
        <p style="max-width: 860px; margin: 0 auto 2.5rem auto; font-size: 1.4rem; line-height: 1.7;">
        I reconstruct evolutionary relationships of fishes to understand morphological evolution. Drawing on natural history collections, my work focuses on deep-sea and reef-associated fishes, combining morphological and genomic data from extant and fossil taxa to investigate how these groups diversified and adapted over time.
        </p>
        <div class="research-columns">
          <div class="research-col">
            <figure class="tron-figure">
              <img src="/images/AnglerPhylogeny.webp" alt="Anglerfish phylogeny showing lure types and lure-component lengths alongside a time scale." decoding="async">
              <figcaption class="research-figure-attribution">Figure 5 from Maile and Davis (2026), <cite>Ichthyology &amp; Herpetology</cite> 114:103–118, <a href="https://doi.org/10.1643/i2025018">doi:10.1643/i2025018</a>. © 2026 <a href="https://www.asih.org/">American Society of Ichthyologists and Herpetologists</a>. Licensed under <a href="https://www.ichthyologyandherpetology.org/instructions">CC BY</a>.</figcaption>
            </figure>
            <h2>Phylogenetics</h2>
            <p><strong>Understanding the evolutionary relationships of fishes is central to everything else I do.</strong> I use total-evidence approaches that combine morphological character data scored from museum specimens with genomic data to reconstruct well-supported phylogenies of poorly understood groups. My phylogenetic work has focused on anglerfishes (Lophioidei) and early-diverging acanthopterygians including Beryciformes and Trachichthyiformes, groups whose relationships have historically been difficult to resolve. Incorporating fossil taxa into these frameworks allows me to better place evolutionary events in time and understand patterns of diversification across deep-sea lineages.</p>
          </div>
          <div class="research-col">
            <figure class="tron-figure">
              <img src="/images/Double_anglerfish_Diceratias_pileatus_UW_150017_AJMaile.jpg" alt="Double anglerfish (Diceratias pileatus) specimen against a black background, showing the head, open jaws, and upright lure." decoding="async">
            </figure>
            <h2>Bioluminescence and Morphology</h2>
            <p><strong>Several of the fish groups I work on have independently evolved bioluminescence, and understanding how and when these systems originated is a major focus of my research.</strong> In anglerfishes, I showed that bioluminescent lures evolved once within the deep-sea ceratioids during the Oligocene, coinciding after their transition into pelagic environments and an uptick in diversification. I have also worked on the anatomy and evolution of bioluminescent organs in slimeheads (Trachichthyidae). Across these projects I am interested in how novel morphological structures originate and what role ecological transitions play in driving their evolution.</p>
          </div>
          <div class="research-col">
            <figure class="tron-figure">
              <img src="/images/DSC_7132.jpg" alt="Four preserved fish specimens in differently sized jars." decoding="async">
            </figure>
            <h2>Museum Collections</h2>
            <p><strong>Natural history collections are essential to my research.</strong> Working directly with alcohol-preserved specimens, cleared-and-stained material, histological sections, fossils, and computed tomography scan data gives me access to morphological diversity across hundreds of species that would otherwise be impossible to sample. Many deep-sea fishes are so rarely collected that museum specimens are the only means of studying their anatomy at all. Collections are also where my questions tend to start — variation that is obvious when you are looking at a tray of specimens is often variation worth explaining.</p>
          </div>
        </div>
        <style>
        .research-columns {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto 3rem auto;
          align-items: start;
        }
        .research-col {
          display: flex;
          flex-direction: column;
        }
        .research-col img {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 0.5rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          margin-bottom: 1rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .research-col img:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .research-col h2 {
          font-size: clamp(1.25rem, 2vw, 1.55rem);
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        .research-col p {
          margin: 0;
          line-height: 1.7;
        }
        @media (max-width: 768px) {
          .research-columns {
            grid-template-columns: 1fr;
          }
        }
        </style>
        </div>
    design:
      columns: 2
      view: full
      css_class: "bio-opaque bio-wide"
  - block: journal-covers
    id: journal-covers
    design:
      css_class: "journal-covers-section"
---
