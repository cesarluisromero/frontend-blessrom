import { Product } from './commerce';
export type HomeSectionKind = 'CATEGORY' | 'COLLECTION' | 'BEST_SELLERS';
export interface HomeProductSection { id:string; title:string; kind:HomeSectionKind; sourceId:string|null; limit:number; enabled:boolean }
export interface PublishedHomeSection { id:string; title:string; kind:HomeSectionKind; products:Product[] }
export interface HomeSectionsAdmin { version:number; draft:HomeProductSection[]; published:HomeProductSection[] }
