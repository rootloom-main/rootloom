import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProductSpecsProps {
    category: string;
    description: string | null;
}

export function ProductSpecs({ category, description }: ProductSpecsProps) {
    // Generate mock specs based on category for now
    // In a real app, this would come from a JSONB column in the database
    const specs = [
        { label: "Material", value: "100% Organic Linen" },
        { label: "Fit", value: "Regular Fit" },
        { label: "Pattern", value: "Solid / Textured" },
        { label: "Wash Care", value: "Machine Wash Cold" },
        { label: "Origin", value: "Made in India" },
        { label: "Sustainable", value: "Yes, Eco-friendly dyes" },
    ];

    return (
        <div className="mt-12 border rounded-lg overflow-hidden">
            <div className="bg-stone-50 px-6 py-4 border-b">
                <h3 className="font-serif text-lg font-bold text-deep-forest">Product Specifications</h3>
            </div>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium text-stone-600 bg-stone-50/50 w-1/3">Category</TableCell>
                        <TableCell>{category}</TableCell>
                    </TableRow>
                    {specs.map((spec, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium text-stone-600 bg-stone-50/50">{spec.label}</TableCell>
                            <TableCell>{spec.value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
