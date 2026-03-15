import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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
        paddingBottom: 20,
        alignItems: 'center'
    },
    logoContainer: {
        width: 140,
    },
    invoiceMeta: {
        textAlign: 'right',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        letterSpacing: 2,
    },
    metaText: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    companyInfo: {
        marginTop: 20,
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
    },
    companyName: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1c352d',
        marginBottom: 4,
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
        color: '#444',
    },
    value: {
        flex: 1,
        color: '#1A1A1A'
    },
    table: {
        width: '100%',
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 4,
        overflow: 'hidden'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    tableHeader: {
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold',
    },
    colDesc: { flex: 2 },
    colQty: { flex: 0.5, textAlign: 'center' },
    colPrice: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },

    footer: {
        marginTop: 40,
        textAlign: 'center',
        color: '#888',
        fontSize: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 20,
    },
    totalSection: {
        marginTop: 25,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    totalBox: {
        width: 250,
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        color: '#444',
        fontSize: 11,
    },
    totalValue: {
        textAlign: 'right',
        color: '#1A1A1A',
        fontSize: 11,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderColor: '#E5E7EB',
    },
    grandTotalLabel: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1c352d',
    },
    grandTotalValue: {
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1c352d',
    },
    discountLabel: {
        color: '#059669',
        fontSize: 11,
        fontWeight: 'bold',
    },
    discountValue: {
        textAlign: 'right',
        color: '#059669',
        fontSize: 11,
        fontWeight: 'bold',
    }
});

interface InvoiceProps {
    order: any;
}

const formatCurrency = (amount: number) => {
    return `INR ${amount.toFixed(2)}`;
};

export const InvoicePDF = ({ order }: InvoiceProps) => {

    const subtotal = order.order_items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;

    // Calculate total discounts (coupon + any other price adjustments)
    const discountAmount = order.total < subtotal ? (subtotal - order.total) : 0;
    const taxEstimate = order.total * 0.18; // 18% GST built into price
    const shipping = 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {/* Using a data URI for the logo to ensure PDF generation works without absolute URL fetching issues */}
                        <Image src="/images/logo.png" style={{ height: 40, width: 'auto' }} />
                    </View>
                    <View style={styles.invoiceMeta}>
                        <Text style={styles.title}>INVOICE</Text>
                        <Text style={styles.metaText}>Invoice #: {order.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.metaText}>Date: {new Date(order.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Company Info */}
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>Root & Loom</Text>
                    <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Shri Ram Folding Works, Shed 19, Narol</Text>
                    <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>Ahmedabad, Gujarat 382405</Text>
                    <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>GSTIN: 07AABCU9603R1Z2 | root@rootloom.in</Text>
                </View>

                {/* Bill To / Ship To */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
                    <View style={{ width: '45%' }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Billed To</Text>
                        <Text style={{ fontWeight: 'bold', marginBottom: 2, fontSize: 13 }}>{order.profiles?.full_name || 'Guest User'}</Text>
                        <Text style={{ fontSize: 11, color: '#444', marginBottom: 2 }}>{order.profiles?.email}</Text>
                        {order.profiles?.phone && <Text style={{ fontSize: 11, color: '#444' }}>{order.profiles.phone}</Text>}
                    </View>
                    <View style={{ width: '45%' }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Shipped To</Text>
                        <Text style={{ fontWeight: 'bold', marginBottom: 2, fontSize: 13 }}>{order.shipping_address?.full_name || order.profiles?.full_name}</Text>
                        <Text style={{ fontSize: 11, color: '#444', marginBottom: 2 }}>{order.shipping_address?.address_line1}</Text>
                        {order.shipping_address?.address_line2 && <Text style={{ fontSize: 11, color: '#444', marginBottom: 2 }}>{order.shipping_address.address_line2}</Text>}
                        <Text style={{ fontSize: 11, color: '#444' }}>
                            {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{order.shipping_address?.country}</Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.colDesc, { fontSize: 10, textTransform: 'uppercase', color: '#666' }]}>Item Description</Text>
                        <Text style={[styles.colQty, { fontSize: 10, textTransform: 'uppercase', color: '#666' }]}>Qty</Text>
                        <Text style={[styles.colPrice, { fontSize: 10, textTransform: 'uppercase', color: '#666' }]}>Unit Price</Text>
                        <Text style={[styles.colTotal, { fontSize: 10, textTransform: 'uppercase', color: '#666' }]}>Total</Text>
                    </View>

                    {order.order_items?.map((item: any) => (
                        <View style={styles.tableRow} key={item.id}>
                            <View style={styles.colDesc}>
                                <Text style={{ fontWeight: 'bold', color: '#1c352d', marginBottom: 2 }}>{item.product?.name || 'Item'}</Text>
                                <Text style={{ fontSize: 9, color: '#666' }}>
                                    Variant: {item.variant?.size} | {item.variant?.color}
                                </Text>
                            </View>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
                            <Text style={styles.colTotal}>{formatCurrency(item.price * item.quantity)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals Section */}
                <View style={styles.totalSection}>
                    <View style={styles.totalBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                        </View>

                        {discountAmount > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.discountLabel}>Savings & Discounts</Text>
                                <Text style={styles.discountValue}>-{formatCurrency(discountAmount)}</Text>
                            </View>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Shipping</Text>
                            <Text style={styles.totalValue}>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</Text>
                        </View>

                        <View style={styles.totalRow}>
                            <Text style={[styles.totalLabel, { color: '#888', fontSize: 10 }]}>Tax (Included 18% GST)</Text>
                            <Text style={[styles.totalValue, { color: '#888', fontSize: 10 }]}>{formatCurrency(taxEstimate)}</Text>
                        </View>

                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Total</Text>
                            <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={{ fontWeight: 'bold', color: '#1c352d', marginBottom: 4 }}>Thank you for your purchase.</Text>
                    <Text>If you have any questions about this invoice, please contact root@rootloom.in</Text>
                    <Text style={{ marginTop: 10, fontSize: 8 }}>This is a computer generated invoice and does not require a physical signature.</Text>
                </View>
            </Page>
        </Document>
    );
};
