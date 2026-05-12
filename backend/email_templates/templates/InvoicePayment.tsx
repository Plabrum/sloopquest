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
      <Text className="font-serif text-[26px] leading-tight text-dark m-0 mb-5">
        Invoice{headingSuffix} from {organization_name}
      </Text>

      <Text className="font-sans text-[15px] leading-relaxed text-mid m-0 mb-2">
        Amount due
      </Text>
      <Text className="font-serif text-[28px] text-dark m-0 mb-6">
        {total_display}
      </Text>

      {due_at_display ? (
        <Text className="font-sans text-[14px] leading-relaxed text-mid m-0 mb-7">
          Due {due_at_display}
        </Text>
      ) : null}

      <Section className="mb-8">
        <Button href={pay_url}>Pay invoice →</Button>
      </Section>

      <Divider />

      <Text className="font-sans text-[12px] font-medium text-footer-muted uppercase tracking-widest m-0 mb-2">
        Or copy this link
      </Text>
      <div className="bg-sail-light border border-light-border rounded-xl px-4 py-3.5">
        <Text className="font-mono text-[12px] break-all m-0 leading-normal text-mid">
          {pay_url}
        </Text>
      </div>

      <Divider />

      <div className="bg-sail-light rounded-xl border border-light-border px-4 py-4">
        <Text className="font-sans text-sm leading-relaxed text-mid m-0">
          <strong className="text-dark font-semibold">Questions?</strong>
          <br />
          Reply to this email and we'll get back to you.
        </Text>
      </div>
    </BaseLayout>
  );
}
