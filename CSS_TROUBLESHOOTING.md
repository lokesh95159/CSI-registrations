# CSS / deployment fix

The frontend assets are now referenced with relative paths (`./style.css` and `./app.js`) so the page works correctly on Netlify and when opened under a site path.

Important: do not open `public/index.html` by double-clicking it and expect Razorpay/server APIs to work. Deploy through Netlify (or `netlify dev`) because the API routes are Netlify Functions.

After deploying, do a hard refresh:
- Windows: Ctrl+Shift+R
- Mac: Cmd+Shift+R

If using GitHub + Netlify, trigger a fresh deploy after pushing the updated files.
