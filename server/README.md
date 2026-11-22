# asteroides-server

Headless Colyseus server for Tiny Aster. Run the suite from this directory:

```bash
pnpm exec jest
```

The suite is expected to finish without console noise. Expected `console.warn`
calls are asserted in their tests, and the room disposal log only runs when a
real `roomId` exists.

## Replication measurements

`src/__tests__/ReplicationSurfaceAudit.test.ts` and
`src/__tests__/GeometryWarsMultiplayer.test.ts` keep their measurements and
assertions, but only print them when `AUDIT_VERBOSE=1` is set:

```bash
AUDIT_VERBOSE=1 pnpm exec jest src/__tests__/ReplicationSurfaceAudit.test.ts
```

Without the variable, the audit output is suppressed through
`src/__tests__/helpers/auditLog.ts`.
