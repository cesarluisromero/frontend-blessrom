export interface MenuGroup { id: string; title: string; categoryIds: string[] }
export interface MenuAdmin { version: number; draft: MenuGroup[]; published: MenuGroup[] }
