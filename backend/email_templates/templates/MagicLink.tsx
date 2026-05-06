import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, Button, Divider } from './components';

interface MagicLinkProps {
  magic_link_url: string;
  expiration_minutes: string | number;
}

export default function MagicLink({
  magic_link_url = 'https://app.sloopquest.com/auth/magic-link?token=example',
  expiration_minutes = 15,
}: MagicLinkProps) {
  return (
    <BaseLayout
      preview="Sign in to your account"
      footerNote="This email was sent because a sign-in was requested for your account."
    >
      <Text className="font-serif text-[26px] leading-tight text-dark m-0 mb-5">
        Sign in to your account
      </Text>

      <Text className="font-sans text-[15px] leading-relaxed text-mid m-0 mb-7">
        Click the button below to securely sign in to Sloopquest. This link expires in{' '}
        {expiration_minutes} minutes for your security.
      </Text>

      <Section className="mb-8">
        <Button href={magic_link_url}>Continue to Sloopquest →</Button>
      </Section>

      <Divider />

      {/* Copyable link */}
      <Text className="font-sans text-[12px] font-medium text-footer-muted uppercase tracking-widest m-0 mb-2">
        Or copy this link
      </Text>
      <div className="bg-sail-light border border-light-border rounded-xl px-4 py-3.5">
        <Text className="font-mono text-[12px] break-all m-0 leading-normal text-mid">
          {magic_link_url}
        </Text>
      </div>

      <Divider />

      {/* Security notice */}
      <div className="bg-sail-light rounded-xl border border-light-border px-4 py-4">
        <Text className="font-sans text-sm leading-relaxed text-mid m-0">
          <strong className="text-dark font-semibold">Didn't request this?</strong>
          <br />
          You can safely ignore this email. This link can only be used once and expires automatically.
        </Text>
      </div>
    </BaseLayout>
  );
}
