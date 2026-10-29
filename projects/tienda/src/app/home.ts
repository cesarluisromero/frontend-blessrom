import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
 selector:'app-home',imports:[RouterLink],
 template: `
 <main>
 <section class="hero">
  <div><p class="eyebrow">Esencia natural. Actitud urbana.</p><h1>Tu estilo.<br>Tu naturaleza.</h1><p class="intro">Prendas para acompañarte a tu ritmo.<br>Descubre una nueva mirada al estilo cotidiano.</p><a class="button" routerLink="/catalogo">Explorar catálogo ↗</a><p class="origin">06° S / 76° O · Inspirados en nuestro origen</p></div>
  <div class="art" role="img" aria-label="Composición abstracta de montañas azules inspiradas en Tarapoto"><span>BLESSROM</span><div class="sun"></div><div class="hill one"></div><div class="hill two"></div><div class="hill three"></div><p>Entre la calma<br>y el movimiento.</p></div>
 </section>
 <section class="values"><div><span>01 / IDENTIDAD</span><h2>Estilo con origen</h2><p>Una mirada contemporánea, inspirada en la energía de nuestra tierra.</p></div><div><span>02 / DESCUBRE</span><h2>Tu próximo favorito</h2><p>Explora las prendas publicadas en nuestro catálogo.</p></div><div><span>03 / EVOLUCIÓN</span><h2>Un mundo por venir</h2><p>Comenzamos con moda. La tecnología será parte de nuestro futuro.</p></div></section>
 </main>`,
 styles:[`
 main{max-width:1440px;margin:auto;padding:50px 6%}.hero{display:grid;grid-template-columns:1fr 1.1fr;align-items:center;gap:50px}.hero h1{margin:25px 0}.intro{color:#5c6879;margin-bottom:30px}.origin{font-size:11px;margin-top:40px;color:#69778b;letter-spacing:1px}.art{height:480px;background:#e3eaf2;position:relative;overflow:hidden;border-radius:150px 8px 8px 8px}.art>span{position:absolute;right:25px;top:25px;letter-spacing:4px;font-size:10px}.sun{width:130px;height:130px;background:#c8a578;border-radius:50%;position:absolute;left:45%;top:18%}.hill{position:absolute;width:650px;height:350px;border-radius:50%;transform:rotate(-28deg)}.one{background:#8babc4;left:-120px;top:200px}.two{background:#416888;left:80px;top:250px}.three{background:#183c61;left:-200px;top:340px}.art p{position:absolute;bottom:20px;left:30px;color:white;font-family:Georgia,serif;font-size:26px}.values{display:grid;grid-template-columns:repeat(3,1fr);gap:35px;margin:65px 0 10px;border-top:1px solid var(--line);padding-top:35px}.values span{font-size:10px;letter-spacing:1.5px;color:var(--gold)}.values p{font-size:14px;color:#5c6879}.values h2{font-size:25px}@media(max-width:760px){main{padding:30px 20px}.hero{grid-template-columns:1fr;gap:20px}.art{height:330px}.values{grid-template-columns:1fr;gap:20px}.origin{margin-top:22px}}
 `]
})
export class Home {}