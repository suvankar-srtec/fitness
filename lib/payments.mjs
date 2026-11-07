export const PAYMENT_MODES=Object.freeze(['Cash','Online']);
export function paymentAmount(value) {
 const text=String(value??'').trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(text))return null;
 const [whole,fraction='']=text.split('.');
 return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))>0n?text:null;
}

export function registrationPayment(type,total,value){
 const cents=v=>{const text=String(v??'');if(!/^\d{1,10}(\.\d{1,2})?$/.test(text))return null;const [a,b='']=text.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));};
 const full=cents(total);if(full===null)return null;if(type==='Full')return String(total);const part=cents(value);return type==='Part'&&part!==null&&part>0n&&part<full?String(value):null;
}
