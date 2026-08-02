// ─── SECTION TYPE ─────────────────────────────
export type Section = {
  title: string;
  content: string;
  highlight?: boolean;
  isHeading?: boolean;
};

// ─── TEMPLATE TYPE ────────────────────────────
export type Template = {
  id: number;
  name: string;
  category: string;
  sections: Section[];
};

// ─── GLOBAL WINDOW API ───────────────────────
declare global {
  interface Window {
    api: {
      // TEMPLATE
      getTemplates: () => Promise<Template[]>;
      getTemplate: (id: number) => Promise<Template>;
      createTemplate: (data: Partial<Template>) => Promise<any>;
      updateTemplate: (id: number, data: Partial<Template>) => Promise<any>;
      deleteTemplate: (id: number) => Promise<any>;

      // REPORT
      generateReport: (data: any) => Promise<any>;
      getPreviousImages: (filters: { search?: string, procedureFilter?: string, page?: number, limit?: number }) => Promise<{ data: any[], totalItems: number, totalPages: number, currentPage: number }>;

      // HELPER
      isElectron: () => boolean;
    };
  }
}

export {};