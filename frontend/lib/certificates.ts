import { supabase } from "./supabase"

export type CertificateStatus = "uploaded" | "processing" | "completed" | "needs_review" | "failed"

export type Certificate = {
  id: string
  user_id: string | null
  certificate_name: string
  source_file_path: string
  status: CertificateStatus
  result: Record<string, unknown>
  created_at: string
  updated_at: string
}

const bucket = "certificate-files"

const demoCertificates: Array<{
  certificate_name: string
  source_file_path: string
  status: CertificateStatus
  result: Record<string, unknown>
}> = [
  {
    certificate_name: "Nguyen Minh Anh — IELTS Academic",
    source_file_path: "demo/nguyen-minh-anh-ielts.json",
    status: "completed",
    result: {
      fullName: "NGUYEN MINH ANH",
      certificateType: "IELTS Academic",
      certificateId: "23VN001847ANHN001A",
      overallScore: "7.5",
      testDate: "15/05/2025",
      expiryDate: "15/05/2027",
    },
  },
  {
    certificate_name: "Tran Bao Chau — IELTS Academic",
    source_file_path: "demo/tran-bao-chau-ielts.json",
    status: "processing",
    result: {
      fullName: "TRAN BAO CHAU",
      certificateType: "IELTS Academic",
      certificateId: "23VN001847CHAU002B",
      overallScore: "8.0",
    },
  },
  {
    certificate_name: "Le Hoang Nam — TOEFL iBT",
    source_file_path: "demo/le-hoang-nam-toefl.json",
    status: "processing",
    result: {
      fullName: "LE HOANG NAM",
      certificateType: "TOEFL iBT",
      certificateId: "TOEFL-2025-001",
      overallScore: "104",
    },
  },
  {
    certificate_name: "Pham My Linh — TOEFL iBT",
    source_file_path: "demo/pham-my-linh-toefl.json",
    status: "completed",
    result: {
      fullName: "PHAM MY LINH",
      certificateType: "TOEFL iBT",
      certificateId: "TOEFL-2025-002",
      overallScore: "112",
    },
  },
  {
    certificate_name: "Hoang Gia Bao — TOEIC",
    source_file_path: "demo/hoang-gia-bao-toeic.json",
    status: "completed",
    result: {
      fullName: "HOANG GIA BAO",
      certificateType: "TOEIC",
      certificateId: "TOEIC-2025-001",
      overallScore: "875",
    },
  },
  {
    certificate_name: "Vu Thu Ha — IELTS Academic",
    source_file_path: "demo/vu-thu-ha-ielts.json",
    status: "processing",
    result: {
      fullName: "VU THU HA",
      certificateType: "IELTS Academic",
      certificateId: "23VN001847THA003C",
      overallScore: "6.5",
    },
  },
]

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-")
}

export async function saveCertificate(
  file: File,
  result: Record<string, unknown>,
  certificateName = file.name,
) {
  const filePath = `public/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      certificate_name: certificateName.trim() || file.name,
      source_file_path: filePath,
      status: "completed",
      result,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(bucket).remove([filePath])
    throw error
  }

  return data as Certificate
}

export async function seedDemoCertificates() {
  const { count, error: countError } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
  if (countError) throw countError
  if (count) return

  const { error } = await supabase.from("certificates").insert(demoCertificates)
  if (error) throw error
}

export async function listCertificates() {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Certificate[]
}
