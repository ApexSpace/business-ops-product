import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MODULE_KEY = 'requireModule';

/**
 * Require at least one of the given capability modules.
 * Use multiple keys when a resource powers more than one sellable module
 * (e.g. leads table view under CRM pipelines).
 */
export const RequireModule = (...moduleKeys: string[]) =>
  SetMetadata(REQUIRE_MODULE_KEY, moduleKeys);
