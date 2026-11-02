import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData { title:string; description:string; path:string; image?:string|null; type?:'website'|'product'; jsonLd?:Record<string,unknown>; }

@Injectable({providedIn:'root'})
export class SeoService {
 private readonly title=inject(Title);private readonly meta=inject(Meta);private readonly document=inject(DOCUMENT);private readonly origin='https://blessrom.com';
 update(data:SeoData){
  const url=this.origin+(data.path.startsWith('/')?data.path:'/'+data.path);const image=data.image||this.origin+'/blessrom-logo.webp';
  this.title.setTitle(data.title);this.tag('name','description',data.description);this.tag('property','og:title',data.title);this.tag('property','og:description',data.description);this.tag('property','og:type',data.type??'website');this.tag('property','og:url',url);this.tag('property','og:image',image);this.tag('name','twitter:card','summary_large_image');this.tag('name','twitter:title',data.title);this.tag('name','twitter:description',data.description);this.tag('name','twitter:image',image);
  let canonical=this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=this.document.createElement('link');canonical.rel='canonical';this.document.head.appendChild(canonical);}canonical.href=url;
  this.document.getElementById('blessrom-structured-data')?.remove();if(data.jsonLd){const script=this.document.createElement('script');script.id='blessrom-structured-data';script.type='application/ld+json';script.text=JSON.stringify(data.jsonLd);this.document.head.appendChild(script);}
 }
 private tag(attribute:'name'|'property',key:string,content:string){this.meta.updateTag({[attribute]:key,content},`${attribute}='${key}'`);}
}
