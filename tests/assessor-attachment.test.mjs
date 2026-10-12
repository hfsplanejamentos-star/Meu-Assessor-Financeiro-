import assert from "node:assert/strict";
import { validateAttachment, parseAttachmentOutput, MAX_ATTACHMENT_BYTES } from "../convex/assessorAttachment.ts";
const pdf=Buffer.from("%PDF-1.7\nsample file");
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3,4]);
const jpeg=Buffer.from([255,216,255,224,1,2,3,4,5]);
const input=(name,mimeType,bytes)=>({name,mimeType,base64:bytes.toString("base64")});
const goodPdf=validateAttachment(input("extrato.pdf","application/pdf",pdf));
assert.equal(goodPdf.ok,true);
assert.equal(goodPdf.format,"pdf");
assert.equal(validateAttachment(input("nota.png","image/png",png)).format,"image");
assert.equal(validateAttachment(input("nota.jpg","image/jpeg",jpeg)).format,"image");
assert.equal(validateAttachment(input("extrato.pdf","application/pdf",png)).error,"invalid_pdf_signature");
assert.equal(validateAttachment(input("nota.png","image/png",pdf)).error,"invalid_image_signature");
assert.equal(validateAttachment(input("extrato.exe","application/octet-stream",pdf)).error,"unsupported_attachment_type");
assert.equal(validateAttachment(input("extrato.pdf","application/pdf",Buffer.alloc(MAX_ATTACHMENT_BYTES+1,1))).ok,false);
assert.equal(validateAttachment({...input("extrato.pdf","application/pdf",pdf),base64:"éééééééé"}).ok,false);
const rows={items:[
 {date:"2026-10-12",direction:"expense",amount:15,description:"Pix João",category:"Transporte",subcategory:"Uber",accountHint:"C6"},
 {date:"2026-10-12",direction:"expense",amount:15,description:"Pix Maria",category:"Transporte",subcategory:"Uber",accountHint:"C6"},
 {date:"2026-02-31",direction:"income",amount:20,description:"Data inválida"},
 {date:"2026-10-12",direction:"expense",amount:0,description:"Sem valor"},
]};
const parsed=parseAttachmentOutput(JSON.stringify(rows));
assert.equal(parsed.ok,true);
assert.equal(parsed.items.length,2,"same amount with distinct payees must not be deduplicated");
assert.equal(parsed.items[0].amountCents,1500);
assert.equal(parsed.items[1].description,"Pix Maria");
assert.equal(parsed.warnings.length,2);
assert.equal(parseAttachmentOutput("não é json").ok,false);
assert.equal(parseAttachmentOutput('{"items":"string"}').ok,false);
assert.equal(parseAttachmentOutput(JSON.stringify({items:Array(51).fill(rows.items[0])})).hasMore,true);
console.log("Assessor attachments: signatures, limits, validity and same-value transactions OK");
