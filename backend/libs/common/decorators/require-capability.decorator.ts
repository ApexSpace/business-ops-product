import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CAPABILITY_KEY = 'requireCapability';

export const RequireCapability = (capabilityKey: string) =>
  SetMetadata(REQUIRE_CAPABILITY_KEY, capabilityKey);
