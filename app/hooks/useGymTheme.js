'use client';
import {useEffect} from 'react';
import {gymPalette} from '../../lib/gym-theme.mjs';
export default function useGymTheme(user){
 const logo=user?.gymLogo,enabled=!!user&&user.role!=='superadmin';
 useEffect(()=>{
  const root=document.documentElement;let active=true;
  const clear=()=>{delete root.dataset.gymTheme;for(const name of ['accent','hover','soft','background','border'])root.style.removeProperty('--gym-'+name);};
  clear();if(!enabled)return;
  function apply(pixels=[]){if(!active)return;const palette=gymPalette(pixels);for(const [name,value] of Object.entries(palette))root.style.setProperty('--gym-'+name,value);root.dataset.gymTheme='true';}
  apply();
  if(logo){const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(!active)return;try{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,64,64);apply(context.getImageData(0,0,64,64).data);}catch{apply();}};image.onerror=()=>apply();image.src=logo;}
  return()=>{active=false;clear();};
 },[logo,enabled]);
}
