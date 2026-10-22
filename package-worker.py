from pathlib import Path
import subprocess,base64,json,mimetypes,gzip
root=Path(__file__).resolve().parent; out=root/'out'
if not (out/'index.html').is_file():
 raise SystemExit('先运行 npm run build 生成 out/，再执行打包。')
r=subprocess.run(['npm','ls','--omit=dev','--all','--parseable'],cwd=root,capture_output=True,text=True)
notices=[]
for line in dict.fromkeys(r.stdout.splitlines()):
 p=Path(line)
 if p==root or not (p/'package.json').exists(): continue
 try: meta=json.loads((p/'package.json').read_text())
 except Exception: continue
 for f in p.iterdir():
  if f.is_file() and f.name.lower().startswith(('license','licence','notice','copying')):
   notices.append('\n==== '+meta.get('name',p.name)+' '+meta.get('version','')+' / '+f.name+' ====\n'+f.read_text(errors='replace'))
if notices:
 (out/'DEPENDENCY-LICENSES.txt').write_text('\n'.join(notices))
elif (root/'public'/'DEPENDENCY-LICENSES.txt').exists():
 (out/'DEPENDENCY-LICENSES.txt').write_bytes((root/'public'/'DEPENDENCY-LICENSES.txt').read_bytes())
else:
 raise SystemExit('缺少依赖许可证；请先 npm ci 再打包。')
assets={}
for p in out.rglob('*'):
 if not p.is_file(): continue
 path='/'+p.relative_to(out).as_posix()
 mime=mimetypes.guess_type(path)[0] or 'application/octet-stream'
 if path.endswith('.js'): mime='application/javascript'
 if mime.startswith('text/') or mime in ('application/javascript','image/svg+xml','application/json'): mime+='; charset=utf-8'
 assets[path]=[mime,base64.b64encode(p.read_bytes()).decode()]
worker=(root/'worker.js').read_text()
worker=worker.replace('return env.ASSETS.fetch(request);','return serveAsset(request);')
static='const ASSET_DATA = '+json.dumps(assets,separators=(',',':'))+';\n'+'''
function serveAsset(request) {
 const u=new URL(request.url);
 let key=u.pathname==='/'?'/index.html':u.pathname;
 let a=ASSET_DATA[key] || ASSET_DATA[key+'.html'];
 let status=200;
 if(!a) {a=ASSET_DATA['/404.html']; status=404;}
 if(!a) return new Response('Not found',{status:404});
 if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
 const bytes=request.method==='HEAD'?null:Uint8Array.from(atob(a[1]),c=>c.charCodeAt(0));
 return new Response(bytes,{status,headers:{'Content-Type':a[0], 'Cache-Control':key.startsWith('/_next/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'}});
}
'''
bundle=static+worker
(root/'deploy-worker.mjs').write_text(bundle)
print('files',len(assets),'raw bytes',len(bundle.encode()),'gzip bytes',len(gzip.compress(bundle.encode())))
