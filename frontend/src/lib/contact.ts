// Official DigiPhonics contact channels — shown on the Contact page, homepage and footer.
import { Instagram, Mail, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ContactChannel {
  key: string;
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
  description: string;
  testId: string;
  external: boolean;
}

export const CONTACT_EMAIL = "digihire.in";
export const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb8owaS4yltKWmSt3W1X";
export const INSTAGRAM_URL = "https://www.instagram.com/digiphonicstechnology?xtok=OTkyNzE2dW1jbzBn";

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    key: "email",
    label: "Email us",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    icon: Mail,
    description: "Send your query, resume or vacancy details — we reply within two business days.",
    testId: "contact-email-btn",
    external: false,
  },
  {
    key: "whatsapp",
    label: "WhatsApp channel",
    value: "Join for job alerts",
    href: WHATSAPP_CHANNEL,
    icon: MessageCircle,
    description: "Follow our channel for new openings and interview tips as they go live.",
    testId: "contact-whatsapp-btn",
    external: true,
  },
  {
    key: "instagram",
    label: "Instagram",
    value: "@digiphonicstechnology",
    href: INSTAGRAM_URL,
    icon: Instagram,
    description: "Career guidance, hiring updates and behind-the-scenes from our team.",
    testId: "contact-instagram-btn",
    external: true,
  },
];
