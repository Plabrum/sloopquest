import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, Button, Divider } from './components';

interface InvoicePaymentProps {
  pay_url: string;
  invoice_number: string;
  organization_name: string;
  total_display: string;
  due_at_display: string;
}

export default function InvoicePayment({
  pay_url = 'https://app.sloopquest.com/pay/example',
  invoice_number = 'INV-0001',
  organization_name = 'Acme Marine Surveys',
  total_display = '$1,234.56',
  due_at_display = '',
}: InvoicePaymentProps) {
  const headingSuffix = invoice_number ? ` ${invoice_number}` : '';

  return (
    <BaseLayout
      preview={`Invoice${headingSuffix} from ${organization_name}`}
      footerNote="You're receiving this email because an invoice was sent to you."
    >
      <Text className="font-mono text-[10px] text-brass-deep uppercase tracking-[0.28em] m-0 mb-3">
        Invoice
      </Text>
      <Text className="font-serif text-[26px] leading-tight text-ink m-0 mb-6">
        Invoice{headingSuffix} from {organization_name}
      </Text>

      <Text className="font-mono text-[10px] text-ink-muted uppercase tracking-[0.22em] m-0 mb-2">
        Amount due
      </Text>
      <Text className="font-serif text-[32px] text-ink m-0 mb-6 leading-none">
        {total_display}
      </Text>

      {due_at_display ? (
        <Text className="font-body text-[14px] leading-relaxed text-ink-muted m-0 mb-7">
          Due {due_at_display}
        </Text>
      ) : null}

      <Section className="mb-8">
        <Button href={pay_url}>Pay invoice</Button>
      </Section>

      <Divider />

      <Text className="font-mono text-[10px] text-brass-deep uppercase tracking-[0.22em] m-0 mb-2">
        Or copy this link
      </Text>
      <div className="bg-paper-warm border border-light-border rounded-[2px] px-4 py-3.5">
        <Text className="font-mono text-[12px] break-all m-0 leading-normal text-ink-muted">
          {pay_url}
        </Text>
      </div>

      <Divider />

      <div className="bg-paper-warm rounded-[2px] border border-light-border px-4 py-4">
        <Text className="font-body text-[14px] leading-relaxed text-ink-muted m-0">
          <strong className="text-ink font-semibold">Questions?</strong>
          <br />
          Reply to this email and we&rsquo;ll get back to you.
        </Text>
      </div>
    </BaseLayout>
  );
}
