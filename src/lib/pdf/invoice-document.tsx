import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { SaleRecord } from "@/types";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: {
    width: 140,
    height: 56,
    objectFit: "contain",
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    marginBottom: 8,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eab308",
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  totals: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  totalValue: {
    fontSize: 11,
    fontWeight: "bold",
    width: 100,
    textAlign: "right",
  },
  footer: {
    marginTop: 32,
    fontSize: 9,
    color: "#64748b",
  },
});

interface InvoiceDocumentProps {
  sale: SaleRecord;
  profit: number;
  generatedAt: string;
  logoUrl: string;
  companyName: string;
}

export function InvoiceDocument({
  sale,
  profit,
  generatedAt,
  logoUrl,
  companyName,
}: InvoiceDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.value}>{companyName}</Text>
          <Text style={styles.label}>Salesperson</Text>
          <Text style={styles.value}>{sale.salesperson}</Text>
          <Text style={styles.label}>Sale date</Text>
          <Text style={styles.value}>
            {new Date(sale.saleDate).toLocaleDateString("en-GH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Description</Text>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={styles.tableHeaderCell}>Unit Price</Text>
            <Text style={styles.tableHeaderCell}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>{sale.machineName}</Text>
            <Text style={styles.tableCell}>{sale.quantity}</Text>
            <Text style={styles.tableCell}>GHS {sale.unitPrice.toLocaleString()}</Text>
            <Text style={styles.tableCell}>GHS {sale.totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>GHS {sale.totalAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Profit (internal)</Text>
            <Text style={styles.totalValue}>GHS {profit.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>GHS {sale.totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Generated {generatedAt}</Text>
      </Page>
    </Document>
  );
}
