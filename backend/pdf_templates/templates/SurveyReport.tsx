import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { colors, fonts, PageHeader, PageFooter, Section } from './components';

interface SurveyReportProps {
  vessel_name: string;
  vessel_type: string;
  surveyor_name: string;
  company_name: string;
  company_address: string;
  client_name: string;
  survey_date: string;
  cover_photo_url: string;
  sections: Array<{ title: string; content: string }>;
}

const s = StyleSheet.create({
  // Cover
  cover: { backgroundColor: colors.navy, flexDirection: 'column' },
  coverTop: { paddingHorizontal: 48, paddingTop: 40, paddingBottom: 24 },
  coverCompany: { fontFamily: fonts.serif, fontSize: 20, color: colors.white },
  coverAddress: { fontFamily: fonts.sans, fontSize: 9, color: colors.rope, marginTop: 4 },
  coverPhoto: { marginHorizontal: 48, flex: 1 },
  coverPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coverPhotoPlaceholder: {
    flex: 1,
    backgroundColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    height: 320,
  },
  coverPhotoPlaceholderText: { fontFamily: fonts.sans, fontSize: 9, color: colors.rope },
  coverVessel: { paddingHorizontal: 48, paddingTop: 32, paddingBottom: 16 },
  coverVesselName: { fontFamily: fonts.serif, fontSize: 28, color: colors.white, lineHeight: 1.2 },
  coverVesselType: { fontFamily: fonts.sans, fontSize: 11, color: colors.rope, marginTop: 8 },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 48,
    paddingBottom: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.navyLight,
  },
  coverFooterLabel: { fontFamily: fonts.sans, fontSize: 8, color: colors.rope },
  coverFooterValue: { fontFamily: fonts.serif, fontSize: 11, color: colors.white },
  coverFooterDate: { fontFamily: fonts.sans, fontSize: 9, color: colors.rope },

  // Title page
  title: { backgroundColor: colors.white, flexDirection: 'column', paddingHorizontal: 64, paddingVertical: 64 },
  titleInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleEyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 8,
    color: colors.navy,
    marginBottom: 32,
    letterSpacing: 3,
  },
  titleDivider: { width: 48, borderTopWidth: 2, borderTopColor: colors.teak, marginBottom: 32 },
  titleVesselName: { fontFamily: fonts.serif, fontSize: 28, color: colors.navy, textAlign: 'center', marginBottom: 8 },
  titleVesselType: { fontFamily: fonts.sans, fontSize: 11, color: colors.mid, marginBottom: 64 },
  titleTable: { width: '100%', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 32, marginTop: 32 },
  titleRow: { flexDirection: 'row', marginBottom: 12 },
  titleLabel: { fontFamily: fonts.sans, fontSize: 9, color: colors.muted, width: 120 },
  titleValue: { fontFamily: fonts.serif, fontSize: 11, color: colors.navy, flex: 1 },
  titleDisclaimer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  titleDisclaimerText: { fontFamily: fonts.sans, fontSize: 8, color: colors.muted, textAlign: 'center' },

  // Body
  bodyContent: { flex: 1, paddingHorizontal: 48, paddingVertical: 24 },
  bodyText: { fontFamily: fonts.sans, fontSize: 10, color: colors.mid, lineHeight: 1.6 },
});

function CoverPage({
  vessel_name,
  vessel_type,
  surveyor_name,
  company_name,
  company_address,
  survey_date,
  cover_photo_url,
}: Omit<SurveyReportProps, 'client_name' | 'sections'>) {
  return (
    <Page size="A4" style={s.cover}>
      <View style={s.coverTop}>
        <Text style={s.coverCompany}>{company_name}</Text>
        <Text style={s.coverAddress}>{company_address}</Text>
      </View>

      <View style={s.coverPhoto}>
        {cover_photo_url ? (
          <Image src={cover_photo_url} style={s.coverPhotoImg} />
        ) : (
          <View style={s.coverPhotoPlaceholder}>
            <Text style={s.coverPhotoPlaceholderText}>No photo provided</Text>
          </View>
        )}
      </View>

      <View style={s.coverVessel}>
        <Text style={s.coverVesselName}>{vessel_name}</Text>
        <Text style={s.coverVesselType}>{vessel_type}</Text>
      </View>

      <View style={s.coverFooter}>
        <View>
          <Text style={s.coverFooterLabel}>Marine Surveyor</Text>
          <Text style={s.coverFooterValue}>{surveyor_name}</Text>
        </View>
        <Text style={s.coverFooterDate}>{survey_date}</Text>
      </View>
    </Page>
  );
}

function TitlePage({
  vessel_name,
  vessel_type,
  surveyor_name,
  company_name,
  client_name,
  survey_date,
}: Omit<SurveyReportProps, 'cover_photo_url' | 'sections' | 'company_address'>) {
  return (
    <Page size="A4" style={s.title}>
      <View style={s.titleInner}>
        <Text style={s.titleEyebrow}>REPORT OF MARINE SURVEY</Text>
        <View style={s.titleDivider} />
        <Text style={s.titleVesselName}>{vessel_name}</Text>
        <Text style={s.titleVesselType}>{vessel_type}</Text>

        <View style={s.titleTable}>
          <TitleRow label="Prepared for" value={client_name} />
          <TitleRow label="Surveyed by" value={surveyor_name} />
          <TitleRow label="Survey company" value={company_name} />
          <TitleRow label="Survey date" value={survey_date} />
        </View>
      </View>

      <View style={s.titleDisclaimer}>
        <Text style={s.titleDisclaimerText}>
          This report is for the exclusive use of the party named above.
        </Text>
      </View>
    </Page>
  );
}

function TitleRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.titleRow}>
      <Text style={s.titleLabel}>{label}</Text>
      <Text style={s.titleValue}>{value}</Text>
    </View>
  );
}

const SECTIONS_PER_PAGE = 4;

export default function SurveyReport(props: SurveyReportProps) {
  const {
    vessel_name,
    vessel_type,
    surveyor_name,
    company_name,
    company_address,
    client_name,
    survey_date,
    cover_photo_url,
    sections,
  } = props;

  const pages: Array<Array<{ title: string; content: string }>> = [];
  for (let i = 0; i < sections.length; i += SECTIONS_PER_PAGE) {
    pages.push(sections.slice(i, i + SECTIONS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <Document>
      <CoverPage
        vessel_name={vessel_name}
        vessel_type={vessel_type}
        surveyor_name={surveyor_name}
        company_name={company_name}
        company_address={company_address}
        survey_date={survey_date}
        cover_photo_url={cover_photo_url}
      />
      <TitlePage
        vessel_name={vessel_name}
        vessel_type={vessel_type}
        surveyor_name={surveyor_name}
        company_name={company_name}
        client_name={client_name}
        survey_date={survey_date}
      />
      {pages.map((pageSections, i) => (
        <Page key={i} size="A4" style={{ backgroundColor: colors.white, flexDirection: 'column' }}>
          <PageHeader vesselName={vessel_name} companyName={company_name} />
          <View style={s.bodyContent}>
            {pageSections.map((section, j) => (
              <Section key={j} title={section.title}>
                <Text style={s.bodyText}>{section.content}</Text>
              </Section>
            ))}
          </View>
          <PageFooter pageNumber={i + 1} totalPages={pages.length} />
        </Page>
      ))}
    </Document>
  );
}
