import './style.css';
import './footage.css';
import {createFootageStudio} from './footage-studio.js';
document.querySelector('#app').innerHTML=`<nav class="mode-bar" aria-label="Workspace"><b>flat / studio <span>REAL SPACE, FIRST</span></b><div><button id="mode-footage" class="active">Real footage</button><button id="mode-planning">Planning workspace <small>Unverified</small></button></div></nav><div id="footage-app"></div><div id="planner-app" hidden></div>`;
let plannerPromise;
const footage=createFootageStudio(document.querySelector('#footage-app'));
function activate(footageMode){document.querySelector('#footage-app').hidden=!footageMode;document.querySelector('#planner-app').hidden=footageMode;document.querySelector('#mode-footage').classList.toggle('active',footageMode);document.querySelector('#mode-planning').classList.toggle('active',!footageMode);footage.setActive(footageMode);}
document.querySelector('#mode-footage').onclick=()=>activate(true);
document.querySelector('#mode-planning').onclick=async()=>{activate(false);try{plannerPromise??=import('./planner.js');await plannerPromise;}catch(error){document.querySelector('#planner-app').textContent='Planning view could not start. Use Real footage to inspect your videos. '+error.message;}};
