import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { catalog, defaultLayout, createItem, constrain, validateLayout, STORAGE_KEY, floorBounds } from './model.js';
import { setupVideoWorkflow } from './video-workflow.js';
import { renderProjectEditor } from './project-editor.js';

let layout=defaultLayout(), loadWarning='';
try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) layout=validateLayout(JSON.parse(raw)); } catch {loadWarning='Saved layout could not be loaded. The starting layout is shown.';}
let floor=0, view='3d', selected=null, category='All', history=[], future=[], toastTimer,changing=false;
const icons={sofa:'▰',armchair:'▣',coffee:'▱',dining:'◯',chair:'⑁',bed:'▤',wardrobe:'▥',desk:'⊓',rug:'▧',plant:'♧'};
document.querySelector('#planner-app').innerHTML=`
<header><div><div class="brand"><div class="brand-mark">⌑</div>flat / studio</div><div class="project">YOUR FLAT · A WORK IN POSSIBILITY</div></div><div class="top-actions"><button id="new-video" class="primary">New from video</button><span class="save-state" id="save-state">Saved on this device</span><button id="import-button">Import</button><button id="export">Export layout ↗</button></div></header>
<main class="workspace"><aside class="left"><div class="eyebrow">THE SPACE / 001</div><h1>Unverified example.</h1><p class="muted">This layout does not represent verified room locations. Use footage as the source of truth; build a corrected plan only from confirmed observations.</p><div class="area-card"><div class="eyebrow">INTERNAL FLOOR AREA</div><div class="area-num">117 <small>m²</small></div><div class="muted">Two levels · balcony excluded</div></div><h3>Your floors</h3><button class="floor-button active" data-floor="0"><div><b>01 &nbsp; Lower level</b><small>Living, dining & kitchen</small></div><span>72 m²<small>estimated</small></span></button><button class="floor-button" data-floor="1"><div><b>02 &nbsp; Upper level</b><small>Bedrooms & mezzanine</small></div><span>45 m²<small>estimated</small></span></button><h3>Spaces on this level</h3><ul class="room-list" id="rooms"></ul><div id="project-editor"></div><div class="notice"><b>A considered first draft</b><br>Modelled from your walkthrough. The 72 / 45 m² split, room sizes and positions are estimates scaled to your confirmed 117 m² total. Balcony is separate.</div></aside>
<section class="stage" aria-label="Interactive flat model"><div class="stage-head"><div class="eyebrow">UNVERIFIED PLANNING EXAMPLE</div><h2 id="floor-title">The lower level</h2><span class="badge">ROOM POSITIONS NOT RECONSTRUCTED</span></div><div class="view-controls"><button class="active" data-view="3d">3D view</button><button data-view="plan">Floor plan</button></div><div id="canvas" class="canvas-wrap"></div><div id="reference-panel" hidden><button id="close-reference" aria-label="Hide video reference">×</button><img id="reference-image" alt="Selected walkthrough reference"><span id="reference-caption"></span><button id="change-reference">Choose another frame</button></div><div class="scene-tools"><button id="zoom-in" aria-label="Zoom in">＋</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="home" aria-label="Reset camera">⌂</button><button id="undo" aria-label="Undo">↶</button><button id="redo" aria-label="Redo">↷</button></div><div class="floating-label" id="level-label">LOWER LEVEL · 72 M² ESTIMATED</div><div class="stage-foot"><div class="hint">Drag furniture to rearrange · Drag empty space to orbit<br>Scroll to zoom · Select an item to edit its dimensions</div><div class="compass" title="Model orientation only; compass direction unknown">↗</div></div></section>
<aside class="right"><div class="catalog-title"><div><div class="eyebrow">MAKE ROOM FOR YOU</div><h2>Furniture library</h2></div><span>＋</span></div><div class="tabs" id="categories"></div><div class="catalog" id="catalog"></div><div class="divider"></div><div id="selection"></div><div class="divider"></div><h3>Set the mood</h3><div class="fields-row"><label class="field">Wall colour<input id="wall-color" type="color" aria-label="Wall colour"></label><label class="field">Timber tone<input id="floor-color" type="color" aria-label="Timber tone"></label></div><details><summary>About this model</summary><p id="about-model">This is a manually interpreted planning model based on your video, not an automated scan or measured survey. The lower footprint is 9 × 8 m (72 m²); the upper floor is 9 × 5 m (45 m²). The opening above the living area is excluded from upper-floor area. Balcony dimensions are provisional and excluded from 117 m². Room divisions, windows, stairs and fittings need measurement checks. Furniture can overlap walls or other pieces: check clearances visually. Layouts are saved in this browser; export a file for a backup.</p></details><button id="reset" class="danger" style="margin-top:18px;font-size:11px">Reset to starting layout</button></aside></main><input type="file" id="import" accept=".json,application/json"><div id="toast" role="status" hidden></div>`;
const $=s=>document.querySelector(s);
function toast(msg){const el=$('#toast');el.className='toast';el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4000);}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(layout));$('#save-state').textContent='Saved on this device';}catch{$('#save-state').textContent='Export to save your changes';toast('Browser storage unavailable. Export your layout to save it.');}}
function checkpoint(){history.push(JSON.stringify(layout));if(history.length>60)history.shift();future=[];}
function change(fn){if(changing)return;changing=true;try{checkpoint();fn(layout);persist();rebuild();renderSelection();syncFinishes();}finally{changing=false;}}
function undo(redo=false){const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(JSON.stringify(layout));layout=JSON.parse(from.pop());selected=null;persist();rebuild();renderSelection();syncFinishes();}

