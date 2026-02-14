import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Ruler } from "lucide-react"

export function SizeGuide() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    Size Guide
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Size Guide</DialogTitle>
                    <DialogDescription>
                        All measurements are in inches. Fits true to size.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                            <tr>
                                <th className="px-4 py-2">Size</th>
                                <th className="px-4 py-2">Chest</th>
                                <th className="px-4 py-2">Waist</th>
                                <th className="px-4 py-2">Length</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="px-4 py-2 font-medium">S</td>
                                <td className="px-4 py-2">36-38</td>
                                <td className="px-4 py-2">30-32</td>
                                <td className="px-4 py-2">27</td>
                            </tr>
                            <tr className="border-b">
                                <td className="px-4 py-2 font-medium">M</td>
                                <td className="px-4 py-2">38-40</td>
                                <td className="px-4 py-2">32-34</td>
                                <td className="px-4 py-2">28</td>
                            </tr>
                            <tr className="border-b">
                                <td className="px-4 py-2 font-medium">L</td>
                                <td className="px-4 py-2">40-42</td>
                                <td className="px-4 py-2">34-36</td>
                                <td className="px-4 py-2">29</td>
                            </tr>
                            <tr className="border-b">
                                <td className="px-4 py-2 font-medium">XL</td>
                                <td className="px-4 py-2">42-44</td>
                                <td className="px-4 py-2">36-38</td>
                                <td className="px-4 py-2">30</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                        * These are body measurements. Garment measurements may vary by style.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
