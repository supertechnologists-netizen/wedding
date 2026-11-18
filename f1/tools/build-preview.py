# Builds /tmp/preview.html: a static copy of the site (no DB) to publish as an Artifact preview.
# Usage: python3 f1/tools/build-preview.py  ->  then publish /tmp/preview.html with the Artifact tool (same file_path keeps the URL).
import json, re, subprocess, time, os, urllib.request
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public') + '/'
sp = '/tmp/'

# get default settings from a throw-away server instance
env = dict(os.environ, PORT='3122', ADMIN_PASSWORD='x', DATA_DIR='/tmp/gpdata_prev')
srv = subprocess.Popen(['node', '--disable-warning=ExperimentalWarning', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'server.js')], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
settings = json.load(urllib.request.urlopen('http://localhost:3122/api/site'))['settings']
srv.terminate()

html = open(base + 'index.html').read()
css = open(base + 'style.css').read()
js = open(base + 'app.js').read()

body = html[html.index('<body'):]
body = body[body.index('>') + 1:]
body = body[:body.index('<script src="/app.js"></script>')]
body = body.replace('</body>', '').replace('</html>', '')

shim = '''(function(){
  document.body.classList.add('intro-on');
  var SETTINGS = %s;
  var jr = function(o,c){ return Promise.resolve(new Response(JSON.stringify(o),{status:c||200,headers:{'Content-Type':'application/json'}})); };
  var realFetch = window.fetch.bind(window);
  window.fetch = function(u,o){
    u = String(u);
    if (u.indexOf('/api/site') === 0) return jr({settings:SETTINGS,guest:null});
    if (u.indexOf('/api/rsvp') === 0) { var b = {}; try { b = JSON.parse(o.body); } catch(e){} return jr({ok:true,guest:{code:'preview',name:b.name||''}}); }
    if (u.indexOf('/api/wish') === 0) return jr({ok:true});
    return realFetch(u,o);
  };
})();''' % json.dumps(settings, ensure_ascii=False)

out = '''<title>Anna and Andrii Wedding</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Wedding Grand Prix: приглашение на свадьбу Ани и Андрія">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap">
<style>
''' + css + '''
.vmap{display:none!important}
.sound,.nav{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
</style>
''' + body + '''
<script>
''' + shim + '''
</script>
<script>
''' + js + '''
</script>
'''
open(sp + 'preview.html', 'w').write(out)
print(len(out))
