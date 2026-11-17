import { z } from "zod";
import { InfraiClient, infrai } from "./infrai-client.ts";

const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  patientEmail: z.string().email(),
  contractPdf: z.string().min(1),
  certPem: z.string().min(1),
  keyPem: z.string().min(1)
});

export type AppointmentContract = z.infer<typeof appointmentSchema>;

export function notificationFor(status: "signed" | "pending"): string {
  return status === "signed"
    ? "The appointment contract is signed and ready for review."
    : "The appointment contract is being prepared for review.";
}

export async function signAppointmentContract(input: unknown, client: InfraiClient, bucket = "healthtech-contracts") {
  const request = appointmentSchema.parse(input);
  await client.request("POST", "/v1/storage/bucket/create", { name: bucket });
  const signed = await client.request<{ pdf?: string }>("POST", "/v1/pdf/sign", {
    pdf: request.contractPdf,
    cert_pem: request.certPem,
    key_pem: request.keyPem,
    reason: "Appointment contract",
    location: "Healthtech care team",
    retention_days: 30
  });
  const objectKey = `${request.patientId}/${request.appointmentId}.pdf`;
  await client.request("PUT", `/v1/storage/object/put/${bucket}/${objectKey}`, {
    data_base64: signed.pdf ?? request.contractPdf,
    content_type: "application/pdf",
    idempotency_key: `contract-${request.appointmentId}`
  });
  const link = await client.request<{ url?: string }>("POST", `/v1/storage/object/presign/${bucket}/${objectKey}`, {
    op: "get",
    expires_seconds: 900,
    response_disposition: "attachment",
    idempotency_key: `download-${request.appointmentId}`
  });
  return {
    appointmentId: request.appointmentId,
    signedPdf: signed.pdf,
    storageKey: objectKey,
    downloadUrl: link.url,
    notification: notificationFor("signed"),
    capabilities: [infrai.pdf.sign, infrai.storage.object.presign]
  };
}

async function main() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const certPem = process.env.INFRAI_CERT_PEM;
  if (!certPem) throw new Error("Set INFRAI_CERT_PEM to a PEM-encoded signing certificate before running the example.");
  const keyPem = process.env.INFRAI_KEY_PEM;
  if (!keyPem) throw new Error("Set INFRAI_KEY_PEM to a PEM-encoded private key before running the example.");
  const patientEmail = process.env.INFRAI_PATIENT_EMAIL;
  if (!patientEmail) throw new Error("Set INFRAI_PATIENT_EMAIL before running the example.");
  const bucket = process.env.INFRAI_BUCKET ?? "healthtech-contracts";
  const result = await signAppointmentContract({
    appointmentId: "appt-1042",
    patientId: "patient-27",
    patientEmail,
    contractPdf: "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFtdIC9Db3VudCAwID4+CmVuZG9iagp0cmFpbGVyCjw8IC9Sb290IDEgMCBSID4+CiUlRU9GCg==",
    certPem,
    keyPem
  }, new InfraiClient(key), bucket);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) await main();
