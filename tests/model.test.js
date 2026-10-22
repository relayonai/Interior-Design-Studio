import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLayout,validateLayout,constrain,createItem,footprint } from '../src/model.js';
test('starting layout survives JSON export/import with stable furniture IDs',()=>{
 const original=defaultLayout();const result=validateLayout(JSON.parse(JSON.stringify(original)));
 assert.equal(result.items.length,original.items.length);
 assert.deepEqual(result.items.map(i=>i.id),original.items.map(i=>i.id));
 assert.deepEqual(result.finishes,original.finishes);
});
test('upper furniture remains within upper floor when moved over the void',()=>{
 const item=constrain({...createItem('bed',1,-5,-5),rotation:90});const bounds=footprint(item);
 assert.ok(item.x-bounds.w/2>=0);assert.ok(item.z-bounds.d/2>=3);
 const far=constrain({...item,x:100,z:100});assert.ok(far.x+bounds.w/2<=9);assert.ok(far.z+bounds.d/2<=8);
});
test('rejects corrupt layouts and duplicate IDs without importing them',()=>{
 const data=defaultLayout();data.items[0].w=-1;assert.throws(()=>validateLayout(data));
 const dup=defaultLayout();dup.items[1].id=dup.items[0].id;assert.throws(()=>validateLayout(dup));
 assert.throws(()=>validateLayout({version:4,items:[]}));
});
test('oversized rotated furniture is fitted to the upper footprint',()=>{
 const fitted=constrain({...createItem('rug',1,4.5,5.5),w:5,d:5,rotation:45});
 const bounds=footprint(fitted);assert.ok(bounds.d<=5+1e-10);assert.ok(fitted.z-bounds.d/2>=3-1e-10);
});

import {createProject,validateProject,floorBounds} from '../src/model.js';
test('general project area is split across editable levels and survives export',()=>{
 const project=createProject({name:'Another flat',area:150,floors:3,aspect:2});
 assert.equal(project.floors.length,3);
 assert.ok(Math.abs(project.floors.reduce((s,f)=>s+f.width*f.depth,0)-150)<1e-8);
 const data={...defaultLayout(),items:[createItem('sofa',2,3,3)],project};
 const result=validateLayout(JSON.parse(JSON.stringify(data)));
 assert.equal(result.project.name,'Another flat');assert.equal(result.items[0].floor,2);
 assert.equal(floorBounds(result.project,2).minZ,0);
});
test('rejects invalid project geometry and a room extending beyond its floor',()=>{
 assert.throws(()=>createProject({name:'Test',area:0,floors:1}));
 const project=createProject({name:'Test',area:100,floors:1});
 project.floors[0].rooms.push({id:'room',name:'Outside',x:20,z:0,w:3,d:3,door:'front'});
 assert.throws(()=>validateProject(project));
 const wrongArea=createProject({name:'Test',area:100,floors:1});wrongArea.floors[0].width*=2;
 assert.throws(()=>validateProject(wrongArea));
});
