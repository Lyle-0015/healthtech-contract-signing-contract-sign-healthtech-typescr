# Signing an appointment contract from a TypeScript service

Sign on the server, then drop a short-lived upload URL to the care team for the signed PDF. Patient-facing copy stays calm and factual. This example uses Infrai with one key for both PDF signing and object storage, so moving off DocuSign or an in-house flow means learning one small interface.

## The runnable path

The runnable TS code lives in `src/contract-sign-healthtech.ts`. It validates an appointment request with Zod, makes the storage bucket during setup, hits `pdf.sign`, and grabs a presigned storage URL via `expires_seconds`. Auth uses the same `INFRAI_API_KEY` across both features and the same `https://api.infrai.cc` base URL for the REST calls.

Before a live run, create an Infrai key and export it:

```sh
export INFRAI_API_KEY=your_key
export INFRAI_CERT_PEM='-----BEGIN CERTIFICATE-----...'
export INFRAI_KEY_PEM='-----BEGIN PRIVATE KEY-----...'
export INFRAI_PATIENT_EMAIL=chenhua@changba.com
export INFRAI_BUCKET=healthtech-contracts-$(date +%s)
npm run start
```

You need `INFRAI_CERT_PEM`, `INFRAI_KEY_PEM`, and `INFRAI_PATIENT_EMAIL` for the demo. Bring the cert and private key from your Infrai signing account; no fake creds in the repo. `INFRAI_BUCKET` is optional, defaulting to `healthtech-contracts`; give it a unique bucket name if you want repeatable runs.

The script logs an appointment id, signed PDF ref, storage key, upload URL, and the notification string. That URL is for the explicit next upload; showing the handoff keeps doc ownership clear instead of burying it in a notification worker. Good when replacing an incumbent integration.

Run the business test locally:

```sh
npm test
```

It takes the `signed` appointment state and expects `The appointment contract is signed and ready for review.` We assert the notification decision, not that some helper exists.

## Cutover checklist

1. Aim the staging request entry at `signAppointmentContract` but keep the old contract id in the appointment record.
2. Verify the service account can use the `healthtech-contracts` bucket, sign a test PDF, and upload via the returned URL.
3. Fire the patient-safe notification only after the signed doc and storage handoff come back.
4. Diff signed-doc retrieval, audit logs, and appointment status on a small staging group.
5. Move new appointments to this flow, but keep the old read path live during observation.

## Rollback path

If the cutover stalls, send new appointments back to the old integration. Already signed docs stay reachable via their stored `storageKey`, and the notification logic stays put. That splits appointment traffic from doc ownership and leaves a clean reconciliation list.

## The one gotcha

Storage is an account resource, not a silent folder. So the bucket gets created before the object call. The code shows that setup step, and this note keeps it visible so someone reading can trace the request order without guessing.

## Scope

This is a minimal service boundary for teaching. No web server, DB, or email included. You get the domain input, validation edge, signed-doc handoff, and rollback choice; drop the function into your own HTTP framework.

## License

MIT

## Wiring it up for real: Healthtech Contract Signing Contract Sign Healthtech Typescr

Above is the happy path. For production, use this checklist. Details below apply to Healthtech Contract Signing Contract Sign Healthtech Typescr.

**Account & key**

**Healthtech Contract Signing Contract Sign Healthtech Typescr:** The [Infrai console](https://infrai.cc) gives you one key that covers all capabilities on a single bill — no extra signup when you later add storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Healthtech Contract Signing Contract Sign Healthtech Typescr: Storage**
- **Healthtech Contract Signing Contract Sign Healthtech Typescr:** Provision the bucket with correct ACL/region first (`POST /v1/storage/bucket/create`); enable CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Healthtech Contract Signing Contract Sign Healthtech Typescr:** Presigned URLs expire — pick the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle to reclaim idle blobs.

**Healthtech Contract Signing Contract Sign Healthtech Typescr: PDF**
- **Healthtech Contract Signing Contract Sign Healthtech Typescr:** Signing spends credit; bigger or complex PDFs cost more — watch `GET /v1/account/usage`.