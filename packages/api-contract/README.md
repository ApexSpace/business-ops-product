# API contract package

Run the NestJS API once to write `backend/openapi.json`, then:

```bash
npm run codegen --workspace=@business-automation/api-contract
```

Import generated types in the frontend when replacing hand-maintained DTOs.
