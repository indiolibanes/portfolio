/** Build an isolated static fixture preview. Does not touch the application's hosting config. */
import {build} from 'vite';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.resolve(process.argv[2]??'');
if(!process.argv[2]||out===repository||out.startsWith(repository+path.sep))throw Error('Choose a scratch preview directory outside the repository');
await fs.mkdir(path.join(out,'.openai'),{recursive:true});await fs.writeFile(path.join(out,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}));
await build({configFile:false,root:path.join(repository,'tests/shorekeeper-r605'),build:{outDir:path.join(out,'dist'),emptyOutDir:true}});
console.log('Fixture preview built; no private assets, no deployment.');
