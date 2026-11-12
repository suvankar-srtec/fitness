'use client';
import {useEffect} from 'react';
export default function useGymTheme(){useEffect(()=>{const root=document.documentElement;delete root.dataset.gymTheme;for(const name of ['accent','hover','soft','background','border'])root.style.removeProperty('--gym-'+name);},[]);}
