import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUBJECTS = ["General enquiry", "Candidate support", "Employer / hiring", "Partnership", "Report an issue"];

export function ContactForm({ testPrefix = "contact" }: { testPrefix?: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/content/enquiries", {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        subject: form.subject,
        message: form.message,
      }),
    onSuccess: () => {
      toast.success("Enquiry sent — our team responds within two business days.");
      setForm({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not send your enquiry")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <form
      className="space-y-4"
      data-testid={`${testPrefix}-form`}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${testPrefix}-name`}>Full name *</Label>
          <Input id={`${testPrefix}-name`} required data-testid={`${testPrefix}-name-input`} {...field("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${testPrefix}-email`}>Email *</Label>
          <Input id={`${testPrefix}-email`} type="email" required data-testid={`${testPrefix}-email-input`} {...field("email")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${testPrefix}-phone`}>Phone (optional)</Label>
          <Input id={`${testPrefix}-phone`} data-testid={`${testPrefix}-phone-input`} {...field("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select value={form.subject} onValueChange={(v: string) => setForm((f) => ({ ...f, subject: v }))}>
            <SelectTrigger data-testid={`${testPrefix}-subject-select`}>
              <SelectValue>{(v: string) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${testPrefix}-message`}>Message *</Label>
        <Textarea id={`${testPrefix}-message`} rows={4} required data-testid={`${testPrefix}-message-textarea`} {...field("message")} />
      </div>
      <Button type="submit" disabled={mutation.isPending} data-testid={`${testPrefix}-submit-btn`}>
        <Send className="h-4 w-4" /> {mutation.isPending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
