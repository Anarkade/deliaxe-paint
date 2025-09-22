const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
const root = path.resolve(__dirname, '..', 'dist');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const fullPath = path.join(root, reqPath);

    if (!fullPath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      // fallback to index.html
      const index = path.join(root, 'index.html');
      if (fs.existsSync(index)) {
        res.setHeader('Content-Type', mime['.html']);
        res.end(fs.readFileSync(index));
        return;
      }
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
    stream.on('error', (err) => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
  } catch (err) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(port, () => {
  console.log(`Preview server listening on http://127.0.0.1:${port}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
