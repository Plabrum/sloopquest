import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Tailwind,
  Button as ReactEmailButton,
} from '@react-email/components';
import * as React from 'react';

const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        sail: '#F6F4EE',
        'sail-light': '#FBFAF6',
        navy: '#0F2A3F',
        'navy-light': '#1F4A6B',
        teak: '#A26A3A',
        rope: '#C8B79A',
        dark: '#0F2A3F',
        mid: '#4F5F6B',
        'light-border': '#E1DCD2',
        'footer-muted': '#8A8378',
        'footer-subtle': '#B5AFA7',
      },
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
} as const;

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
  footerNote?: string;
}

export function BaseLayout({ preview, children, footerNote }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind config={tailwindConfig}>
        <Head />
        <Preview>{preview}</Preview>
        <Body className="bg-sail m-0 p-0 font-serif">
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bg-sail">
            <tbody>
              <tr>
                <td align="center" className="py-10 px-5">
                  <Container className="max-w-[560px] w-full">

                    {/* Logo */}
                    <Section className="pb-10">
                      <Text className="font-serif text-[22px] text-navy tracking-wide m-0">
                        Sloopquest
                      </Text>
                    </Section>

                    {/* Main card */}
                    <Section className="bg-white rounded-2xl border border-light-border px-10 py-12">
                      {children}

                      {/* Sign-off */}
                      <Text className="font-serif text-base text-dark mt-8 mb-0">
                        Fair winds,<br />
                        <span className="text-teak">The Sloopquest Team</span>
                      </Text>
                    </Section>

                    {/* Footer */}
                    <Section className="pt-8 text-center">
                      <Text className="font-sans text-xs text-footer-muted m-0 mb-1">
                        © 2026 Sloopquest
                      </Text>
                      <Text className="font-sans text-[11px] text-footer-subtle m-0">
                        {footerNote ?? "You're receiving this because you have a Sloopquest account."}
                      </Text>
                    </Section>

                  </Container>
                </td>
              </tr>
            </tbody>
          </table>
        </Body>
      </Tailwind>
    </Html>
  );
}

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <ReactEmailButton
      href={href}
      className="bg-navy text-white no-underline rounded-full px-8 py-3.5 font-sans font-medium text-[15px] tracking-wide border-none leading-tight"
    >
      {children}
    </ReactEmailButton>
  );
}

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <Hr className={`border-light-border my-7 ${className ?? ''}`} />;
}
