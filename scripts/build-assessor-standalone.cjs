#!/usr/bin/env node
"use strict";
/**
 * Reproducible, one-file Assessor IA HTML preview.
 * No browser/CDN script dependencies. Financial mutations remain disabled.
 */
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const output=path.join(root,"Assessor_IA_Mobile_Validacao_Standalone.html");
const scripts=[
 "assessor-mobile-api.js",
 "assessor-mobile-summary.js",
 "assessor-mobile-notifications.js",
 "assessor-mobile-screen.js"
];
const previewFlag=[
 '<script>',
 '/* Standalone preview: financial posting and card edits are permanently disabled. */',
 'Object.defineProperty(window, "SNAKE_ASSESSOR_PREVIEW_ONLY", {',
 '  value: true, writable: false, configurable: false',
 '});',
 '</script>'
].join("\n");

function build(){
 let html=fs.readFileSync(path.join(root,"assessor-ia-mobile.html"),"utf8");
 if(!/^<!doctype html>/i.test(html)||!html.includes("</body></html>"))
   throw Error("Base HTML is incomplete");
 for(const file of scripts){
  const marker='<script src="./'+file+'"></script>';
  if(html.split(marker).length!==2)throw Error("Exactly one script marker expected: "+file);
  const code=fs.readFileSync(path.join(root,file),"utf8");
  if(/<\/script\b/i.test(code))throw Error("Unsafe HTML script terminator: "+file);
  new Function(code); // Syntax check before generating downloadable HTML
  html=html.replace(marker,'<script data-source="'+file+'">\n'+code+'\n</script>');
 }
 const api='<script data-source="'+scripts[0]+'">';
 if(html.split(api).length!==2)throw Error("Invalid API script marker");
 html=html.replace(api,previewFlag+'\n'+api);
 if(/<script\b[^>]*\bsrc\s*=/.test(html))throw Error("Standalone preview has external script dependencies");
 if(!html.includes('Object.defineProperty(window, "SNAKE_ASSESSOR_PREVIEW_ONLY"'))
   throw Error("Standalone preview lacks the read-only safety flag");
 return html;
}
const expected=build();
if(process.argv.includes("--check")){
 const current=fs.existsSync(output)?fs.readFileSync(output,"utf8"):"";
 if(current!==expected){
  console.error("Standalone Assessor IA HTML is stale. Run npm run build:assessor-html");
  process.exit(1);
 }
 console.log("Standalone Assessor IA matches current UI and JS modules; preview mode enabled");
}else{
 fs.writeFileSync(output,expected,"utf8");
 console.log("Generated "+path.basename(output)+" ("+Buffer.byteLength(expected,"utf8")+" bytes)");
}
