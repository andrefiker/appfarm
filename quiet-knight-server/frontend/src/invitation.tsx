import {useMemo} from 'react';
import qrcode from 'qrcode-generator';
export function parseInvitation(value:string):string{
  const text=value.trim();if(/^[A-Z0-9]{6}$/i.test(text))return text.toUpperCase();
  try{const url=new URL(text);if(!['https:','http:','quietknight:'].includes(url.protocol))return '';
    const code=url.protocol==='quietknight:'&&url.hostname==='join'?url.pathname.slice(1):url.searchParams.get('room');
    return code&&/^[A-Z0-9]{6}$/i.test(code)?code.toUpperCase():'';
  }catch{return '';}
}
export function InviteQR({url,code}:{url:string;code:string}){
 const qr=useMemo(()=>{const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr;},[url]),size=qr.getModuleCount();
 return <figure className="invite-qr"><svg viewBox={`-4 -4 ${size+8} ${size+8}`} role="img" aria-label={'Invitation QR for room '+code} style={{background:'#fff',width:200,maxWidth:'100%',imageRendering:'pixelated'}}><rect x="-4" y="-4" width={size+8} height={size+8} fill="white"/>{Array.from({length:size},(_,y)=>Array.from({length:size},(_,x)=>qr.isDark(y,x)?<rect key={x+':'+y} x={x} y={y} width="1" height="1" fill="black"/>:null))}</svg><figcaption>Room {code}. Scan with your phone’s QR reader or paste the link/code. Quiet Knight does not request camera access.</figcaption></figure>;
}
