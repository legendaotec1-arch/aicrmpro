import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.BUILD_ID || String(Date.now())

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    {
      name: 'inject-build-id',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="app-build" content="${buildId}" />\n  </head>`
        );
      },
    },
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '');
      },
    },
    {
      name: 'strip-dev-entry-tag',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(/\s*<script type="module" src="\/src\/main\.jsx"[^>]*><\/script>/g, '');
        },
      },
    },
    // Загрузка CSS/JS через fetch+retry и fallback /api/bundle/ (обход обрыва /assets/ на Cloudflare)
    {
      name: 'boot-fetch-loader',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          const cssMatch = html.match(/href="(\/assets\/[^"]+\.css)"/);
          const jsMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
          if (!cssMatch && !jsMatch) return html;
          const cssUrl = cssMatch ? cssMatch[1] : '';
          const jsUrl = jsMatch ? jsMatch[1] : '';
          let out = html.replace(/<link rel="stylesheet"[^>]+>\n?/g, '');
          out = out.replace(/<script type="module" src="\/assets\/[^"]+"><\/script>\n?/g, '');
          const boot = `
    <script>
      (function () {
        var cssUrl = ${JSON.stringify(cssUrl)};
        var jsUrl = ${JSON.stringify(jsUrl)};
        function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
        function altUrl(u) { var n = u.split('/').pop(); return '/api/bundle/' + n; }
        function bust(u) { return u + (u.indexOf('?') >= 0 ? '&' : '?') + '_b=' + Date.now(); }
        function fetchRetry(url, tries, wait) {
          return fetch(bust(url), { cache: 'no-store', credentials: 'same-origin' })
            .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res; })
            .catch(function (err) {
              if (tries <= 1) throw err;
              return sleep(wait).then(function () { return fetchRetry(url, tries - 1, Math.min(wait * 1.5, 4000)); });
            });
        }
        function loadUrl(url) {
          return fetchRetry(altUrl(url), 3, 800).catch(function () { return fetchRetry(url, 2, 1200); });
        }
        function injectCss(text) {
          var el = document.createElement('style');
          el.textContent = text;
          document.head.appendChild(el);
        }
        function injectModule(url) {
          return new Promise(function (resolve, reject) {
            if (window.__wonerMainExecuted) {
              resolve();
              return;
            }
            var tried = 0;
            var urls = [altUrl(url), url];
            function next() {
              if (window.__wonerMainExecuted) {
                resolve();
                return;
              }
              if (tried >= urls.length) { reject(new Error('module load failed')); return; }
              var src = bust(urls[tried++]);
              var s = document.createElement('script');
              s.type = 'module';
              s.src = src;
              s.onload = function () { resolve(); };
              s.onerror = function () {
                if (window.__wonerMainExecuted) {
                  resolve();
                  return;
                }
                s.remove();
                sleep(1200).then(next);
              };
              document.head.appendChild(s);
            }
            next();
          });
        }
        var chain = Promise.resolve();
        if (cssUrl) {
          chain = chain.then(function () {
            return loadUrl(cssUrl).then(function (r) { return r.text(); }).then(injectCss);
          });
        }
        if (jsUrl) {
          chain = chain.then(function () { return injectModule(jsUrl); });
        }
        chain.catch(function (err) {
          window.__wonerReportBootFailure('BOOT_FETCH_FAILED', { message: String(err && err.message || err) });
          window.__wonerBootError('fetch');
        });
      })();
    </script>`;
          return out.replace('</head>', `${boot}\n  </head>`);
        },
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    base: '/',
    target: 'safari14',
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('react-router')) return 'react-router';
          if (id.includes('axios')) return 'axios';
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('moment')) return 'moment';
          return 'vendor';
        },
      },
    },
  }
})
