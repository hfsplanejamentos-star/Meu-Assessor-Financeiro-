const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");
const gradle=read("android-capture/app/build.gradle.kts");
const manifest=read("android-capture/app/src/main/AndroidManifest.xml");
const main=read("android-capture/app/src/main/java/br/com/meuassessor/capture/MainActivity.java");
const ui=read("assessor-mobile-screen.js");
const html=read("assessor-ia-mobile.html");
const scripts=[
 "assessor-mobile-api.js","assessor-mobile-summary.js",
 "assessor-mobile-notifications.js","assessor-mobile-screen.js"
];
assert.match(gradle,/applicationIdSuffix = "\.ia\.preview"/);
assert.match(gradle,/versionNameSuffix = "-assessor-preview"/);
assert.match(gradle,/manifestPlaceholders\["snakeAppLabel"\] = "Snake Finance IA \(Teste\)"/);
assert.match(gradle,/manifestPlaceholders\["snakeAppLabel"\] = "Snake Finance"/);
assert.match(manifest,/\$\{snakeAppLabel\}/);
assert.match(gradle,/sourceSets\.getByName\("debug"\)\.assets\.srcDir\(previewAssetsDir\)/);
assert.match(gradle,/dependsOn\(prepareAssessorPreview\)/);
assert.match(main,/if \(BuildConfig\.DEBUG\) loadAssessorPreview\(\)/);
assert.match(main,/else loadDashboardHtml\(\)/);
assert.match(main,/if \(!BuildConfig\.DEBUG\) UpdateChecker\.check\(this\)/);
assert.match(main,/SNAKE_ASSESSOR_PREVIEW_ONLY=true/);
assert.match(main,/APP_BASE_URL \+ "assessor-ia-mobile\.html"/);
assert.match(main,/if \(BuildConfig\.DEBUG\) \{[\s\S]*?never navigate away/i);
assert.match(main,/String\[\] allowedMimeTypes = BuildConfig\.DEBUG/);
assert.match(main,/if \("https"\.equalsIgnoreCase\(uri\.getScheme\(\)\)\)/);

assert.match(ui,/if\(window\.SNAKE_ASSESSOR_PREVIEW_ONLY===true\)/);
assert.match(read("assessor-mobile-api.js"),/preview_read_only/);
assert.match(read("assessor-mobile-api.js"),/root\.SNAKE_ASSESSOR_PREVIEW_ONLY===true/);

assert.match(ui,/Prévia Android: a correção do cartão está desativada/);
let page=html;
for(const script of scripts){
 const marker='<script src="./'+script+'"></script>';
 assert(page.includes(marker),"missing asset script "+script);
 const js=read(script);
 assert.doesNotMatch(js,/<\/script/i,"cannot inline unsafe closing script tag");
 page=page.replace(marker,'<script>\n'+js+'\n</script>');
}
page=page.replace('<script>\n'+read(scripts[0]),'<script>window.SNAKE_ASSESSOR_PREVIEW_ONLY=true;</script>\n<script>\n'+read(scripts[0]));
assert(!scripts.some(script=>page.includes('<script src="./'+script+'">')),"no unresolved JS assets");
assert(page.includes("window.SNAKE_ASSESSOR_PREVIEW_ONLY=true"));
assert(page.includes("SnakeAssessorNativeNotifications"));
assert(page.includes("SNAKE FINANCE"));
assert(page.length>60000,"assembled debug preview must contain full approved UI");
console.log("Assessor debug APK safeguards: separate package, inline UI, read-only and production backup PASS");
