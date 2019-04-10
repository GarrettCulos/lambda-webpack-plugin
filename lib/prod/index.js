!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports["Lambda Webpack Plugin"]=t():e["Lambda Webpack Plugin"]=t()}(global,function(){return function(e){var t={};function o(n){if(t[n])return t[n].exports;var r=t[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}return o.m=e,o.c=t,o.d=function(e,t,n){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=4)}([function(e,t){e.exports=require("fs")},function(e,t){e.exports=require("path")},function(e,t){e.exports=require("fs-extra")},function(e,t){e.exports=require("make-dir")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SamWebpackPlugin=void 0;var n=s(o(0)),r=s(o(1)),i=o(5);function s(e){return e&&e.__esModule?e:{default:e}}function a(e){for(var t=1;t<arguments.length;t++){var o=null!=arguments[t]?arguments[t]:{},n=Object.keys(o);"function"==typeof Object.getOwnPropertySymbols&&(n=n.concat(Object.getOwnPropertySymbols(o).filter(function(e){return Object.getOwnPropertyDescriptor(o,e).enumerable}))),n.forEach(function(t){c(e,t,o[t])})}return e}function c(e,t,o){return t in e?Object.defineProperty(e,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):e[t]=o,e}const u="SamWebpackPlugin",l=e=>Object.keys(e).sort().reduce((t,o)=>("object"!=typeof e[o]||Array.isArray(e[o])?t[o]=e[o]:t[o]=l(e[o]),t),{});t.SamWebpackPlugin=class{constructor(e){if(c(this,"declarationRegex",/(?<=@WebpackLambda\()([^\)]+)(?=(\)))/g),c(this,"deploymentFolder",void 0),c(this,"options",{}),c(this,"layers",{}),c(this,"baseTemplate",void 0),e.output&&"string"!=typeof e.output)throw`[${u}]: options.output must be of type String`;if(this.deploymentFolder=e.output||"./lambda-sam-deploy",e.verbose&&"boolean"!=typeof e.verbose)throw`[${u}]: options.output must be a boolean`;if(this.options.verbose=e.verbose||!1,e.requireTxt&&"boolean"!=typeof e.requireTxt)throw`[${u}]: options.requireTxt must be a boolean`;if(this.options.requireTxt=e.requireTxt||!1,Boolean(e.layers)&&"object"!=typeof e.layers)throw`[${u}]: options.layers must be of type object`;if(this.layers=e.layers,!e.baseTemplate||"string"!=typeof e.baseTemplate)throw`[${u}]: options.baseTemplate must be of defined and of type String`;this.baseTemplate=JSON.parse(n.default.readFileSync(e.baseTemplate,"utf8"))}parseLambdaDeclaration(e){const t=e.match(this.declarationRegex);if(t)return JSON.parse(t[0])}logDependencies(e){const t=[];return Array.isArray(e)&&e.forEach(e=>{if(e.request){const o=e.request===r.default.basename(e.request),n=e.module&&e.module.externalType,i=e.module&&e.module.dependencies;i&&t.push(...this.logDependencies(i)),o&&t.push({request:e.request,type:n})}}),t}getPackageDependencies(e,t){try{const o=n.default.readFileSync(r.default.join(t,e,"package.json"),"utf8"),i=JSON.parse(o),s=i&&i.dependencies?Object.keys(i.dependencies):[],a=i&&i._phantomChildren?Object.keys(i._phantomChildren):[];return[...s,...a]}catch(e){throw e}}getAllDependencies(e,t){const o=Array.isArray(e)?e:[e],n=[];for(;o.length>0;){const e=o.shift();try{const r=this.getPackageDependencies(e,t).filter(e=>!n.includes(e));o.push(...r),n.push(e)}catch(e){console.warn(`WARN: Lambda Webpack Plugin: ${e}`)}}return n}apply(e){const t={name:u},o={entries:{},outputPath:e.options.output.path,deployFolder:r.default.join(e.options.context,this.deploymentFolder),alias:e.options.resolve.alias};e.hooks.entryOption.tap(t,(e,t)=>{o.entries=Object.keys(t).reduce((o,i)=>{const s=n.default.readFileSync(t[i],"utf8"),c=this.parseLambdaDeclaration(s);return c?a({},o,{[i]:{key:i,context:e,path:t[i],files:[],filename:r.default.basename(i,r.default.extname(i)),config:c,dependencies:void 0}}):o},{})}),e.hooks.emit.tapAsync(t,(e,t)=>{e.chunks.forEach(e=>{o.entries[e.name]&&(o.entries[e.name].files=e.files,o.entries[e.name].dependencies=this.logDependencies(e.entryModule.dependencies).reduce((e,t)=>(e.find(e=>e.request===t.request)||e.push(t),e),[]))}),t()}),e.hooks.done.tapAsync(t,(e,t)=>{const n=Object.keys(o.entries).map(e=>o.entries[e]),s=[];s.push((0,i.rimrafAction)({source:o.deployFolder},this.options)),s.push((0,i.mkdirAction)({source:o.deployFolder},this.options)),n.forEach(e=>{const t=e.filename,n=r.default.join(o.deployFolder,t);if(s.push((0,i.mkdirAction)({source:n},this.options)),e.files.forEach(e=>{s.push((0,i.copyAction)({source:r.default.join(o.outputPath,e),destination:n},this.options))}),s.push((0,i.mkdirAction)({source:r.default.join(n,"node_modules")},this.options)),this.options.requireTxt){const t=e.dependencies.map(e=>e.request).join(" \n");s.push((0,i.createAction)({source:r.default.join(n,"requirements.txt"),content:t},this.options))}this.options.requireTxt||e.dependencies.reduce((t,o)=>{if(this.layers&&this.layers[o.request])t.push(o.request);else if(void 0!==o.type){const n=this.getAllDependencies(o.request,r.default.join(e.context,"node_modules"));t.push(...n)}return t},[]).forEach(t=>{let o=void 0;o=this.layers&&this.layers[t]?r.default.join(this.layers[t],"**/*"):r.default.join(e.context,"node_modules",t,"**/*"),s.push((0,i.copyAction)({source:o,destination:r.default.join(n,"node_modules",t)},this.options))});const c=l({[`Function${e.filename.replace(/-/g,"")}`]:a({},e.config,{Type:"AWS::Serverless::Function",Properties:a({},e.config.Properties,e.config.properties,{CodeUri:`./${t}`})})});this.baseTemplate=a({},this.baseTemplate,{Resources:a({},this.baseTemplate.Resources,c)})}),s.push((0,i.createAction)({source:r.default.join(o.deployFolder,"template.json"),content:JSON.stringify(JSON.parse(JSON.stringify(this.baseTemplate)))},this.options)),s.length&&s.reduce((e,t)=>e.then(e=>t(e)).catch(e=>console.log(e)),Promise.resolve()),t()})}}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"copyAction",{enumerable:!0,get:function(){return n.copyAction}}),Object.defineProperty(t,"moveAction",{enumerable:!0,get:function(){return r.moveAction}}),Object.defineProperty(t,"mkdirAction",{enumerable:!0,get:function(){return i.mkdirAction}}),Object.defineProperty(t,"archiveAction",{enumerable:!0,get:function(){return s.archiveAction}}),Object.defineProperty(t,"createAction",{enumerable:!0,get:function(){return a.createAction}}),Object.defineProperty(t,"rimrafAction",{enumerable:!0,get:function(){return c.rimrafAction}});var n=o(6),r=o(8),i=o(10),s=o(11),a=o(13),c=o(14)},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.copyAction=function(e,t){const{verbose:o}=t;if(!e.source||!e.destination)return void(o&&console.log("  - FileManagerPlugin: Warning - copy parameter has to be formated as follows: { source: <string>, destination: <string> }"));return()=>new Promise((i,c)=>{const l=/(\*|\{+|\}+)/g.exec(e.source);void 0===l?n.default.lstat(e.source,(l,d)=>{if(l)return c(l);n.default.lstat(e.destination,(n,l)=>{if(d.isFile()){const t=l&&l.isDirectory()?e.destination+"/"+r.default.basename(e.source):e.destination;o&&console.log(`  - FileManagerPlugin: Start copy source: ${e.source} to destination: ${t}`);const n=r.default.parse(t),u=(e,t)=>{s.default.copy(e,t,e=>{e&&c(e),i()})};""===n.ext?(0,a.default)(t).then(o=>{u(e.source,t+"/"+r.default.basename(e.source))}):u(e.source,t)}else{const o=e.source+("/"!==e.source.substr(-1)?"/":"")+"**/*";u(o,e.destination,i,c,t)}})}):u(e.source,e.destination,i,c,t)})};var n=c(o(0)),r=c(o(1)),i=c(o(7)),s=c(o(2)),a=c(o(3));function c(e){return e&&e.__esModule?e:{default:e}}function u(e,t,o,n,r){const{verbose:s}=r;s&&console.log(`  - Lambda Webpack Plugin: Start copy source file: ${e} to destination file: ${t}`),i.default.copy(e,t,{clean:!1,includeEmptyDirs:!0,update:!1},i=>{i&&r.verbose&&(console.log("  - Lambda Webpack Plugin: Error - copy failed",i),n(i)),s&&console.log(`  - Lambda Webpack Plugin: Finished copy source: ${e} to destination: ${t}`),o()})}},function(e,t){e.exports=require("cpx")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.moveAction=function(e,t){const{verbose:o}=t;if(!e.source||!e.destination)return void(o&&console.log("  - Lambda Webpack Plugin: Warning - move parameter has to be formated as follows: { source: <string>, destination: <string> }"));return n.default.existsSync(e.source)?()=>new Promise((t,n)=>{o&&console.log(`  - Lambda Webpack Plugin: Start move source: ${e.source} to destination: ${e.destination}`),(0,r.default)(e.source,e.destination,{mkdirp:!1},r=>{r&&(o&&console.log("  - Lambda Webpack Plugin: Error - move failed",r),n(r)),o&&console.log(`  - Lambda Webpack Plugin: Finished move source: ${e.source} to destination: ${e.destination}`),t()})}):void process.emitWarning(`  - Lambda Webpack Plugin: Could not move ${e.source}: path does not exist`)};var n=i(o(0)),r=i(o(9));function i(e){return e&&e.__esModule?e:{default:e}}},function(e,t){e.exports=require("mv")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.mkdirAction=function(e,t){const{verbose:o}=t;return()=>{if(o&&console.log(`  - Lambda Webpack Plugin: Creating path ${e.source}`),"string"==typeof e.source)return(0,r.default)(e.source);o&&console.log("  - Lambda Webpack Plugin: Warning - mkdir parameter has to be type of string. Process canceled.")}};var n,r=(n=o(3))&&n.__esModule?n:{default:n}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.archiveAction=function(e,t){const{verbose:o}=t;return()=>new Promise((t,s)=>{e.source&&e.destination||(o&&console.log("  - Lambda Webpack Plugin: Warning - archive parameter has to be formated as follows: { source: <string>, destination: <string> }"),s());const a=/(\*|\{+|\}+)/g.exec(e.source),c=null!==a;n.default.lstat(e.source,(o,a)=>{const u=n.default.createWriteStream(e.destination),l=(0,i.default)(e.format,e.options);l.on("error",e=>s(e)),l.pipe(u);const d=r.default.basename(e.destination),p=Object.assign({ignore:d},e.options.globOptions||{});c?l.glob(e.source,p):a.isFile()?l.file(e.source,{name:r.default.basename(e.source)}):a.isDirectory()&&l.glob("**/*",{cwd:e.source,ignore:d}),l.finalize(),t()})})};var n=s(o(2)),r=s(o(1)),i=s(o(12));function s(e){return e&&e.__esModule?e:{default:e}}},function(e,t){e.exports=require("archiver")},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.createAction=function(e,t){const{verbose:o}=t;if(!e.source||!e.content)return void(o&&console.log("  - Lambda Webpack Plugin: Warning - creat parameter has to be formated as follows: { source: <string>, content: <string> }"));return()=>new Promise((t,n)=>{o&&console.log(`  - Lambda Webpack Plugin: Start creating source: ${e.source}`),r.default.writeFile(e.source,e.content,r=>r?(o&&console.log(`  - Lambda Webpack Plugin: Failed to create source: ${e.source}`),n()):(o&&console.log(`  - Lambda Webpack Plugin: Finished to create source: ${e.source}`),t()))})};var n,r=(n=o(0))&&n.__esModule?n:{default:n}},function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.rimrafAction=function(e,t){const{verbose:o}=t;if(!e.source)return void(o&&console.log("  - Lambda Webpack Plugin: Warning - remove parameter has to be formated as follows: { source: <string> }"));return()=>new Promise((t,n)=>{o&&console.log(`  - Lambda Webpack Plugin: Start removing source: ${e.source} `),(0,r.default)(e.source,()=>{o&&console.log(`  - Lambda Webpack Plugin: Finished removing source: ${e.source} `),t()})})};var n,r=(n=o(15))&&n.__esModule?n:{default:n}},function(e,t){e.exports=require("rimraf")}])});