import { Product } from './commerce';
export type HomeSectionKind = 'CATEGORY' | 'COLLECTION' | 'BEST_SELLERS';
export type HomeSectionPresentation = 'GRID' | 'CAROUSEL' | 'VISUAL';
export interface HomeProductSection { id:string; title:string; kind:HomeSectionKind; sourceId:string|null; limit:number; enabled:boolean; presentation:HomeSectionPresentation; visibleCount:3|4; autoRotate:boolean }
export interface PublishedHomeSection extends HomeProductSection { sourceSlug:string|null; products:Product[] }
export interface HomeSectionsAdmin { version:number; draft:HomeProductSection[]; published:HomeProductSection[] }
