function wait(video, name, signal, timeout=20000) {
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener(name,done);video.removeEventListener('error',error);signal?.removeEventListener('abort',abort);};
    const done=()=>{cleanup();resolve();};
    const error=()=>{cleanup();reject(new Error('This video could not be decoded. Try an H.264 MP4 or MOV copy.'));};
    const abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'));};
    video.addEventListener(name,done,{once:true});video.addEventListener('error',error,{once:true});signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>{cleanup();reject(new Error('Video decoding timed out. Try a shorter H.264 clip.'));},timeout);
    if(signal?.aborted)abort();
  });
}
export async function readVideo(file,signal) {
  const video=document.createElement('video'),url=URL.createObjectURL(file);
  video.muted=true;video.playsInline=true;video.preload='auto';
  const release=()=>{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
  try {const ready=wait(video,'loadedmetadata',signal);video.src=url;video.load();await ready;
    if(!Number.isFinite(video.duration)||video.duration<=0||!video.videoWidth)throw new Error('Video has no usable frames.');
    return {file,video,url,duration:video.duration,release};
  }catch(error){release();throw error;}
}
export async function sampleVideo(source,{start=0,end=source.duration,count=8,signal,onProgress=()=>{}}={}) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>source.duration+.01||end<=start||!Number.isInteger(count)||count<1||count>24)throw new Error('Choose a valid start/end range and 1–24 frames.');
  const video=source.video,canvas=document.createElement('canvas');
  const scale=Math.min(1,640/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  const context=canvas.getContext('2d'),frames=[];
  for(let i=0;i<count;i++){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const time=Math.min(source.duration-.025,start+(end-start)*(i+.5)/count);
    if(Math.abs(video.currentTime-time)>.001){const seek=wait(video,'seeked',signal);video.currentTime=time;await seek;}
    else if(video.readyState<2)await wait(video,'loadeddata',signal);
    context.drawImage(video,0,0,canvas.width,canvas.height);
    frames.push({time,src:canvas.toDataURL('image/jpeg',.78),clip:source.file.name});onProgress(i+1,count);
  }
  return frames;
}
export const timeLabel=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
