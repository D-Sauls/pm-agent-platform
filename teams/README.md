# Teams Local Testing

1. Start backend and expose it using ngrok (or Teams Toolkit tunnel):
   - `ngrok http 4000`
2. Set Teams bot messaging endpoint to:
   - `https://<tunnel>/api/teams/messages`
3. Package `teams/manifest/manifest.json` with icons and sideload in Teams.

## Tenant Mapping

Set `TEAMS_TENANT_MAP` as JSON to map Teams tenant IDs to platform tenant IDs.

Example:

```json
{"<teams-tenant-guid>":"tenant-acme"}
```

Fallback tenant is `tenant-acme` if no mapping is provided.
