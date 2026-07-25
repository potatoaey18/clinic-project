import { jsPDF } from "jspdf";
import { formatDate, fullName } from "@/lib/format";

type RxItem = {
  medicine: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export function generatePrescriptionPdf(input: {
  clinic: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  doctor: { full_name?: string | null; license_no?: string | null; specialty?: string | null };
  patient: { first_name: string; last_name: string; middle_name?: string | null; date_of_birth?: string | null; sex?: string | null };
  issuedAt: string;
  items: RxItem[];
  notes?: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.clinic.name || "Clinic", w / 2, y, { align: "center" });
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const meta = [input.clinic.address, input.clinic.phone, input.clinic.email].filter(Boolean).join(" · ");
  if (meta) { doc.text(meta, w / 2, y, { align: "center" }); y += 12; }

  doc.setDrawColor(180);
  doc.line(30, y + 4, w - 30, y + 4);
  y += 20;

  doc.setFontSize(10);
  doc.text(`Patient: ${fullName(input.patient)}`, 30, y);
  doc.text(`Date: ${formatDate(input.issuedAt)}`, w - 30, y, { align: "right" });
  y += 14;
  const sub = [input.patient.sex, input.patient.date_of_birth && `DOB ${formatDate(input.patient.date_of_birth)}`].filter(Boolean).join(" · ");
  if (sub) { doc.setFontSize(9); doc.setTextColor(120); doc.text(sub, 30, y); doc.setTextColor(0); y += 14; }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Rx", 30, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  input.items.forEach((it, idx) => {
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${it.medicine}`, 40, y);
    doc.setFont("helvetica", "normal");
    const line2 = [it.dosage, it.frequency, it.duration].filter(Boolean).join(" · ");
    if (line2) { y += 12; doc.setFontSize(10); doc.text(line2, 52, y); doc.setFontSize(11); }
    if (it.instructions) {
      y += 12;
      doc.setFontSize(9);
      doc.setTextColor(90);
      const wrap = doc.splitTextToSize(`Sig: ${it.instructions}`, w - 90);
      doc.text(wrap, 52, y);
      y += (wrap.length - 1) * 10;
      doc.setFontSize(11);
      doc.setTextColor(0);
    }
  });

  if (input.notes) {
    y += 20;
    doc.setFontSize(9);
    const wrap = doc.splitTextToSize(`Notes: ${input.notes}`, w - 60);
    doc.text(wrap, 30, y);
    y += wrap.length * 10;
  }

  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(120);
  doc.line(w - 180, footerY, w - 30, footerY);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(input.doctor.full_name || "Physician", w - 30, footerY + 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const line = [input.doctor.specialty, input.doctor.license_no && `Lic. ${input.doctor.license_no}`].filter(Boolean).join(" · ");
  if (line) doc.text(line, w - 30, footerY + 24, { align: "right" });

  doc.save(`Rx-${input.patient.last_name}-${formatDate(input.issuedAt)}.pdf`);
}