const wrap=$('#canvas'), scene=new THREE.Scene();scene.background=new THREE.Color('#f0f0e9');
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(error){wrap.innerHTML='<div class="error"><h2>The 3D view could not start</h2><p>Open the app in an up-to-date Chrome or Edge browser with graphics acceleration enabled. Embedded file previews may not support WebGL.</p></div>';throw error;}renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;wrap.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D floor model. Use furniture controls to add and edit items.');
const camera=new THREE.PerspectiveCamera(38,1,.1,150), planCamera=new THREE.OrthographicCamera(-7,7,7,-7,.1,100);let activeCamera=camera;
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=6;controls.maxDistance=130;controls.target.set(4.5,0,4);camera.position.set(17,17,20);
scene.add(new THREE.HemisphereLight(0xffffff,0xb0b3a0,1.8));const sun=new THREE.DirectionalLight(0xfff7e8,2);sun.position.set(-4,15,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15});sun.shadow.normalBias=.03;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#f0f0e9',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.16;ground.receiveShadow=true;scene.add(ground);
let architecture=new THREE.Group(), furniture=new THREE.Group(), selectionBox;scene.add(architecture,furniture);
function mat(color){return new THREE.MeshStandardMaterial({color,roughness:.78});}
function box(group,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function cylinder(group,r,h,x,y,z,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),mat(color));m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
function clearGroup(g){g.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose();});}});g.clear();}
function label(text,x,z,size=.34){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.font='500 46px sans-serif';ctx.fillStyle='#64705b';ctx.textAlign='center';ctx.fillText(text,384,78);const texture=new THREE.CanvasTexture(c);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*6,size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.035,z);architecture.add(mesh);}
function wall(x1,z1,x2,z2,height=.85){const length=Math.hypot(x2-x1,z2-z1);const m=box(architecture,length,height,.12,(x1+x2)/2,height/2,(z1+z2)/2,layout.finishes.wall);m.rotation.y=-Math.atan2(z2-z1,x2-x1);}
function windowLine(x1,z1,x2,z2){const len=Math.hypot(x2-x1,z2-z1), angle=-Math.atan2(z2-z1,x2-x1);for(const y of [.16,.72,1.28]){const b=box(architecture,len,.045,.045,(x1+x2)/2,y,(z1+z2)/2,'#38483e');b.rotation.y=angle;}const segments=Math.ceil(len/1.5);for(let i=0;i<=segments;i++){const t=i/segments;box(architecture,.045,1.35,.045,x1+(x2-x1)*t,.675,z1+(z2-z1)*t,'#38483e');}}
function buildArchitecture(){clearGroup(architecture);if(layout.project){buildCustomArchitecture();return;}const minZ=floor===0?0:3,depth=floor===0?8:5;
box(architecture,9,.12,depth,4.5,-.06,minZ+depth/2,layout.finishes.floor);
for(let z=minZ+.15;z<8;z+=.28)box(architecture,9,.003,.009,4.5,.003,z,'#b38a58');
wall(0,minZ,0,8);wall(0,8,9,8);wall(9,8,9,minZ);windowLine(0,minZ,9,minZ);
if(floor===0){
// Lower hall and bathroom; openings are deliberate schematic gaps.
wall(0,5,2.7,5);wall(2.7,5,2.7,6.2);wall(2.7,7.1,2.7,8);wall(2.7,5,3.8,5);wall(4.7,5,6.4,5);wall(6.4,5,6.4,8);
box(architecture,2.45,.025,2.7,1.3,.015,6.5,'#e3e3d9');box(architecture,1.5,.48,.8,1.1,.25,7.4,'#f5f5ef');box(architecture,.65,.7,.45,.55,.35,5.5,'#f8f8f1');cylinder(architecture,.25,.42,2.1,.21,7.3,'#f7f7f1');
for(let i=0;i<12;i++)box(architecture,1,.09+i*.085,.24,7.7,(.09+i*.085)/2,7.6-i*.24,'#b99060');
label('BATH',1.3,6.3,.25);label('HALL',4.6,6.8,.28);label('STAIRS ↑',7.8,7.7,.23);
// Kitchen cabinets and breakfast peninsula.
box(architecture,3.1,.87,.62,6.9,.435,4.65,'#b28c60');box(architecture,.64,.87,1.6,8.6,.435,3.6,'#b28c60');box(architecture,2.4,.87,.65,7.15,.435,3,'#b28c60');
box(architecture,3.2,.06,.72,6.9,.91,4.65,'#9d9e91');box(architecture,.72,.06,1.7,8.6,.91,3.6,'#9d9e91');box(architecture,2.5,.06,.75,7.15,.91,3,'#9d9e91');box(architecture,.65,.015,.5,6.7,.95,4.65,'#333a35');
label('LIVING',2.4,3.7);label('DINING',6.7,.22,.25);
// Separate, provisional balcony.
box(architecture,3.4,.11,1.5,6.1,-.06,-.85,'#b1a18b');windowLine(4.4,-1.6,7.8,-1.6);windowLine(4.4,0,4.4,-1.6);windowLine(7.8,0,7.8,-1.6);label('BALCONY · EST.',6.1,-.85,.24);
}else{
wall(0,4.2,1,4.2);wall(1.9,4.2,5.1,4.2);wall(6,4.2,9,4.2);wall(4.5,4.2,4.5,8);
wall(7.2,6.3,7.2,8);wall(7.2,6.3,7.6,6.3);wall(8.4,6.3,9,6.3);box(architecture,1.7,.02,1.65,8.1,.015,7.15,'#deded5');box(architecture,.65,.65,.45,8.5,.325,7.7,'#f5f5ef');
label('BEDROOM 01',2.2,7.3,.26);label('BEDROOM 02',6.2,7.4,.26);label('LANDING / OPEN TO BELOW',4.5,3.6,.25);
const voidMesh=box(architecture,9,.015,3,4.5,-.1,1.5,'#e4e6db');label('DOUBLE-HEIGHT VOID · NO FLOOR',4.5,1.4,.3);voidMesh.material.transparent=true;voidMesh.material.opacity=.5;
}
}
function buildCustomArchitecture(){
  const level=layout.project.floors[floor],w=level.width,d=level.depth;
  box(architecture,w,.12,d,w/2,-.06,d/2,layout.finishes.floor);
  for(let z=.15;z<d;z+=.28)box(architecture,w,.003,.008,w/2,.003,z,'#b38a58');
  wall(0,0,w,0);wall(w,0,w,d);wall(w,d,0,d);wall(0,d,0,0);
  for(const room of level.rooms){
    const {x,z,w:rw,d:rd,door}=room;
    const edge=(x1,z1,x2,z2,hasDoor)=>{const length=Math.hypot(x2-x1,z2-z1);if(!hasDoor||length<1.1){wall(x1,z1,x2,z2);return;}const gap=Math.min(.9,length*.7),a=(length-gap)/(2*length),b=1-a;wall(x1,z1,x1+(x2-x1)*a,z1+(z2-z1)*a);wall(x1+(x2-x1)*b,z1+(z2-z1)*b,x2,z2);};
    edge(x,z,x+rw,z,door==='front');edge(x+rw,z,x+rw,z+rd,door==='right');edge(x+rw,z+rd,x,z+rd,door==='back');edge(x,z+rd,x,z,door==='left');label(room.name,x+rw/2,z+rd/2,Math.min(.32,rw/7));
  }
  if(!level.rooms.length)label('ADD ROOMS USING YOUR VIDEO REFERENCES',w/2,d/2,.4);
}
function itemMesh(item){const g=new THREE.Group();const {w,d,h,color,type}=item;
const legs=(top)=>{for(const x of [-w*.38,w*.38])for(const z of [-d*.35,d*.35])box(g,.045,top,.045,x,top/2,z,'#655c48');};
if(type==='sofa'||type==='armchair'){box(g,w,.18,d,0,.2,0,color);box(g,w-.16,.15,d-.14,0,.36,.01,color);box(g,w,.38,.16,0,.51,-d/2+.08,color);for(const x of [-w/2+.06,w/2-.06])box(g,.12,.32,d,x,.45,0,color);for(const x of [-w*.38,w*.38])for(const z of [-d*.3,d*.3])box(g,.06,.16,.06,x,.08,z,'#5a5443');g.scale.y=h/.78;}
else if(type==='bed'){box(g,w,.22,d,0,.17,0,'#8d7862');box(g,w-.05,.23,d-.06,0,.395,0,color);box(g,w,.72,.1,0,.36,-d/2,color);for(const x of [-w*.24,w*.24])box(g,w*.4,.09,.42,x,.55,-d*.3,'#f9f5ed');g.scale.y=h/.55;}
else if(type==='wardrobe'){box(g,w,h,d,0,h/2,0,color);box(g,.015,h,.01,0,h/2,d/2+.005,'#7f8b7d');for(const x of [-.07,.07])box(g,.022,.23,.02,x,h*.5,d/2+.02,'#d4cbb3');}
else if(type==='rug'){box(g,w,h,d,0,h/2,0,color);for(let x=-w/2+.05;x<w/2;x+=.12)box(g,.012,.002,d-.06,x,h+.002,0,'#e3d9c2');}
else if(type==='plant'){cylinder(g,w*.35,h*.28,0,h*.14,0,'#c1a481');cylinder(g,.025,h*.6,0,h*.5,0,'#807855');for(let i=0;i<7;i++){const a=i*2.4;const m=new THREE.Mesh(new THREE.SphereGeometry(w*.32,12,8),mat(color));m.scale.set(1,1.8,.5);m.position.set(Math.sin(a)*w*.25,h*(.45+i*.065),Math.cos(a)*d*.25);m.rotation.z=Math.sin(a)*.7;g.add(m);}}
else if(type==='chair'){legs(h*.5);box(g,w,.08,d,0,h*.53,0,color);box(g,w,h*.4,.055,0,h*.8,-d*.44,color);}
else {legs(h-.06);box(g,w,.07,d,0,h-.035,0,color);}
g.position.set(item.x,0,item.z);g.rotation.y=item.rotation*Math.PI/180;g.userData.itemId=item.id;return g;}
function rebuild(){floor=Math.min(floor,(layout.project?.floors.length??2)-1);refreshProjectUI();buildArchitecture();clearGroup(furniture);for(const i of layout.items.filter(i=>i.floor===floor))furniture.add(itemMesh(i));updateHighlight();}
function updateHighlight(){if(selectionBox){scene.remove(selectionBox);selectionBox.geometry.dispose();selectionBox.material.dispose();selectionBox=null;}const mesh=furniture.children.find(o=>o.userData.itemId===selected);if(mesh){selectionBox=new THREE.BoxHelper(mesh,0x527a4e);scene.add(selectionBox);}}
function renderSelection(){const item=layout.items.find(i=>i.id===selected);$('#selection').innerHTML=item?`<div class="selection-head"><h3 style="margin:0">${catalog[item.type].name}</h3><button id="deselect" aria-label="Deselect item">×</button></div><p class="muted" style="margin:7px 0">Dimensions in metres · adjustable</p><div class="fields-row">${[['w','Width'],['d','Depth'],['h','Height'],['rotation','Rotation °'],['x','Position X'],['z','Position Z']].map(([key,title])=>`<label class="field">${title}<input data-prop="${key}" type="number" step="${key==='rotation'?15:.05}" ${['w','d','h'].includes(key)?'min="0.02" max="5"':''} value="${Number(item[key].toFixed(2))}"></label>`).join('')}</div><label class="field">Upholstery / finish<input data-prop="color" type="color" value="${item.color}"></label><div class="selection-actions"><button id="rotate">Rotate 90°</button><button id="duplicate">Copy</button><button id="delete" class="danger">Delete</button></div>`:'<h3 style="margin-top:0">Make it your own</h3><div class="empty-selection">Choose a piece above to add it.<br>Select furniture in the model to move, resize or recolour it.</div>';
if(!item)return;
$('#deselect').onclick=()=>{selected=null;updateHighlight();renderSelection();};
for(const input of document.querySelectorAll('[data-prop]'))input.onchange=()=>{const key=input.dataset.prop;const value=key==='color'?input.value:Number(input.value);if(key!=='color'&&(!Number.isFinite(value)||(['w','d','h'].includes(key)&&(value<.02||value>5)))){toast('Use dimensions between 0.02 and 5 metres.');renderSelection();return;}change(()=>Object.assign(item,constrain({...item,[key]:value},layout.project)));};
$('#rotate').onclick=()=>change(()=>Object.assign(item,constrain({...item,rotation:(item.rotation+90)%360},layout.project)));
$('#delete').onclick=deleteSelected;
$('#duplicate').onclick=()=>change(()=>{const copy=constrain({...item,id:crypto.randomUUID(),x:item.x+.4,z:item.z+.4},layout.project);layout.items.push(copy);selected=copy.id;});
}
function deleteSelected(){if(!selected)return;change(()=>{layout.items=layout.items.filter(i=>i.id!==selected);selected=null;});}
function renderCatalog(){const categories=['All','Living','Dining','Bedroom','Decor'];$('#categories').innerHTML=categories.map(c=>`<button class="${c===category?'active':''}" data-category="${c}">${c}</button>`).join('');$('#catalog').innerHTML=Object.entries(catalog).filter(([,c])=>category==='All'||c.category===category).map(([type,c])=>`<button data-add="${type}" aria-label="Add ${c.name}"><span class="furniture-icon" aria-hidden="true">${icons[type]}</span>${c.name}<small>${c.w.toFixed(1)} × ${c.d.toFixed(1)} m</small></button>`).join('');document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderCatalog();});document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>change(()=>{if(layout.items.length>=300){toast('Maximum 300 furniture pieces per project.');return;}const bounds=floorBounds(layout.project,floor);const item=constrain(createItem(b.dataset.add,floor,bounds.width/2,(layout.project?bounds.minZ+bounds.depth/2:(floor===0?2:5.5))),layout.project);layout.items.push(item);selected=item.id;}));}
function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const aspect=w/h;const b=floorBounds(layout.project,floor);const half=layout.project?Math.max(b.depth,b.width/aspect)/2+2:6.8;planCamera.left=-half*aspect;planCamera.right=half*aspect;planCamera.top=half;planCamera.bottom=-half;planCamera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(wrap);
function setView(next){view=next;activeCamera=view==='plan'?planCamera:camera;controls.enabled=view==='3d';if(view==='plan'){const b=floorBounds(layout.project,floor),x=layout.project?b.width/2:4.5,z=layout.project?b.depth/2:3.4;planCamera.position.set(x,90,z);planCamera.up.set(0,0,-1);planCamera.lookAt(x,0,z);}document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
function refreshProjectUI(){
  document.querySelectorAll('.dynamic-floor').forEach(e=>e.remove());
  const fixed=document.querySelectorAll('.floor-button:not(.dynamic-floor)');
  fixed.forEach(b=>b.hidden=!!layout.project);
  if(layout.project){
    $('#reset').textContent='Load original flat example';
    $('#about-model').textContent='This project uses user-entered rectangular floors and rooms, with reference frames extracted locally from video. No automatic reconstruction, wall detection, exact dimensions, stairs or balcony geometry is inferred. Change room sizes and floor dimensions in the left panel. Furniture collision checking is not implemented. Projects export to JSON; videos and reference frames are not included and must be reattached after reload.';
    for(const [i,level] of layout.project.floors.entries()){
      const button=document.createElement('button');button.className='floor-button dynamic-floor'+(i===floor?' active':'');button.dataset.floor=i;
      const text=document.createElement('div');const title=document.createElement('b');title.textContent=level.name;const sub=document.createElement('small');sub.textContent='User-guided layout';text.append(title,sub);
      const area=document.createElement('span');area.textContent=(level.width*level.depth).toFixed(1)+' m²';button.append(text,area);button.onclick=()=>setFloor(i);$('#rooms').previousElementSibling.before(button);
    }
    $('.area-num').innerHTML=layout.project.area.toFixed(1)+' <small>m²</small>';
    $('.area-card .muted').textContent=layout.project.floors.length+' level(s) · user-entered shell';
    $('.left>h1').textContent=layout.project.name;
    $('.left>.notice').textContent='Video-assisted draft. Reference frames do not determine geometry. Floor dimensions and room boundaries are editable assumptions; balconies are not included automatically.';
    $('#floor-title').textContent=layout.project.floors[floor].name;
    $('#level-label').textContent='USER-GUIDED GEOMETRY · '+(layout.project.floors[floor].width*layout.project.floors[floor].depth).toFixed(1)+' M²';
    $('#rooms').replaceChildren(...layout.project.floors[floor].rooms.map(room=>{const li=document.createElement('li');li.textContent=room.name;const span=document.createElement('span');span.textContent=(room.w*room.d).toFixed(1)+' m²';li.append(span);return li;}));
  }else{
    $('#reset').textContent='Reset to starting layout';
    $('#about-model').textContent='This is a manually interpreted, approximate model of the supplied flat videos, not a measured survey. The 9 × 8 m lower floor (72 m²) and 9 × 5 m upper floor (45 m²) total 117 m² excluding the balcony. Room divisions, stairs, windows and fittings need measurement checks. Furniture collisions are not enforced. New from video creates independent user-guided projects from other videos. Export JSON for a backup.';
    $('.area-num').innerHTML='117 <small>m²</small>';$('.area-card .muted').textContent='Two levels · balcony excluded';$('.left>h1').textContent='Unverified example.';
    $('.left>.notice').textContent='This sample was rejected as inaccurate. Room placements and the 72 / 45 m² floor split have not been reconstructed. Do not use it as your flat’s floor plan.';
    $('#floor-title').textContent=floor?'The upper level':'The lower level';$('#level-label').textContent=floor?'UPPER LEVEL · 45 M² ESTIMATED':'LOWER LEVEL · 72 M² ESTIMATED';
    $('#rooms').innerHTML=(floor?[['Bedroom 01','Draft'],['Bedroom 02','Draft'],['Bathroom','Draft'],['Mezzanine landing','Draft']]:[['Living & dining','Draft'],['Kitchen','Draft'],['Hall & bathroom','Draft'],['Balcony','Outside area']]).map(([name,info])=>`<li>${name}<span>${info}</span></li>`).join('');
  }
  document.querySelectorAll('[data-floor]').forEach(b=>b.classList.toggle('active',Number(b.dataset.floor)===floor));
  renderProjectEditor({container:$('#project-editor'),project:layout.project,floor,onChange:fn=>change(fn)});
  $('.project').textContent=layout.project?'VIDEO-ASSISTED PLANNER · '+layout.project.name:'YOUR FLAT · WALKTHROUGH DRAFT';
}
function frameCamera(){const bounds=floorBounds(layout.project,floor),center=layout.project?new THREE.Vector3(bounds.width/2,0,bounds.depth/2):new THREE.Vector3(4.5,0,4);const span=Math.max(bounds.width,bounds.depth);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(span*1.39,span*1.89,span*1.78));planCamera.zoom=1;resize();setView(view);}
function setFloor(next){floor=next;selected=null;rebuild();renderSelection();frameCamera();}

