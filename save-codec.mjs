import {gzip,ungzip} from './vendor/pako/pako.mjs?v=1.0.11';

const PREFIX='motor:gzip:1:';
const CHUNK=16384;
export function encodeSave(state) {
  const json=JSON.stringify(state);
  if (json.length<1_500_000) return json;
  const packed=gzip(new TextEncoder().encode(json),{level:1});
  let bytes='';
  for(let index=0;index<packed.length;index+=CHUNK) {
    bytes+=String.fromCharCode(...packed.subarray(index,index+CHUNK));
  }
  const value=PREFIX+btoa(bytes);
  return value.length<json.length?value:json;
}

export function decodeSave(raw) {
  try {
    if(!raw.startsWith(PREFIX))return JSON.parse(raw);
    const binary=atob(raw.slice(PREFIX.length));
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(ungzip(bytes)));
  } catch (cause) {
    throw new Error('Kayıt okunamadı. Mevcut kayıt korunuyor.',{cause});
  }
}

export class SaveWriteError extends Error {
  constructor(cause) {
    super(cause?.name==='QuotaExceededError'
      ? 'Tarayıcı depolama kotası doldu. Son sağlam kayıt korunuyor.'
      : 'Kayıt yazılamadı. Son sağlam kayıt korunuyor.',{cause});
  }
}
