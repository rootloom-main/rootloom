'use client';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AdminChartsProps {
    revenueData: { name: string; revenue: number }[];
    customerData: { name: string; customers: number }[];
}

export function AdminCharts({ revenueData, customerData }: AdminChartsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Revenue Overview</CardTitle>
                    <CardDescription className="text-2xl font-bold text-slate-900">
                        ₹{revenueData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString('en-IN')}
                        {/* <span className="text-sm font-normal text-green-600 ml-2 bg-green-50 px-2 py-0.5 rounded-full">+12.5%</span> */}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8c5a45" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8c5a45" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value / 1000}k`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                itemStyle={{ color: '#8c5a45', fontWeight: 'bold' }}
                                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#8c5a45"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">New Customers</CardTitle>
                    <CardDescription className="text-2xl font-bold text-slate-900">
                        {customerData.reduce((acc, curr) => acc + curr.customers, 0)}
                        {/* <span className="text-sm font-normal text-green-600 ml-2 bg-green-50 px-2 py-0.5 rounded-full">+8.2%</span> */}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={customerData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                cursor={{ fill: '#f5f5f5' }}
                            />
                            <Bar
                                dataKey="customers"
                                fill="#1e2f23"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
