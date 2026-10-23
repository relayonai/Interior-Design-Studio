"""Optional same-computer reconstruction service. Never binds a public interface.
Build frontend first, install requirements.txt, then run this script and open
http://127.0.0.1:8765. Videos and scans stay on this computer.
"""
import argparse,json,math,re,subprocess,sys,tempfile,threading,uuid
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
MAX_CLIP=1024*1024*1024
class Service:
    def __init__(self,root,data):self.root=Path(root).resolve();self.data=Path(data).resolve();self.data.mkdir(parents=True,exist_ok=True);self.jobs={};self.lock=threading.Lock()
    def create(self,body):
        if not isinstance(body,dict):raise ValueError('Expected a JSON object.')
        clips=body.get('clips')
        if not isinstance(clips,list) or not 1<=len(clips)<=5:raise ValueError('Use 1–5 video clips for a job.')
        for clip in clips:
            if not isinstance(clip,dict) or not all(isinstance(clip.get(k),(int,float)) and math.isfinite(clip[k]) for k in ['start','end']) or clip['start']<0 or clip['end']<=clip['start']:raise ValueError('Invalid clip time range.')
        if sum(c['end']-c['start'] for c in clips)>300:raise ValueError('Use at most 5 minutes of selected footage per CPU job.')
        identifier=uuid.uuid4().hex;folder=self.data/identifier;folder.mkdir()
        job={'id':identifier,'state':'uploading','clips':[{'start':c['start'],'end':c['end']} for c in clips],'folder':folder,'uploaded':set(),'process':None,'error':None}
        self.jobs[identifier]=job;return job
    def start(self,job):
        with self.lock:
            if job['state']!='uploading' or len(job['uploaded'])!=len(job['clips']):raise ValueError('Upload every clip before starting.')
            if any(j['state']=='running' for j in self.jobs.values()):raise ValueError('Another reconstruction is running. Wait or cancel it first.')
            manifest=[{**c,'path':str(job['folder']/f'clip-{i}.video')} for i,c in enumerate(job['clips'])]
            path=job['folder']/'manifest.json';path.write_text(json.dumps(manifest));job['state']='running'
        def run():
            try:
                with (job['folder']/'run.log').open('w') as log:
                    command=[sys.executable,str(Path(__file__).with_name('reconstruct.py')),'--manifest',str(path),'--output',str(job['folder']/'output'),'--fps','3','--features','6144','--overlap','12','--init-angle','8','--max-runtime','600']
                    with self.lock:
                        if job['state']=='cancelled':return
                        process=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT);job['process']=process
                    code=process.wait()
                if job['state']=='cancelled':return
                job['state']='complete' if code==0 and (job['folder']/'output'/'scan.json').is_file() else 'failed'
                if job['state']=='failed':job['error']='No usable reconstruction was produced. Inspect the log or try slower footage with more overlap.'
            except Exception as error:job['state']='failed';job['error']=str(error)
        threading.Thread(target=run,daemon=True).start()

def make_handler(service):
 class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(service.root),**kw)
    def log_message(self,*args):pass
    def local_request(self):
        allowed={f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
        host=self.headers.get('Host','')
        if host not in allowed:self.send_error(403,'Only local requests are allowed');return False
        origin=self.headers.get('Origin')
        if origin and origin not in {'http://'+h for h in allowed}:self.send_error(403,'Cross-origin requests are not allowed');return False
        if self.headers.get('Sec-Fetch-Site')=='cross-site':self.send_error(403,'Cross-site requests are not allowed');return False
        return True
    def response(self,body,code=200):
        data=json.dumps(body).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def body(self,limit):
        size=int(self.headers.get('Content-Length','0'))
        if not 0<size<=limit:raise ValueError('Invalid or oversized request body.')
        data=self.rfile.read(size)
        if len(data)!=size:raise ValueError('Incomplete upload.')
        return data
    def route(self):return re.fullmatch(r'/api/jobs/([a-f0-9]{32})(?:/(run|scan|clips/([0-4])))?',urlsplit(self.path).path)
    def do_GET(self):
        if not self.local_request():return
        path=urlsplit(self.path).path
        if path=='/api/reconstruction':self.response({'available':True,'private':True,'execution':'this computer'});return
        match=self.route()
        if match:
            job=service.jobs.get(match[1])
            if not job:self.response({'error':'Job not found'},404);return
            if match[2]=='scan':
                scan=job['folder']/'output'/'scan.json'
                if job['state']!='complete' or not scan.is_file():self.response({'error':'Scan is not ready'},409);return
                data=scan.read_bytes();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Disposition','attachment; filename="private-flat-scan.json"');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            log=job['folder']/'run.log';lines=log.read_text(errors='replace').splitlines()[-3:] if log.exists() else []
            self.response({'id':job['id'],'state':job['state'],'error':job['error'],'progress':'\n'.join(lines)});return
        if path.startswith('/api/'):self.response({'error':'Unknown route'},404);return
        candidate=Path(self.translate_path(self.path)).resolve()
        if not candidate.is_relative_to(service.root):self.send_error(403);return
        if candidate.is_dir() and not (candidate/'index.html').exists():self.send_error(403);return
        super().do_GET()
    def do_POST(self):
        if not self.local_request():return
        try:
            if self.path=='/api/jobs':
                if self.headers.get_content_type()!='application/json':raise ValueError('Expected JSON.')
                job=service.create(json.loads(self.body(20000)));self.response({'id':job['id'],'state':job['state']},201);return
            match=self.route()
            if not match or match[2]!='run' or match[1] not in service.jobs:self.response({'error':'Unknown job'},404);return
            service.start(service.jobs[match[1]]);self.response({'state':'running'},202)
        except (ValueError,TypeError,KeyError) as error:self.response({'error':str(error)},400)
    def do_PUT(self):
        if not self.local_request():return
        match=self.route()
        if not match or match[3] is None or match[1] not in service.jobs:self.response({'error':'Unknown job'},404);return
        job=service.jobs[match[1]];index=int(match[3])
        if job['state']!='uploading' or index>=len(job['clips']):self.response({'error':'Invalid clip'},409);return
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=MAX_CLIP:raise ValueError('Clip must be between 1 byte and 1 GB.')
            target=job['folder']/f'clip-{index}.video'
            with target.open('wb') as file:
                remaining=size
                while remaining:
                    block=self.rfile.read(min(1024*1024,remaining))
                    if not block:raise ValueError('Incomplete upload.')
                    file.write(block);remaining-=len(block)
            job['uploaded'].add(index);self.response({'uploaded':index})
        except ValueError as error:self.response({'error':str(error)},400)
    def do_DELETE(self):
        if not self.local_request():return
        match=self.route();job=service.jobs.get(match[1]) if match else None
        if not job:self.response({'error':'Unknown job'},404);return
        with service.lock:
            job['state']='cancelled'
            if job['process'] and job['process'].poll() is None:job['process'].terminate()
        self.response({'state':'cancelled'})
 return Handler

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8765);parser.add_argument('--data-dir',type=Path,default=Path(tempfile.gettempdir())/'flat-studio-private');args=parser.parse_args()
    root=Path(__file__).resolve().parents[2]/'dist'
    if not (root/'index.html').is_file():raise SystemExit('Run npm run build first.')
    service=Service(root,args.data_dir);server=ThreadingHTTPServer(('127.0.0.1',args.port),make_handler(service))
    print(f'Open http://127.0.0.1:{args.port} on this computer. Private processing directory: {service.data}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:
        for job in service.jobs.values():
            if job['process'] and job['process'].poll() is None:job['process'].terminate()
        server.server_close()
if __name__=='__main__':main()
