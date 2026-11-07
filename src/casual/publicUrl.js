// Public-folder assets must respect Vite `base` (GitHub Pages project paths).
// Root-absolute "/foo.png" resolves to the host root and 404s off a subpath.
export function publicUrl(path){
  const clean=String(path||'').replace(/^\/+/,'');
  const raw=(typeof import.meta!=='undefined'&&import.meta.env&&import.meta.env.BASE_URL)||'./';
  const base=raw.endsWith('/')?raw:raw+'/';
  return base+clean;
}
