import { Global, Module } from '@nestjs/common';
import { PostgresSearchService } from './postgres-search.service';

@Global()
@Module({
  providers: [PostgresSearchService],
  exports: [PostgresSearchService],
})
export class SearchModule {}
