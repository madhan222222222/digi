import { ShieldCheck, Users } from "lucide-react";
import { useSiteContent } from "@/lib/content";
import { ContactChannels } from "@/components/ContactChannels";
import { Card } from "@/components/ui/card";

export default function Contact() {
  const { text } = useSiteContent("contact_info");

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Contact us</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" data-testid="contact-headline">
        Reach the DigiPhonics team directly
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{text}</p>

      <div className="mt-8">
        <ContactChannels testPrefix="contact" />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
            <Users className="h-4 w-4 text-amber-800" /> What to send us
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><strong className="text-slate-800">Candidates</strong> — your resume, the roles you are targeting, and any question about an application.</li>
            <li><strong className="text-slate-800">Employers</strong> — your vacancy details; or submit them directly on the Employer page.</li>
            <li><strong className="text-slate-800">Data requests</strong> — ask us to correct or delete your personal data.</li>
            <li><strong className="text-slate-800">Reports</strong> — flag a suspicious listing or any fee demanded in our name.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-amber-800" /> A note on fees
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            We never ask for payment to register, apply, or to "release" an offer letter. If anyone asks you for
            such a payment in our name, report it to us on email or WhatsApp immediately.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            DigiPhonics Technology is a recruitment and career placement company — not a training institute. We do
            not sell courses, and no job offer is ever guaranteed in exchange for payment.
          </p>
        </Card>
      </div>
    </div>
  );
}
