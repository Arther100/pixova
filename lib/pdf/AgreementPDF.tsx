// ============================================
// Agreement PDF — @react-pdf/renderer template
// Server-only — never import in client components
// ============================================

import "server-only";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { AgreementSnapshot } from "@/types";
import { formatAgreementDate, formatINR } from "@/lib/agreements";

// ── Colors ──
const NAVY = "#0D1B3E";
const GOLD = "#DAA520";
const BORDER = "#E2E6EA";
const TEXT_COLOR = "#1a1a2e";
const MUTED = "#6B7A8D";

// ── Styles ──
const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT_COLOR,
    lineHeight: 1.5,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 2,
  },
  brandUrl: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  headerRef: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  goldRule: {
    height: 1.5,
    backgroundColor: GOLD,
    marginVertical: 12,
  },
  // Section headings
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 20,
  },
  // Parties
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  partyCol: {
    width: "48%",
  },
  partyLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: TEXT_COLOR,
    marginBottom: 1,
  },
  // Table
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 6,
  },
  tableLabel: {
    width: "40%",
    fontSize: 9,
    color: MUTED,
  },
  tableValue: {
    width: "60%",
    fontSize: 9,
    color: TEXT_COLOR,
  },
  // Package
  packageName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 2,
  },
  packageInclusions: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 8,
  },
  // Balance row
  balanceRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    marginTop: 2,
  },
  balanceLabel: {
    width: "40%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  balanceValue: {
    width: "60%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  // Terms
  termItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  termNumber: {
    width: 16,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  termText: {
    flex: 1,
    fontSize: 9,
    color: TEXT_COLOR,
  },
  // Policy
  policyText: {
    fontSize: 9,
    color: TEXT_COLOR,
    lineHeight: 1.6,
  },
  // Notes
  notesText: {
    fontSize: 9,
    color: TEXT_COLOR,
    lineHeight: 1.5,
  },
  // Acknowledgement
  ackText: {
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  // Signatures
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sigCol: {
    width: "45%",
  },
  sigLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 20,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 4,
  },
  sigName: {
    fontSize: 9,
    color: TEXT_COLOR,
  },
  sigDate: {
    fontSize: 8,
    color: MUTED,
    marginTop: 8,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
  },
  footerRule: {
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: MUTED,
  },
});

// ── Fixed terms ──
const TERMS = [
  "The photographer will deliver the agreed deliverables within the timeline discussed.",
  "Raw/unedited files are not included unless explicitly agreed in writing.",
  "A copy of edited photographs will be delivered via the Pixova platform gallery link.",
  "The client grants the photographer permission to use select images for portfolio purposes unless opted out in writing.",
  "Force majeure: Neither party is liable for events beyond reasonable control (natural disasters, illness, etc.). Alternate arrangements will be made in good faith.",
];

interface Props {
  data: AgreementSnapshot;
}

export function AgreementPDF({ data }: Props) {
  const generatedDate = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(data.generated_at));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>PIXOVA</Text>
            <Text style={s.brandUrl}>pixova.in</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>PHOTOGRAPHY AGREEMENT</Text>
            <Text style={s.headerRef}>{data.agreement_ref}</Text>
            <Text style={s.headerRef}>{generatedDate}</Text>
          </View>
        </View>
        <View style={s.goldRule} />

        {/* ── SECTION 1: PARTIES ── */}
        <Text style={s.sectionTitle}>PARTIES TO THIS AGREEMENT</Text>
        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Studio / Photographer</Text>
            <Text style={s.partyName}>{data.studio_name}</Text>
            {data.studio_address && (
              <Text style={s.partyDetail}>{data.studio_address}</Text>
            )}
            <Text style={s.partyDetail}>{data.studio_city}</Text>
            {data.studio_mobile && (
              <Text style={s.partyDetail}>{data.studio_mobile}</Text>
            )}
            {data.gstin && (
              <Text style={s.partyDetail}>GSTIN: {data.gstin}</Text>
            )}
          </View>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Client</Text>
            <Text style={s.partyName}>{data.client_name}</Text>
            <Text style={s.partyDetail}>{data.client_mobile}</Text>
            {data.client_email && (
              <Text style={s.partyDetail}>{data.client_email}</Text>
            )}
          </View>
        </View>

        {/* ── SECTION 2: EVENT DETAILS ── */}
        <Text style={s.sectionTitle}>EVENT DETAILS</Text>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Booking Reference</Text>
          <Text style={s.tableValue}>{data.booking_ref}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Event Type</Text>
          <Text style={s.tableValue}>{data.event_type}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Event Date</Text>
          <Text style={s.tableValue}>
            {data.event_date ? formatAgreementDate(data.event_date) : "—"}
          </Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>End Date</Text>
          <Text style={s.tableValue}>
            {data.event_end_date
              ? formatAgreementDate(data.event_end_date)
              : "—"}
          </Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Venue</Text>
          <Text style={s.tableValue}>
            {[data.venue_name, data.venue_city].filter(Boolean).join(", ") ||
              "—"}
          </Text>
        </View>

        {/* ── SECTION 3: PACKAGE & PRICING ── */}
        <Text style={s.sectionTitle}>PACKAGE &amp; PRICING</Text>
        {data.package_name && (
          <View>
            <Text style={s.packageName}>{data.package_name}</Text>
            {data.package_inclusions && (
              <Text style={s.packageInclusions}>
                {data.package_inclusions}
              </Text>
            )}
          </View>
        )}
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Total Amount</Text>
          <Text style={s.tableValue}>{formatINR(data.total_amount)}</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={s.tableLabel}>Advance Paid</Text>
          <Text style={s.tableValue}>{formatINR(data.advance_paid)}</Text>
        </View>
        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>Balance Due</Text>
          <Text style={s.balanceValue}>{formatINR(data.balance_amount)}</Text>
        </View>

        {/* ── SECTION 4: TERMS & CONDITIONS ── */}
        <Text style={s.sectionTitle}>TERMS &amp; CONDITIONS</Text>
        {TERMS.map((term, i) => (
          <View key={i} style={s.termItem}>
            <Text style={s.termNumber}>{i + 1}.</Text>
            <Text style={s.termText}>{term}</Text>
          </View>
        ))}

        {/* ── SECTION 5: CANCELLATION POLICY ── */}
        <Text style={s.sectionTitle}>CANCELLATION POLICY</Text>
        <Text style={s.policyText}>{data.cancellation_policy}</Text>

        {/* ── SECTION 6: NOTES ── */}
        {data.notes && (
          <View>
            <Text style={s.sectionTitle}>ADDITIONAL NOTES</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── SECTION 7: ACKNOWLEDGEMENT ── */}
        <View style={s.goldRule} />
        <Text style={s.ackText}>
          This agreement has been generated via the Pixova platform. By
          proceeding with this booking, both parties confirm they have read and
          agree to the terms outlined above.
        </Text>

        <View style={s.sigRow}>
          <View style={s.sigCol}>
            <Text style={s.sigLabel}>Photographer Signature</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{data.studio_name}</Text>
            <Text style={s.sigDate}>Date: ___________</Text>
          </View>
          <View style={s.sigCol}>
            <Text style={s.sigLabel}>Client Signature</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{data.client_name}</Text>
            <Text style={s.sigDate}>Date: ___________</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View style={s.footerRule} />
          <View style={s.footerRow}>
            <Text style={s.footerText}>
              Generated by Pixova — pixova.in
            </Text>
            <Text
              style={s.footerText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
