// Publish only dist to a deployment branch; never reset or force-push source.
import {execFileSync} from 'node:child_process';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const dir=await mkdtemp(path.join(os.tmpdir(),'flat-studio-pages-'));
const env={...process.env,GIT_INDEX_FILE:path.join(dir,'index')};
const git=(args,options={})=>execFileSync('git',args,{env,encoding:'utf8',...options}).trim();
try {
  const remote=git(['ls-remote','--heads','origin','refs/heads/gh-pages']);
  const parent=remote?remote.split(/\s+/)[0]:null;
  if(parent)git(['fetch','origin','refs/heads/gh-pages']);
  git(['read-tree','--empty']);
  async function walk(root,relative=''){
    for(const entry of await readdir(root,{withFileTypes:true})){
      const rel=path.posix.join(relative,entry.name),full=path.join(root,entry.name);
      if(entry.isDirectory())await walk(full,rel);
      else if(entry.isFile()){
        const sha=git(['hash-object','-w','--stdin'],{input:await readFile(full)});
        git(['update-index','--add','--cacheinfo','100644',sha,rel]);
      }
    }
  }
  await walk('dist');
  const empty=git(['hash-object','-w','--stdin'],{input:''});
  git(['update-index','--add','--cacheinfo','100644',empty,'.nojekyll']);
  const tree=git(['write-tree']);
  const args=['commit-tree',tree,...(parent?['-p',parent]:[]),'-m','Deploy video-assisted Flat Studio'];
  const commit=git(args);
  git(['push','origin',`${commit}:refs/heads/gh-pages`],{stdio:['pipe','pipe','inherit']});
  console.log(`Deployment branch pushed: ${commit}. GitHub Pages must use gh-pages / (root). This does not prove the site is active.`);
} finally {await rm(dir,{recursive:true,force:true});}
