'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerGrowthChartProps {
    data: { date: string; count: number }[];
}

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
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
                            contentStyle={{ borderRadius: '8px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.2}
                            name="New Customers"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
