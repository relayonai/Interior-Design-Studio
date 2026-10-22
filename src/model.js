export const STORAGE_KEY = 'flat-studio-layout-v1';
export const catalog = {
  sofa: { name: 'Sofa', w: 2.2, d: .9, h: .78, color: '#b29881', category: 'Living' },
  armchair: { name: 'Lounge chair', w: .85, d: .85, h: .8, color: '#8d9c85', category: 'Living' },
  coffee: { name: 'Coffee table', w: 1.2, d: .6, h: .38, color: '#785c44', category: 'Living' },
  dining: { name: 'Dining table', w: 1.5, d: .95, h: .75, color: '#f1ebe1', category: 'Dining' },
  chair: { name: 'Dining chair', w: .48, d: .5, h: .8, color: '#bfa78a', category: 'Dining' },
  bed: { name: 'Double bed', w: 1.5, d: 2, h: .55, color: '#e1d8c8', category: 'Bedroom' },
  wardrobe: { name: 'Wardrobe', w: 1.6, d: .6, h: 2, color: '#b4b7ab', category: 'Bedroom' },
  desk: { name: 'Desk', w: 1.2, d: .6, h: .75, color: '#9d7956', category: 'Bedroom' },
  rug: { name: 'Woven rug', w: 2.6, d: 1.8, h: .025, color: '#d3c5aa', category: 'Living' },
  plant: { name: 'Floor plant', w: .5, d: .5, h: 1.4, color: '#58735a', category: 'Decor' },
};
export function createItem(type, floor, x, z, id = crypto.randomUUID()) {
  return { id, type, floor, x, z, rotation: 0, ...catalog[type] };
}
export function defaultLayout() {
  return { version: 1, finishes: { wall: '#f2eee5', floor: '#c99c65' }, items: [
    createItem('rug',0,2.4,2.2,'rug-1'), createItem('sofa',0,2.3,.75,'sofa-1'),
    {...createItem('sofa',0,.65,2.4,'sofa-2'),rotation:90},createItem('coffee',0,2.3,2,'coffee-1'),
    createItem('dining',0,6.7,1.6,'dining-1'),createItem('chair',0,6.7,.7,'chair-1'),
    {...createItem('chair',0,6.7,2.5,'chair-2'),rotation:180},createItem('plant',0,8.3,.6,'plant-1'),
    createItem('bed',1,2.1,6,'bed-1'),createItem('wardrobe',1,.9,7.6,'wardrobe-1'),createItem('desk',1,3.5,4.8,'desk-1'),
    createItem('bed',1,6.3,6,'bed-2'),{...createItem('wardrobe',1,8.6,5.8,'wardrobe-2'),rotation:90},
  ] };
}
export function footprint(item) {
  const angle = item.rotation * Math.PI / 180;
  return { w: Math.abs(Math.cos(angle))*item.w + Math.abs(Math.sin(angle))*item.d,
    d: Math.abs(Math.sin(angle))*item.w + Math.abs(Math.cos(angle))*item.d };
}
export function constrain(item, project) {
  const {width,minZ,maxZ} = floorBounds(project,item.floor);
  let f = footprint(item);
  const fit = Math.min(1, width / f.w, (maxZ-minZ) / f.d);
  if (fit < 1) { item = {...item,w:item.w*fit,d:item.d*fit}; f = footprint(item); }
  return { ...item, x: Math.max(f.w/2,Math.min(width-f.w/2,item.x)), z: Math.max(minZ+f.d/2,Math.min(maxZ-f.d/2,item.z)) };
}
export function validateLayout(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.items) || value.items.length > 300) throw new Error('Choose a Flat Studio layout exported from this app.');
  if (!value.finishes || !/^#[\da-f]{6}$/i.test(value.finishes.wall) || !/^#[\da-f]{6}$/i.test(value.finishes.floor)) throw new Error('Invalid finishes.');
  const project = value.project ? validateProject(value.project) : undefined;
  const ids = new Set();
  const items = value.items.map(i => {
    if (!i || !Object.hasOwn(catalog,i.type) || typeof i.id !== 'string' || ids.has(i.id) || !Number.isInteger(i.floor) || i.floor<0 || i.floor>=(project?project.floors.length:2) ||
      !['x','z','rotation','w','d','h'].every(k=>Number.isFinite(i[k])) || !['w','d','h'].every(k=>i[k] >= .02 && i[k] <= 5) || !/^#[\da-f]{6}$/i.test(i.color)) throw new Error('Invalid furniture data.');
    ids.add(i.id);
    return constrain({id:i.id,type:i.type,floor:i.floor,x:i.x,z:i.z,rotation:i.rotation,w:i.w,d:i.d,h:i.h,color:i.color,name:catalog[i.type].name,category:catalog[i.type].category},project);
  });
  return {version:1,finishes:{...value.finishes},items,...(project?{project}:{})};
}

export function floorBounds(project, index) {
  if (project?.kind === 'video-assisted') {
    const level=project.floors[index];
    if (!level) throw new Error('Unknown floor.');
    return { width:level.width,depth:level.depth,minZ:0,maxZ:level.depth };
  }
  return {width:9,depth:index===1?5:8,minZ:index===1?3:0,maxZ:8};
}
export function createProject({name,area,floors,aspect=1.25}) {
  if (typeof name!=='string'||!name.trim()||name.length>80||!Number.isFinite(area)||area<10||area>1500||!Number.isInteger(floors)||floors<1||floors>3||!Number.isFinite(aspect)||aspect<.25||aspect>4) throw new Error('Enter a name, area of 10–1500 m², 1–3 floors and a valid aspect ratio.');
  const perFloor=area/floors;
  return { kind:'video-assisted', name:name.trim(), area,
    floors:Array.from({length:floors},(_,i)=>({name:`Level ${i+1}`,width:Math.sqrt(perFloor*aspect),depth:Math.sqrt(perFloor/aspect),rooms:[]})),
    sources:[], note:'User-guided rectangular shell; equal floor-area split is an assumption, not extracted from video.' };
}
export function validateProject(p) {
  if (!p||p.kind!=='video-assisted'||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!Number.isFinite(p.area)||p.area<10||p.area>1500||!Array.isArray(p.floors)||p.floors.length<1||p.floors.length>3) throw new Error('Invalid project.');
  const ids=new Set();
  const floors=p.floors.map(f=>{
    if(typeof f.name!=='string'||f.name.length>80||![f.width,f.depth].every(v=>Number.isFinite(v)&&v>=1&&v<=80)||!Array.isArray(f.rooms)||f.rooms.length>50)throw new Error('Invalid floor dimensions.');
    const rooms=f.rooms.map(r=>{
      if(!r||typeof r.id!=='string'||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||![r.x,r.z,r.w,r.d].every(Number.isFinite)||r.x<0||r.z<0||r.w<.5||r.d<.5||r.x+r.w>f.width+.001||r.z+r.d>f.depth+.001||!['front','back','left','right','none'].includes(r.door))throw new Error('Rooms must fit within their floor.');
      ids.add(r.id);return {id:r.id,name:r.name,x:r.x,z:r.z,w:r.w,d:r.d,door:r.door};
    });return {name:f.name,width:f.width,depth:f.depth,rooms};
  });
  const calculated=floors.reduce((sum,f)=>sum+f.width*f.depth,0);
  if(Math.abs(calculated-p.area)>.1)throw new Error('Floor areas must add up to the project area.');
  const sources=Array.isArray(p.sources)?p.sources.slice(0,20).map(s=>({name:String(s.name).slice(0,200),duration:Number.isFinite(s.duration)?s.duration:0,start:Number.isFinite(s.start)?s.start:0,end:Number.isFinite(s.end)?s.end:0})):[];
  return {kind:p.kind,name:p.name,area:p.area,floors,sources,note:'User-guided geometry; not an automated reconstruction.'};
}
