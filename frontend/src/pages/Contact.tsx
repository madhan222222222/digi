import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { useSiteContent } from "@/lib/content";
import { ContactForm } from "@/components/ContactForm";
import { Card } from "@/components/ui/card";

export default function Contact() {
  const { text } = useSiteContent("contact_info");

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Contact us</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" data-testid="contact-headline">
        Talk to the DigiPhonics team
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <Card className="p-6" data-testid="contact-info-card">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <MessageSquare className="h-4 w-4 text-teal-700" /> How to reach us
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
          </Card>
          <Card className="p-6">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <Mail className="h-4 w-4 text-teal-700" /> Who should write to us
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Candidates with questions about an application or their profile</li>
              <li>Employers who want to publish a vacancy</li>
              <li>Anyone who needs to correct or delete their personal data</li>
              <li>Anyone reporting a suspicious listing or a fee demand</li>
            </ul>
          </Card>
          <Card className="p-6">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-teal-700" /> A note on fees
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              We never ask for payment to register, apply, or to "release" an offer letter. If anyone asks you for
              such a payment in our name, report it through this form immediately.
            </p>
          </Card>
        </div>
        <div className="lg:col-span-7">
          <Card className="p-6">
            <h2 className="font-heading text-xl font-bold text-slate-900">Send an enquiry</h2>
            <p className="mt-1 text-sm text-slate-600">We respond within two business days.</p>
            <div className="mt-6">
              <ContactForm testPrefix="contact" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
