import { IntegrationConnectionType } from '@prisma/client';

/** Connection types that must not use manual config connect. */
export function isAutomatedConnectionType(
  connectionType: IntegrationConnectionType,
): boolean {
  return (
    connectionType === IntegrationConnectionType.OAUTH ||
    connectionType === IntegrationConnectionType.EMBEDDED_SIGNUP
  );
}
