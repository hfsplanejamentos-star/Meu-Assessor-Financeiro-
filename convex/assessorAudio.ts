/** Audio validation for user-initiated transcription; no database writes. */
export function validateAudio(value:unknown):
 {ok:true; mimeType:string; fileName:string; base64:string; byteLength:number}|
 {ok:false; error:string}{
 if(!value||typeof value!=="object")return{ok:false,error:"invalid_audio"};
 const body=value as Record<string,unknown>;
 const allowed:Record<string,string>={
  "audio/webm":"webm","audio/ogg":"ogg","audio/mpeg":"mp3","audio/mp3":"mp3",
  "audio/wav":"wav","audio/x-wav":"wav","audio/mp4":"m4a"
 };
 const mimeType=typeof body.mimeType==="string"?body.mimeType.trim().toLowerCase().split(";")[0]:"";
 const base64=typeof body.base64==="string"?body.base64:"";
 if(!allowed[mimeType])return{ok:false,error:"unsupported_audio_type"};
 if(base64.length<16||base64.length>5_340_000||base64.length%4!==0||
   !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))return{ok:false,error:"invalid_audio_data"};
 const pad=base64.endsWith("==")?2:base64.endsWith("=")?1:0;
 const byteLength=base64.length/4*3-pad;
 if(byteLength<32||byteLength>4_000_000)return{ok:false,error:"audio_size_limit"};
 if(mimeType==="audio/webm"&&!base64.startsWith("GkXfo"))return{ok:false,error:"audio_signature_mismatch"};
 if(mimeType==="audio/ogg"&&!base64.startsWith("T2dnUw"))return{ok:false,error:"audio_signature_mismatch"};
 if((mimeType==="audio/wav"||mimeType==="audio/x-wav")&&!base64.startsWith("UklGR"))return{ok:false,error:"audio_signature_mismatch"};
 if((mimeType==="audio/mpeg"||mimeType==="audio/mp3")&&!(/^(SUQz|\/\/|\/\+|\/\w)/.test(base64)))return{ok:false,error:"audio_signature_mismatch"};
 const fileName="assessor-audio."+allowed[mimeType];
 return{ok:true,mimeType,fileName,base64,byteLength};
}
