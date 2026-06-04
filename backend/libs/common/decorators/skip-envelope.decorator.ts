import { SetMetadata } from '@nestjs/common';
import { SKIP_ENVELOPE_KEY } from '../constants';

export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