const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();let drag=null;
function cast(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,activeCamera);}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0)return;cast(e);const hits=raycaster.intersectObjects(furniture.children,true);if(!hits.length){selected=null;updateHighlight();renderSelection();return;}let obj=hits[0].object;while(obj.parent!==furniture)obj=obj.parent;selected=obj.userData.itemId;const item=layout.items.find(i=>i.id===selected);if(raycaster.ray.intersectPlane(plane,point)){drag={item,offsetX:point.x-item.x,offsetZ:point.z-item.z,changed:false,before:JSON.stringify(layout)};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);}updateHighlight();renderSelection();});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;cast(e);if(!raycaster.ray.intersectPlane(plane,point))return;const next=constrain({...drag.item,x:point.x-drag.offsetX,z:point.z-drag.offsetZ},layout.project);if(Math.hypot(next.x-drag.item.x,next.z-drag.item.z)<.005)return;drag.changed=true;Object.assign(drag.item,next);const mesh=furniture.children.find(o=>o.userData.itemId===selected);mesh.position.set(next.x,0,next.z);selectionBox?.update();});
function finishDrag(){if(!drag)return;if(drag.changed){history.push(drag.before);if(history.length>60)history.shift();future=[];persist();renderSelection();}drag=null;controls.enabled=view==='3d';}
renderer.domElement.addEventListener('pointerup',finishDrag);renderer.domElement.addEventListener('pointercancel',finishDrag);renderer.domElement.addEventListener('lostpointercapture',finishDrag);
document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>setFloor(Number(b.dataset.floor)));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#home').onclick=frameCamera;
function zoom(factor){if(view==='plan'){planCamera.zoom=Math.max(.5,Math.min(4,planCamera.zoom*factor));planCamera.updateProjectionMatrix();}else{camera.position.sub(controls.target).multiplyScalar(1/factor).add(controls.target);}}
$('#zoom-in').onclick=()=>zoom(1.2);$('#zoom-out').onclick=()=>zoom(1/1.2);renderer.domElement.addEventListener('wheel',e=>{if(view==='plan'){e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08);}},{passive:false});
$('#undo').onclick=()=>undo();$('#redo').onclick=()=>undo(true);
for(const [selector,key] of [['#wall-color','wall'],['#floor-color','floor']]){$(selector).value=layout.finishes[key];$(selector).onchange=e=>change(()=>layout.finishes[key]=e.target.value);}
function syncFinishes(){$('#wall-color').value=layout.finishes.wall;$('#floor-color').value=layout.finishes.floor;}
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layout,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='my-flat-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Layout exported. Keep this file as a backup.');};
$('#import-button').onclick=()=>$('#import').click();$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw new Error('Layout file is too large.');const next=validateLayout(JSON.parse(await file.text()));change(()=>{layout=next;selected=null;});setFloor(0);syncFinishes();toast('Layout imported.');}catch(err){toast(err.message||'Could not read this layout.');}e.target.value='';};
$('#reset').onclick=()=>{if(!confirm(layout.project?'Replace this project with the original flat example? Export your project first for a backup. You can undo this change.':'Reset furniture and finishes? You can undo this change.'))return;change(()=>{layout=defaultLayout();selected=null;});syncFinishes();toast('Starting layout restored.');};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);syncFinishes();}if(e.key==='Escape'){selected=null;updateHighlight();renderSelection();}});
const workflow=setupVideoWorkflow({onCreate:project=>{$('#reference-panel').hidden=true;change(()=>{layout={version:1,finishes:{...layout.finishes},items:[],project};selected=null;});setFloor(0);toast('Editable shell created. Add rooms while consulting your reference frames.');},onReference:frame=>{$('#reference-image').src=frame.src;$('#reference-caption').textContent=`${frame.clip} · ${Math.floor(frame.time)} seconds`;$('#reference-panel').hidden=false;}});
$('#new-video').onclick=()=>workflow.open();$('#change-reference').onclick=()=>workflow.open();$('#close-reference').onclick=()=>$('#reference-panel').hidden=true;
renderCatalog();setFloor(0);resize();if(loadWarning)toast(loadWarning);
renderer.setAnimationLoop(()=>{if(document.querySelector('#planner-app').hidden)return;if(view==='3d')controls.update();renderer.render(scene,activeCamera);});
