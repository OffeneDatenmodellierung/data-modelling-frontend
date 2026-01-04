/**
 * Type declarations for dmn-js library
 */

declare module 'dmn-js/lib/Modeler' {
  export default class DmnModeler {
    constructor(options?: {
      container?: HTMLElement;
      keyboard?: {
        bindTo?: Window | Document;
      };
      [key: string]: unknown;
    });
    
    importXML(xml: string): Promise<void>;
    saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
    destroy(): void;
  }
}

