import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScan} from '../src/scan-model.js';
const sample=()=>({format:'flat-studio-sfm-v1',sourceFrames:20,components:[{id:'0',points:[0,0,0,255,128,0,1,1,1,0,128,255],cameras:[]},{id:'1',points:[3,3,3,128,128,128],cameras:[]}]});
test('sparse scan retains separate components and never invents metric scale',()=>{const out=validateScan(sample());assert.equal(out.components.length,2);assert.equal(out.units,'unscaled');assert.equal(out.components[1].points[0],3);});
test('rejects corrupt point arrays, non-finite coordinates and non-image camera payloads',()=>{
 for(const points of [[1,2,3],[0,0,NaN,0,0,0],[0,0,0,256,0,0]]){const scan=sample();scan.components[0].points=points;assert.throws(()=>validateScan(scan));}
 const scan=sample();scan.components[0].cameras=[{matrix:Array(16).fill(0),fov:50,image:'javascript:alert(1)'}];assert.throws(()=>validateScan(scan));
});
