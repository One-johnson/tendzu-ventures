import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export interface ExportColumn {
  header: string;
  key: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 140,
    height: 56,
    objectFit: "contain",
  },
  title: {
    fontSize: 12,
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 16,
  },
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#eab308",
    minHeight: 28,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 24,
    alignItems: "center",
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    color: "#ffffff",
    fontWeight: "bold",
  },
});

interface ReportDocumentProps {
  title: string;
  columns: ExportColumn[];
  rows: Array<object>;
  generatedAt: string;
  logoUrl: string;
}

export function ReportDocument({
  title,
  columns,
  rows,
  generatedAt,
  logoUrl,
}: ReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.brandRow}>
          <Image src={logoUrl} style={styles.logo} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Generated: {generatedAt}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} wrap={false}>
            {columns.map((col) => (
              <Text key={col.key} style={styles.tableHeaderCell}>
                {col.header}
              </Text>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow} wrap={false}>
              {columns.map((col) => (
                <Text key={col.key} style={styles.tableCell}>
                  {String((row as Record<string, unknown>)[col.key] ?? "")}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
