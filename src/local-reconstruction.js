// Enabled only when this app is served by its same-origin, loopback CPU service.
export async function attachLocalReconstruction({button,cancel,status,getClips,onScan}){
 if(!['localhost','127.0.0.1'].includes(location.hostname)||!['/','/index.html'].includes(location.pathname))return;
 try{const response=await fetch('./api/reconstruction');if(!response.ok)return;const info=await response.json();if(!info.available||!info.private)return;}catch{return;}
 button.hidden=false;let job=null,poll=null;
 const request=async(path,options={})=>{const response=await fetch('./api/'+path,options);const body=await response.json();if(!response.ok)throw new Error(body.error??'Local reconstruction failed.');return body;};
 button.onclick=async()=>{
  const clips=getClips();if(!clips.length){status('Open your local videos first.');return;}if(clips.length>5){status('Reconstruct up to 5 clips in one job.');return;}
  if(!confirm('Run CPU reconstruction on this computer? It may take several minutes. Copies of the selected videos and derived scan will be stored in the local processing directory. Nothing is sent to a public service.'))return;
  button.disabled=true;cancel.hidden=false;
  try{job=await request('jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clips:clips.map(c=>({start:c.start,end:c.end}))})});
   for(let i=0;i<clips.length;i++){status(`Copying clip ${i+1} to the processor on this computer…`);await request(`jobs/${job.id}/clips/${i}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:clips[i].file});}
   await request(`jobs/${job.id}/run`,{method:'POST'});
   const check=async()=>{try{const state=await request(`jobs/${job.id}`);status(`Private CPU reconstruction: ${state.state}. ${state.progress??''}`);if(state.state==='complete'){const response=await fetch(`./api/jobs/${job.id}/scan`);if(!response.ok)throw new Error('Could not read the completed scan.');await onScan(new File([await response.blob()],'private-flat-scan.json',{type:'application/json'}));finish();}else if(['failed','cancelled'].includes(state.state)){if(state.error)status(state.error);finish();}else poll=setTimeout(check,3000);}catch(e){status(e.message);finish();}};
   await check();
  }catch(e){status(e.message);finish();}
 };
 function finish(){button.disabled=false;cancel.hidden=true;clearTimeout(poll);job=null;}
 cancel.onclick=async()=>{if(!job)return;try{await request(`jobs/${job.id}`,{method:'DELETE'});status('Local reconstruction cancelled. Files remain in the local processing directory.');}catch(e){status(e.message);}finish();};
}
