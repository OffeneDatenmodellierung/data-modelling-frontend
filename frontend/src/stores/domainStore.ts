/**
 * Domain Store
 * Manages domain state and domain asset loading using Zustand
 */

import { create } from 'zustand';
import { localFileService } from '@/services/storage/localFileService';
import { electronFileService } from '@/services/storage/electronFileService';
import { getPlatform } from '@/services/platform/platform';
import type { Domain } from '@/types/domain';
import type { Table } from '@/types/table';
import type { DataProduct } from '@/types/odps';
import type { ComputeAsset } from '@/types/cads';
import type { BPMNProcess } from '@/types/bpmn';
import type { DMNDecision } from '@/types/dmn';

interface DomainState {
  currentDomain: Domain | null;
  isLoading: boolean;
  error: string | null;

  // Domain assets (loaded separately)
  tables: Table[];
  products: DataProduct[];
  computeAssets: ComputeAsset[];
  bpmnProcesses: BPMNProcess[];
  dmnDecisions: DMNDecision[];

  // Actions
  setCurrentDomain: (domain: Domain | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTables: (tables: Table[]) => void;
  setProducts: (products: DataProduct[]) => void;
  setComputeAssets: (assets: ComputeAsset[]) => void;
  setBPMNProcesses: (processes: BPMNProcess[]) => void;
  setDMNDecisions: (decisions: DMNDecision[]) => void;

  // Domain operations
  loadDomain: (workspaceId: string, domainId: string) => Promise<void>;
  loadDomainAssets: (workspaceId: string, domainId: string) => Promise<void>;
  saveDomain: (workspaceId: string, domain: Domain) => Promise<void>;
}

const fileService = getPlatform() === 'electron' ? electronFileService : localFileService;

export const useDomainStore = create<DomainState>((set) => ({
  currentDomain: null,
  isLoading: false,
  error: null,
  tables: [],
  products: [],
  computeAssets: [],
  bpmnProcesses: [],
  dmnDecisions: [],

  setCurrentDomain: (domain) => set({ currentDomain: domain }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setTables: (tables) => set({ tables }),
  setProducts: (products) => set({ products }),
  setComputeAssets: (assets) => set({ computeAssets: assets }),
  setBPMNProcesses: (processes) => set({ bpmnProcesses: processes }),
  setDMNDecisions: (decisions) => set({ dmnDecisions: decisions }),

  loadDomain: async (workspaceId: string, domainId: string) => {
    set({ isLoading: true, error: null });
    try {
      const domain = await fileService.loadDomain(workspaceId, domainId);
      set({ currentDomain: domain, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load domain',
        isLoading: false,
      });
    }
  },

  loadDomainAssets: async (workspaceId: string, domainId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [tables, products, assets, processes, decisions] = await Promise.all([
        fileService.loadODCSTables(workspaceId, domainId),
        fileService.loadODPSProducts(workspaceId, domainId),
        fileService.loadCADSAssets(workspaceId, domainId),
        fileService.loadBPMNProcesses(workspaceId, domainId),
        fileService.loadDMNDecisions(workspaceId, domainId),
      ]);
      set({
        tables,
        products,
        computeAssets: assets,
        bpmnProcesses: processes,
        dmnDecisions: decisions,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load domain assets',
        isLoading: false,
      });
    }
  },

  saveDomain: async (workspaceId: string, domain: Domain) => {
    set({ isLoading: true, error: null });
    try {
      await fileService.saveDomain(workspaceId, domain);
      set({ currentDomain: domain, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save domain',
        isLoading: false,
      });
    }
  },
}));

