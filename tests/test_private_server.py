import importlib.util,json,tempfile,threading,unittest,http.client
from pathlib import Path
spec=importlib.util.spec_from_file_location('private_server',Path(__file__).resolve().parents[1]/'scripts'/'reconstruction'/'serve.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PrivateServerTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();root=Path(self.temp.name);self.root=root/'web';self.root.mkdir();(self.root/'index.html').write_text('test app')
  self.service=module.Service(self.root,root/'private');self.server=module.ThreadingHTTPServer(('127.0.0.1',0),module.make_handler(self.service));threading.Thread(target=self.server.serve_forever,daemon=True).start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.temp.cleanup()
 def call(self,method,path,body=None,headers=None):
  c=http.client.HTTPConnection('127.0.0.1',self.server.server_port);c.request(method,path,body,headers or {});r=c.getresponse();code=r.status;data=r.read();c.close();return code,data
 def test_cross_origin_and_rebinding_are_rejected(self):
  code,_=self.call('POST','/api/jobs','{}',{'Content-Type':'application/json','Origin':'https://other.example'});self.assertEqual(code,403)
  code,_=self.call('GET','/api/reconstruction',headers={'Host':'other.example'});self.assertEqual(code,403)
 def test_clip_bytes_stay_in_private_job_folder(self):
  payload=json.dumps({'clips':[{'name':'../../outside.mov','start':0,'end':2}]})
  code,data=self.call('POST','/api/jobs',payload,{'Content-Type':'application/json'});self.assertEqual(code,201);identifier=json.loads(data)['id']
  code,_=self.call('PUT',f'/api/jobs/{identifier}/clips/0',b'private video bytes',{'Content-Type':'application/octet-stream'});self.assertEqual(code,200)
  self.assertEqual((self.service.data/identifier/'clip-0.video').read_bytes(),b'private video bytes')
  self.assertEqual(list(self.root.iterdir()),[self.root/'index.html'])
  code,_=self.call('GET',f'/api/jobs/{identifier}/scan');self.assertEqual(code,409)
  code,_=self.call('DELETE',f'/api/jobs/{identifier}');self.assertEqual(code,200)
  code,_=self.call('POST',f'/api/jobs/{identifier}/run');self.assertEqual(code,400)
 def test_bad_time_ranges_and_unknown_jobs_do_not_start_processes(self):
  for clips in [[],[{'start':3,'end':1}],[{'start':float('nan'),'end':3}]]:
   code,_=self.call('POST','/api/jobs',json.dumps({'clips':clips}),{'Content-Type':'application/json'});self.assertEqual(code,400)
  self.assertEqual(len(self.service.jobs),0)
  code,_=self.call('GET','/api/jobs/'+'a'*32);self.assertEqual(code,404)
if __name__=='__main__':unittest.main()
