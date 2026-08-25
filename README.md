# anoplogaster.com

Source repository for [anoplogaster.com](https://www.anoplogaster.com), the personal academic website of Alex J. Maile.

The site is built with Hugo through R/blogdown, versioned with GitHub, and deployed by Netlify.

## Local preview

From R:

```r
setwd("~/anoplogaster_website")
blogdown::serve_site()
```

Changes should be reviewed locally before they are committed or pushed, since pushes to the main branch can trigger a Netlify deployment.
