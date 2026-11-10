'use client';
import { useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import * as flags from 'country-flag-icons/react/3x2';

const names = new Intl.DisplayNames(['en'], {type:'region'});
const countries = getCountries().sort((a,b)=>names.of(a).localeCompare(names.of(b),'en'));
export default function PhoneInput({id,defaultValue='',required=true,name='phone',countryName='country',placeholder}) {
 const [initial]=useState(()=>{
  const parsed=parsePhoneNumberFromString(defaultValue);
  const country=parsed?.country||countries.find(code=>getCountryCallingCode(code)===parsed?.countryCallingCode)||'IN';
  return {country,number:parsed?.nationalNumber||defaultValue};
 });
 const [country,setCountry]=useState(initial.country);
 const menu=useRef(null);
 const Flag=flags[country];
 return <div className="phone-input">
  <input type="hidden" name={countryName} value={country}/>
  <details ref={menu} className="country-picker">
   <summary aria-label={`Country: ${names.of(country)} +${getCountryCallingCode(country)}`}><Flag aria-hidden="true"/> +{getCountryCallingCode(country)} <span aria-hidden="true">▾</span></summary>
   <div className="country-menu">{countries.map(code=>{const Icon=flags[code];return <button type="button" key={code} onClick={()=>{setCountry(code);menu.current.open=false;}} aria-pressed={code===country}>{Icon&&<Icon aria-hidden="true"/>}<span>{names.of(code)}</span><span>+{getCountryCallingCode(code)}</span></button>;})}</div>
  </details>
  <input id={id} name={name} placeholder={placeholder} aria-label={placeholder||'Phone number'} type="tel" autoComplete="tel-national" required={required} defaultValue={initial.number} maxLength={20}/>
 </div>;
}
