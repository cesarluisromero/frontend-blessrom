import { Component, Input } from '@angular/core';

type Part = { text: string; href?: string };
const linkPattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|(https?:\/\/[^\s<]+)/g;

@Component({
  selector: 'app-linked-text',
  template: `@for(part of parts(); track $index){@if(part.href){<a [href]="part.href" [target]="part.href.startsWith('/')?'_self':'_blank'" rel="noopener noreferrer">{{part.text}}</a>}@else{<ng-container>{{part.text}}</ng-container>}}`,
  styles: [`:host{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#82521d;text-decoration:underline;text-underline-offset:3px}`]
})
export class LinkedText {
  @Input() text = '';

  parts(): Part[] {
    const value = this.text || '';
    const result: Part[] = [];
    let offset = 0;
    for (const match of value.matchAll(linkPattern)) {
      const index = match.index ?? 0;
      if (index > offset) result.push({text: value.slice(offset, index)});
      const raw = match[2] || match[3];
      const href = match[3] ? raw.replace(/[.,;:!?]+$/, '') : raw;
      result.push({text: match[1] || href, href});
      if (href.length < raw.length) result.push({text: raw.slice(href.length)});
      offset = index + match[0].length;
    }
    if (offset < value.length) result.push({text: value.slice(offset)});
    return result;
  }
}
