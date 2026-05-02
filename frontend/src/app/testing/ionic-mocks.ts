/**
 * Mocks centralizados para Ionic controllers.
 * Importar en specs de pages y smart components para evitar duplicación.
 * ADR-04: mock completo con la cadena de promesas que Ionic espera.
 */

export const MODAL_MOCK = {
  present: jest.fn().mockResolvedValue(undefined),
  onWillDismiss: jest.fn().mockResolvedValue({ data: null, role: 'cancel' }),
  dismiss: jest.fn().mockResolvedValue(undefined),
};

export const MODAL_CONTROLLER_MOCK = {
  create: jest.fn().mockResolvedValue(MODAL_MOCK),
};

export const TOAST_CONTROLLER_MOCK = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
};

export const ALERT_CONTROLLER_MOCK = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
};
