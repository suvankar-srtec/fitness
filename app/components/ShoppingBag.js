'use client';
import {MessageNotice} from './MessagePopup';

import {useCallback,useState} from 'react';
import CartDialog from './CartDialog';
import CommerceIcon from './CommerceIcon';
import {money} from './PaymentInfo';
import styles from './ShoppingBag.module.css';

export default function ShoppingBag({products,cart,loading,busy,error,method,onMethod,onQuantity,onPurchase,purchased}){
 const [cartOpen,setCartOpen]=useState(false);const closeCart=useCallback(()=>setCartOpen(false),[]);
 const total=cart.reduce((sum,item)=>sum+Number(item.price)*item.quantity,0);
 const count=cart.reduce((sum,item)=>sum+item.quantity,0);
 return <div className={styles.workspace}>
  <section className={styles.catalog} aria-label="Available supplements">
   <header className={styles.sectionHeading}><h3>Supplements</h3><button type="button" className={styles.cartTrigger} aria-label={"Open cart, "+count+" items"} onClick={()=>setCartOpen(true)}><CommerceIcon name="bag"/><span>{count}</span></button></header>
   <div className={styles.products}>{products.map(product=>{
    const quantity=cart.find(item=>item.product_id===product.id)?.quantity||0;
    return <article className={styles.product} key={product.id}>
     <div className={styles.image}>{product.imageUrl?<img src={product.imageUrl} alt={product.name}/>:<CommerceIcon/>}</div>
     <div className={styles.productInfo}><h4>{product.name}</h4>{product.description&&<p title={product.description}>{product.description}</p>}<strong>{money(product.price)}</strong></div>
     <button type="button" disabled={busy||loading||quantity>0} onClick={()=>onQuantity(product.id,1)}>{quantity?'Added':'+ Add'}</button>
    </article>;
   })}</div>
   {!products.length&&<div className={styles.empty}>{loading?'Loading supplements…':'No supplements available'}</div>}
  </section>
  {error&&!cartOpen&&<MessageNotice>{error}</MessageNotice>}
  {cartOpen&&<CartDialog onClose={closeCart}><aside className={styles.cart} aria-label="Member cart">
   <header className={styles.sectionHeading}><h3><CommerceIcon name="bag"/>Cart</h3><span>{count} items</span></header>
   <div className={styles.items}>{cart.map(item=><article className={styles.item} key={item.product_id}>
    <div className={styles.itemTitle}><strong>{item.name}</strong><button type="button" className="secondary" aria-label={'Remove '+item.name} disabled={busy} onClick={()=>onQuantity(item.product_id,0)}>&times;</button></div>
    <div className={styles.itemBottom}><div className={styles.quantity}><button type="button" aria-label={'Decrease '+item.name} disabled={busy} onClick={()=>onQuantity(item.product_id,item.quantity-1)}>−</button><span>{item.quantity}</span><button type="button" aria-label={'Increase '+item.name} disabled={busy||item.quantity>=99} onClick={()=>onQuantity(item.product_id,item.quantity+1)}>+</button></div><strong>{money(Number(item.price)*item.quantity)}</strong></div>
   </article>)}{!cart.length&&<div className={styles.empty}><CommerceIcon name="bag"/><span>{loading?'Loading cart…':purchased?'Purchase recorded':'Your cart is empty'}</span></div>}</div>
   <footer className={styles.checkout}>
    {error&&<MessageNotice>{error}</MessageNotice>}
    <div className={styles.total}><span>Total</span><strong>{money(total)}</strong></div>
    <div className={styles.methods} role="group" aria-label="Payment mode">{['Cash','Online'].map(value=><button type="button" key={value} disabled={busy} aria-pressed={method===value} onClick={()=>onMethod(value)}><CommerceIcon name={value==='Cash'?'payment':'orders'}/>{value}</button>)}</div>
    <button type="button" className={styles.purchase} disabled={busy||loading||!cart.length} onClick={onPurchase}>{busy?'Saving…':'Pay & purchase'}</button>
   </footer>
  </aside></CartDialog>}
 </div>;
}
