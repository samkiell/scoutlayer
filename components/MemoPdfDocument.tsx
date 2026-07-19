import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#E2E8F0', // slate-200
    backgroundColor: '#0B0F17', // match dark theme
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B', // slate-800
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#F8FAFC', // slate-50
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#00F2FE', // action brand cyan/blue color
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  date: {
    fontSize: 8,
    color: '#64748B', // slate-500
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#F8FAFC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 4,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#94A3B8', // slate-400
  },
  bulletList: {
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: '#00F2FE',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: '#94A3B8',
  },
  // SWOT simulated 2x2 layout
  swotRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  swotCol: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    padding: 10,
  },
  swotTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#F8FAFC',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  swotText: {
    fontSize: 9,
    color: '#94A3B8',
    lineHeight: 1.3,
    marginBottom: 3,
  },
  // Gaps flagged
  gapsContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EF4444', // red-500
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#1C1618',
  },
  gapsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#EF4444',
    marginBottom: 6,
    textTransform: 'uppercase',
  }
});

interface MemoPdfDocumentProps {
  companyName: string;
  dateString: string;
  memo: {
    companySnapshot?: string;
    investmentHypotheses?: string;
    swot?: {
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      threats?: string[];
    };
    problemProduct?: string;
    tractionKpis?: string;
    gapsFlagged?: string[];
  };
}

export function MemoPdfDocument({ companyName, dateString, memo }: MemoPdfDocumentProps) {
  // Convert hypotheses split by newline to paragraph lines
  const hypothesesLines = memo.investmentHypotheses
    ? memo.investmentHypotheses.split('\n').filter(line => line.trim().length > 0)
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>ScoutLayer Investment Memo</Text>
          <Text style={styles.title}>{companyName}</Text>
          <Text style={styles.date}>Generated: {dateString}</Text>
        </View>

        {/* Company Snapshot */}
        {memo.companySnapshot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Snapshot</Text>
            <Text style={styles.bodyText}>{memo.companySnapshot}</Text>
          </View>
        )}

        {/* Investment Hypotheses */}
        {hypothesesLines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investment Hypotheses</Text>
            <View style={styles.bulletList}>
              {hypothesesLines.map((line, idx) => {
                // Strip starting bullets like "-", "*", "•" if they exist
                const cleanLine = line.replace(/^[\s-*•]+/, '').trim();
                return (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{cleanLine}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SWOT */}
        {memo.swot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SWOT Analysis</Text>
            
            {/* Strengths & Weaknesses */}
            <View style={styles.swotRow}>
              <View style={styles.swotCol}>
                <Text style={[styles.swotTitle, { color: '#10B981' }]}>Strengths</Text>
                {memo.swot.strengths?.map((item, idx) => (
                  <Text key={idx} style={styles.swotText}>• {item}</Text>
                )) || <Text style={styles.swotText}>None identified</Text>}
              </View>
              <View style={styles.swotCol}>
                <Text style={[styles.swotTitle, { color: '#EF4444' }]}>Weaknesses</Text>
                {memo.swot.weaknesses?.map((item, idx) => (
                  <Text key={idx} style={styles.swotText}>• {item}</Text>
                )) || <Text style={styles.swotText}>None identified</Text>}
              </View>
            </View>

            {/* Opportunities & Threats */}
            <View style={styles.swotRow}>
              <View style={styles.swotCol}>
                <Text style={[styles.swotTitle, { color: '#3B82F6' }]}>Opportunities</Text>
                {memo.swot.opportunities?.map((item, idx) => (
                  <Text key={idx} style={styles.swotText}>• {item}</Text>
                )) || <Text style={styles.swotText}>None identified</Text>}
              </View>
              <View style={styles.swotCol}>
                <Text style={[styles.swotTitle, { color: '#F59E0B' }]}>Threats</Text>
                {memo.swot.threats?.map((item, idx) => (
                  <Text key={idx} style={styles.swotText}>• {item}</Text>
                )) || <Text style={styles.swotText}>None identified</Text>}
              </View>
            </View>
          </View>
        )}

        {/* Problem & Product */}
        {memo.problemProduct && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problem & Product</Text>
            <Text style={styles.bodyText}>{memo.problemProduct}</Text>
          </View>
        )}

        {/* Traction & KPIs */}
        {memo.tractionKpis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traction & KPIs</Text>
            <Text style={styles.bodyText}>{memo.tractionKpis}</Text>
          </View>
        )}

        {/* Gaps Flagged */}
        {memo.gapsFlagged && memo.gapsFlagged.length > 0 && (
          <View style={styles.gapsContainer}>
            <Text style={styles.gapsTitle}>Gaps Flagged</Text>
            <View style={styles.bulletList}>
              {memo.gapsFlagged.map((gap, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={[styles.bulletDot, { color: '#EF4444' }]}>•</Text>
                  <Text style={[styles.bulletText, { color: '#EF4444' }]}>{gap}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
