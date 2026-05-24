import { Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, Divider } from './components';

interface UnknownRecipientBounceProps {
  original_to: string;
  original_subject: string;
}

export default function UnknownRecipientBounce({
  original_to = 'unknown@sloopquest.com',
  original_subject = '',
}: UnknownRecipientBounceProps) {
  return (
    <BaseLayout
      preview={`Delivery failure: ${original_to}`}
      footerNote="This is an automated message from the Sloopquest mail system."
    >
      <Text className="font-serif text-[26px] leading-tight text-dark m-0 mb-5">
        Delivery failed
      </Text>

      <Text className="font-sans text-[15px] leading-relaxed text-mid m-0 mb-5">
        Your message could not be delivered to{' '}
        <strong className="text-dark font-semibold">{original_to}</strong> because no
        such mailbox exists at sloopquest.com.
      </Text>

      <Text className="font-sans text-[15px] leading-relaxed text-mid m-0 mb-5">
        Please check the address and try again. If you believe this address should
        exist, contact the recipient through another channel.
      </Text>

      <Divider />

      <Text className="font-sans text-[12px] font-medium text-footer-muted uppercase tracking-widest m-0 mb-2">
        Original message
      </Text>
      <div className="bg-sail-light border border-light-border rounded-xl px-4 py-3.5">
        <Text className="font-sans text-[13px] m-0 leading-normal text-mid">
          <strong className="text-dark">To:</strong> {original_to}
          <br />
          <strong className="text-dark">Subject:</strong> {original_subject}
        </Text>
      </div>
    </BaseLayout>
  );
}
