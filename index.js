export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = 'avrahamlip.github.io';
    const basePath = '/3-979';

    // 1. Handle the root path: proxy to the app index
    if (url.pathname === '/' || url.pathname === '') {
      const target = new URL(basePath + '/', `https://${hostname}`);
      return fetch(new Request(target, request));
    }

    // 2. Handle asset requests and subpaths
    if (url.pathname.startsWith(basePath)) {
      const target = new URL(url.pathname, `https://${hostname}`);
      return fetch(new Request(target, request));
    }

    // 3. Fallback: try to prefix with base path
    const target = new URL(basePath + url.pathname, `https://${hostname}`);
    const response = await fetch(new Request(target, request));
    
    // If it's a 404, we might want to return the index for SPA routing
    if (response.status === 404 && !url.pathname.includes('.')) {
        return fetch(new Request(new URL(basePath + '/', `https://${hostname}`), request));
    }

    return response;
  }
}
