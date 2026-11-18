export interface SitePage { title: string; body: string }
export interface SiteInformation {
  address: string;
  phones: string[];
  contactBody?: string;
  pages: Record<'quienes-somos' | 'privacidad' | 'terminos' | 'eliminar-datos', SitePage>;
}
export interface SiteInformationAdmin { version: number; draft: SiteInformation; published: SiteInformation }
export const SITE_PAGE_KEYS = ['quienes-somos', 'privacidad', 'terminos', 'eliminar-datos'] as const;
