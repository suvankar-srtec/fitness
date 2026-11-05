export const PAYMENT_MODES=Object.freeze(['Cash','Online']);
export function paymentAmount(value) {
 const text=String(value??'').trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(text))return null;
 const [whole,fraction='']=text.split('.');
 return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))>0n?text:null;
}
