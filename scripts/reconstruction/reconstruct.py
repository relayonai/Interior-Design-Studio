"""Private CPU structure-from-motion. Produces sparse components, not a floor plan.
Run with a JSON manifest of [{"path":"clip.mov","start":12,"end":105}].
All generated images/database/scan files live in --output, outside the repository.
"""
import argparse,json,subprocess,io,base64,hashlib
from pathlib import Path
import numpy as np
import pycolmap
from PIL import Image

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--fps',type=float,default=1)
    parser.add_argument('--threads',type=int,default=3)
    parser.add_argument('--max-runtime',type=int,default=600)
    parser.add_argument('--overlap',type=int,default=8)
    parser.add_argument('--features',type=int,default=4096)
    parser.add_argument('--init-angle',type=float,default=16)
    parser.add_argument('--exhaustive',action='store_true')
    args=parser.parse_args()
    if not 0.1<=args.fps<=5:raise ValueError('fps must be between 0.1 and 5')
    args.output.mkdir(parents=True,exist_ok=True)
    signature={'manifest':hashlib.sha256(args.manifest.read_bytes()).hexdigest(),'fps':args.fps,'features':args.features}
    config=args.output/'extraction-config.json'
    if config.exists() and json.loads(config.read_text())!=signature:raise ValueError('Extraction settings changed. Use a new output directory to avoid stale frames/features.')
    if not config.exists() and (args.output/'features.db').exists():raise ValueError('Existing database lacks provenance. Use a new output directory.')
    config.write_text(json.dumps(signature))
    images=args.output/'images';images.mkdir(exist_ok=True)
    metadata={}
    clips=json.loads(args.manifest.read_text())
    for index,clip in enumerate(clips):
        src=Path(clip['path']).resolve();start=float(clip.get('start',0));end=clip.get('end')
        if not src.is_file() or start<0 or (end is not None and float(end)<=start):raise ValueError('Invalid clip or time range')
        prefix=f'clip{index+1:02d}'
        existing=sorted(images.glob(prefix+'-*.jpg'))
        if not existing:
            cmd=['ffmpeg','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(src)]
            if end is not None:cmd+=['-t',str(float(end)-start)]
            cmd+=['-vf',f'fps={args.fps},scale=1024:-2','-q:v','3',str(images/(prefix+'-%05d.jpg'))]
            subprocess.run(cmd,check=True)
        for frame in images.glob(prefix+'-*.jpg'):
            number=int(frame.stem.split('-')[-1]);metadata[frame.name]={'clip':index+1,'seconds':start+(number-.5)/args.fps}
    print(f'Extracted {len(metadata)} frames',flush=True)
    database=args.output/'features.db'
    extraction=pycolmap.FeatureExtractionOptions();extraction.num_threads=args.threads;extraction.max_image_size=1024;extraction.sift.max_num_features=args.features
    pycolmap.extract_features(database,images,camera_mode=pycolmap.CameraMode.SINGLE,extraction_options=extraction,device=pycolmap.Device.cpu)
    matching=pycolmap.FeatureMatchingOptions();matching.num_threads=args.threads
    pairing=pycolmap.SequentialPairingOptions();pairing.overlap=args.overlap;pairing.quadratic_overlap=False;pairing.loop_detection=False
    if args.exhaustive:pycolmap.match_exhaustive(database,matching_options=matching,device=pycolmap.Device.cpu)
    else:pycolmap.match_sequential(database,matching_options=matching,pairing_options=pairing,device=pycolmap.Device.cpu)
    options=pycolmap.IncrementalPipelineOptions();options.num_threads=args.threads;options.max_num_models=8;options.min_model_size=8;options.max_runtime_seconds=args.max_runtime;options.random_seed=0
    options.mapper.init_min_tri_angle=args.init_angle
    options.ba_local_max_num_iterations=25;options.ba_global_max_num_iterations=40
    models=pycolmap.incremental_mapping(database,images,args.output/'sparse',options=options)
    components=[]
    for identifier,model in sorted(models.items(),key=lambda kv:-kv[1].num_reg_images()):
        points=list(model.points3D.values())
        if not points:continue
        coords=np.array([p.xyz for p in points]);center=np.median(coords,axis=0)
        extent=float(np.quantile(np.linalg.norm(coords-center,axis=1),.95));scale=10/max(extent,.001)
        packed=[]
        for p in points:
            pos=(p.xyz-center)*scale
            if np.linalg.norm(pos)>100:continue
            packed.extend([*[round(float(v),5) for v in pos],*[int(v) for v in p.color]])
        cameras=[]
        for image in sorted(model.images.values(),key=lambda i:i.name):
            pose=np.eye(4);pose[:3,:]=image.cam_from_world().matrix();world=np.linalg.inv(pose)@np.diag([1,-1,-1,1])
            world[:3,3]=(world[:3,3]-center)*scale
            camera=model.cameras[image.camera_id]
            thumb=Image.open(images/image.name);thumb.thumbnail((800,600));buffer=io.BytesIO();thumb.save(buffer,format='JPEG',quality=78)
            cameras.append({'name':image.name,'matrix':[round(float(v),7) for v in world.flatten(order='F')],
                'fov':float(2*np.arctan(camera.height/(2*camera.focal_length))*180/np.pi),
                'image':'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode(),**metadata.get(image.name,{})})
        components.append({'id':str(identifier),'points':packed,'cameras':cameras,'reprojectionError':float(model.compute_mean_reprojection_error())})
        print(f'Component {identifier}: {model.num_reg_images()} cameras, {len(packed)//6} points',flush=True)
    result={'format':'flat-studio-sfm-v1','units':'unscaled','sourceFrames':len(metadata),'components':components,
            'notice':'Sparse photogrammetry only. Components are not aligned to each other. No inferred room plan or metric scale.'}
    target=args.output/'scan.json';target.write_text(json.dumps(result,separators=(',',':')))
    print(f'Wrote {target}; {len(components)} separate components. Do not publish private scan assets.',flush=True)
    if not components:raise SystemExit('No coherent reconstruction. Use better-overlapping footage; no floor geometry was invented.')
if __name__=='__main__':main()
