import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontSize: 12,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    companyInfo: {
        textAlign: 'right',
    },
    section: {
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    label: {
        fontWeight: 'bold',
        width: 100,
    },
    value: {
        flex: 1,
    },
    table: {
        width: '100%',
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        alignItems: 'center',
        height: 30,
        paddingHorizontal: 8,
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        fontWeight: 'bold',
    },
    colDesc: { flex: 2 },
    colQty: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },

    footer: {
        marginTop: 30,
        textAlign: 'center',
        color: '#666',
        fontSize: 10,
    },
    totalSection: {
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    totalRow: {
        flexDirection: 'row',
        width: 200,
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    totalValue: {
        textAlign: 'right',
    }
});

interface InvoiceProps {
    order: any;
}

const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
};

export const InvoicePDF = ({ order }: InvoiceProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>INVOICE</Text>
                    <Text>#{order.order_number}</Text>
                </View>
                <View style={styles.companyInfo}>
                    <Text style={{ fontWeight: 'bold' }}>Root & Loom</Text>
                    <Text>123 Fashion Street</Text>
                    <Text>New Delhi, India 110001</Text>
                    <Text>GSTIN: 07AABCU9603R1Z2</Text>
                </View>
            </View>

            {/* Bill To / Ship To */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ width: '45%' }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Bill To:</Text>
                    <Text>{order.profiles?.full_name || 'Guest'}</Text>
                    <Text>{order.profiles?.email}</Text>
                    <Text>{order.profiles?.phone}</Text>
                </View>
                <View style={{ width: '45%' }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Ship To:</Text>
                    <Text>{order.shipping_address?.full_name}</Text>
                    <Text>{order.shipping_address?.address_line1}</Text>
                    <Text>{order.shipping_address?.address_line2}</Text>
                    <Text>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}</Text>
                    <Text>{order.shipping_address?.country}</Text>
                </View>
            </View>

            {/* Order Details */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Order Date:</Text>
                    <Text style={styles.value}>{new Date(order.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Payment Method:</Text>
                    <Text style={styles.value}>{order.payment_method?.toUpperCase() || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Status:</Text>
                    <Text style={styles.value}>{order.status?.toUpperCase()}</Text>
                </View>
            </View>

            {/* Items Table */}
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={styles.colDesc}>Item Description</Text>
                    <Text style={styles.colQty}>Qty</Text>
                    <Text style={styles.colPrice}>Price</Text>
                    <Text style={styles.colTotal}>Total</Text>
                </View>

                {order.order_items?.map((item: any) => (
                    <View style={styles.tableRow} key={item.id}>
                        <View style={styles.colDesc}>
                            <Text style={{ fontWeight: 'bold' }}>{item.product?.name}</Text>
                            <Text style={{ fontSize: 10, color: '#666' }}>
                                {item.variant?.size} / {item.variant?.color}
                            </Text>
                        </View>
                        <Text style={styles.colQty}>{item.quantity}</Text>
                        <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(item.price * item.quantity)}</Text>
                    </View>
                ))}
            </View>

            {/* Totals */}
            <View style={styles.totalSection}>
                <View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Shipping:</Text>
                        <Text style={styles.totalValue}>₹0.00</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tax (Included):</Text>
                        <Text style={styles.totalValue}>{formatCurrency(order.total * 0.18)}</Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopWidth: 1, borderColor: '#EEE', paddingTop: 5, marginTop: 5 }]}>
                        <Text style={[styles.totalLabel, { fontSize: 14 }]}>Total:</Text>
                        <Text style={[styles.totalValue, { fontSize: 14, fontWeight: 'bold' }]}>{formatCurrency(order.total)}</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Thank you for your business!</Text>
                <Text>For support, email support@rootandloom.com</Text>
            </View>
        </Page>
    </Document>
);
