export function validateScan(scan){
 if(!scan||scan.format!=='flat-studio-sfm-v1'||!Array.isArray(scan.components)||scan.components.length<1||scan.components.length>30)throw new Error('Choose a Flat Studio photogrammetry scan JSON.');
 let total=0;
 const components=scan.components.map((c,index)=>{
  if(!Array.isArray(c.points)||c.points.length%6||c.points.length<6)throw new Error('Scan contains invalid points.');
  total+=c.points.length;if(total>6000000)throw new Error('Scan has too many points for this viewer.');
  for(let i=0;i<c.points.length;i++){const v=c.points[i];if(!Number.isFinite(v)||Math.abs(v)>1e6||(i%6>=3&&(v<0||v>255)))throw new Error('Invalid point position or colour.');}
  if(!Array.isArray(c.cameras)||c.cameras.length>2000)throw new Error('Invalid camera list.');
  const cameras=c.cameras.map(camera=>{
   if(!Array.isArray(camera.matrix)||camera.matrix.length!==16||!camera.matrix.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)||!Number.isFinite(camera.fov)||camera.fov<1||camera.fov>179)throw new Error('Invalid camera pose.');
   if(typeof camera.image!=='string'||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(camera.image)||camera.image.length>2000000)throw new Error('Invalid camera image.');
   return {name:String(camera.name??'Frame').slice(0,150),matrix:camera.matrix,fov:camera.fov,image:camera.image,clip:Number.isFinite(camera.clip)?camera.clip:0,seconds:Number.isFinite(camera.seconds)?camera.seconds:0};
  });
  return {id:String(c.id??index).slice(0,40),points:c.points,cameras,reprojectionError:Number.isFinite(c.reprojectionError)?c.reprojectionError:null};
 });
 return {format:scan.format,units:'unscaled',sourceFrames:Number.isFinite(scan.sourceFrames)?scan.sourceFrames:0,components};
}
