import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
interface PdfExportProps {
    trip: ClientTrip;
}
export default function PdfExport({ trip }: PdfExportProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const downloadPdf = async () => {
        setIsExporting(true);
        try {
            const response = await fetch(`/api/trips/${trip.id}/export/pdf`);
            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${trip.title.replace(/[^a-z0-9]/gi, '_')}_itinerary.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({
                title: "PDF exported",
                description: "Your trip itinerary has been downloaded as a PDF.",
            });
        }
        catch (error) {
            console.error("Error exporting PDF:", error);
            toast({
                title: "Export failed",
                description: "Could not export PDF. Please try again.",
                variant: "destructive",
            });
        }
        finally {
            setIsExporting(false);
        }
    };
    return (<Button onClick={downloadPdf} disabled={isExporting} variant="outline" size="sm" className="w-full">
      <FileText className="h-4 w-4 mr-2"/>
      {isExporting ? "Generating PDF..." : "Export as PDF"}
    </Button>);
}
