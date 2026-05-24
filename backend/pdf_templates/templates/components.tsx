import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';

// react-pdf-tailwind for layout/spacing; custom colors via StyleSheet
export const tw = createTw({});

export const colors = {
  navy: '#0F2A3F',
  navyLight: '#1F4A6B',
  teak: '#A26A3A',
  sail: '#F6F4EE',
  rope: '#C8B79A',
  mid: '#4F5F6B',
  border: '#E1DCD2',
  muted: '#8A8378',
  white: '#FFFFFF',
};

export const fonts = {
  serif: 'Times-Roman',
  serifBold: 'Times-Bold',
  sans: 'Helvetica',
  sansBold: 'Helvetica-Bold',
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.navy },
  headerRight: { fontFamily: fonts.sans, fontSize: 9, color: colors.mid },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { fontFamily: fonts.sans, fontSize: 9, color: colors.muted },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.navy,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionContainer: { marginBottom: 20 },
});

interface PageHeaderProps {
  vesselName: string;
  companyName: string;
}

export function PageHeader({ vesselName, companyName }: PageHeaderProps) {
  return (
    <View style={s.header}>
      <Text style={s.headerLeft}>{vesselName}</Text>
      <Text style={s.headerRight}>Surveyed by {companyName}</Text>
    </View>
  );
}

interface PageFooterProps {
  pageNumber: number;
  totalPages: number;
}

export function PageFooter({ pageNumber, totalPages }: PageFooterProps) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>Confidential</Text>
      <Text style={s.footerText}>
        Page {pageNumber} of {totalPages}
      </Text>
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={s.sectionContainer} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
