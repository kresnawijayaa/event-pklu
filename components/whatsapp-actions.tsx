import { ExternalLink } from "lucide-react";
import { createWhatsAppUrl, renderWhatsAppMessage } from "@/lib/whatsapp";
import styles from "./whatsapp-actions.module.css";

type Props = {
  participant: { name: string; registrationCode: string; whatsappE164: string; church: string | null };
  template: string;
  eventDate: string;
};

export default function WhatsAppActions({ participant, template, eventDate }: Props) {
  const message = renderWhatsAppMessage(template, {
    name: participant.name, registrationCode: participant.registrationCode,
    church: participant.church, eventDate,
  });
  const href = createWhatsAppUrl(participant.whatsappE164, message);

  return <a className={styles.open} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Buka WhatsApp untuk ${participant.name}`}>
    WhatsApp <ExternalLink aria-hidden="true" />
  </a>;
}
