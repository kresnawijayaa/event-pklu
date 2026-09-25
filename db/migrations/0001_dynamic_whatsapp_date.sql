UPDATE events
SET whatsapp_template = replace(
  whatsapp_template,
  'Tanggal kegiatan: 12 Oktober 2026',
  'Tanggal kegiatan: {{tanggal}}'
)
WHERE whatsapp_template LIKE '%Tanggal kegiatan: 12 Oktober 2026%';
