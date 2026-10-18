import {cpSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
rmSync('docs',{recursive:true,force:true});
mkdirSync('docs');
cpSync('dist','docs',{recursive:true});
writeFileSync('docs/.nojekyll','');
